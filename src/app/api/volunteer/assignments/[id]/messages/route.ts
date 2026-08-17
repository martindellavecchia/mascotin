import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { buildMessagePage, clampMessageLimit, parseMessageCursor } from '@/lib/messages';
import { createNotification } from '@/lib/notifications';
import { fosterMessageSchema } from '@/lib/schemas';

async function getParticipantAssignment(id: string, userId: string) {
  const assignment = await db.volunteerAssignment.findUnique({
    where: { id },
    include: { volunteerProfile: true, need: { include: { rescueCase: true } } },
  });
  if (!assignment) return { assignment: null, authorized: false };
  const authorized = assignment.volunteerProfile.userId === userId
    || assignment.need.rescueCase.createdByUserId === userId;
  return { assignment, authorized };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { assignment, authorized } = await getParticipantAssignment((await params).id, auth.session.user.id);
  if (!assignment) return NextResponse.json({ success: false, error: 'Conversación no encontrada' }, { status: 404 });
  if (!authorized) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const rawAfter = searchParams.get('after');
  const after = parseMessageCursor(rawAfter);
  if (rawAfter && !after) return NextResponse.json({ success: false, error: 'Cursor inválido' }, { status: 400 });
  const limit = clampMessageLimit(searchParams.get('limit'));
  const messages = await db.message.findMany({
    where: { volunteerAssignmentId: assignment.id, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: after ? 'asc' : 'desc' },
    take: after ? limit : limit + 1,
  });
  await db.message.updateMany({
    where: { volunteerAssignmentId: assignment.id, receiverId: auth.session.user.id, read: false },
    data: { read: true },
  });
  return NextResponse.json({ success: true, ...buildMessagePage(messages, { limit, incremental: Boolean(after) }) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { assignment, authorized } = await getParticipantAssignment((await params).id, auth.session.user.id);
  if (!assignment) return NextResponse.json({ success: false, error: 'Conversación no encontrada' }, { status: 404 });
  if (!authorized) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  if (assignment.status !== 'ACTIVE') return NextResponse.json({ success: false, error: 'La conversación está cerrada' }, { status: 409 });
  const parsed = fosterMessageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Mensaje inválido' }, { status: 400 });
  const receiverId = assignment.need.rescueCase.createdByUserId === auth.session.user.id
    ? assignment.volunteerProfile.userId
    : assignment.need.rescueCase.createdByUserId;
  const message = await db.message.create({
    data: {
      volunteerAssignmentId: assignment.id,
      senderId: auth.session.user.id,
      receiverId,
      content: parsed.data.content,
    },
  });
  await createNotification({
    userId: receiverId,
    actorId: auth.session.user.id,
    type: 'MESSAGE',
    title: 'Nuevo mensaje de voluntariado',
    body: `${auth.session.user.name || 'Alguien'} te envió un mensaje`,
    link: `/hogares-de-transito/casos/${assignment.need.rescueCaseId}`,
    entityId: message.id,
    dedupeKey: `volunteer-message:${message.id}`,
  });
  return NextResponse.json({ success: true, message }, { status: 201 });
}
