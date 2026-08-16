import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { buildMessagePage, clampMessageLimit, parseMessageCursor } from '@/lib/messages';
import { createNotification } from '@/lib/notifications';
import { fosterMessageSchema } from '@/lib/schemas';

async function getParticipantPlacement(id: string, userId: string) {
  const placement = await db.fosterPlacement.findUnique({
    where: { id },
    include: { rescueCase: true, fosterProfile: true },
  });
  if (!placement) return { placement: null, authorized: false };
  const authorized =
    placement.rescueCase.createdByUserId === userId || placement.fosterProfile.userId === userId;
  return { placement, authorized };
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { placement, authorized } = await getParticipantPlacement(id, auth.session.user.id);
  if (!placement) {
    return NextResponse.json({ success: false, error: 'Conversación no encontrada' }, { status: 404 });
  }
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawAfter = searchParams.get('after');
  const after = parseMessageCursor(rawAfter);
  if (rawAfter && !after) {
    return NextResponse.json({ success: false, error: 'Cursor inválido' }, { status: 400 });
  }
  const limit = clampMessageLimit(searchParams.get('limit'));
  const messages = await db.message.findMany({
    where: {
      fosterPlacementId: placement.id,
      ...(after ? { createdAt: { gt: after } } : {}),
    },
    orderBy: { createdAt: after ? 'asc' : 'desc' },
    take: after ? limit : limit + 1,
  });

  await db.message.updateMany({
    where: {
      fosterPlacementId: placement.id,
      receiverId: auth.session.user.id,
      read: false,
    },
    data: { read: true },
  });

  return NextResponse.json({ success: true, ...buildMessagePage(messages, { limit, incremental: Boolean(after) }) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  const { placement, authorized } = await getParticipantPlacement(id, auth.session.user.id);
  if (!placement) {
    return NextResponse.json({ success: false, error: 'Conversación no encontrada' }, { status: 404 });
  }
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }
  if (!['COORDINATING', 'ACTIVE'].includes(placement.status)) {
    return NextResponse.json({ success: false, error: 'La conversación está cerrada' }, { status: 409 });
  }

  const parsed = fosterMessageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Mensaje inválido' }, { status: 400 });
  }
  const receiverId = placement.rescueCase.createdByUserId === auth.session.user.id
    ? placement.fosterProfile.userId
    : placement.rescueCase.createdByUserId;
  const message = await db.message.create({
    data: {
      fosterPlacementId: placement.id,
      senderId: auth.session.user.id,
      receiverId,
      content: parsed.data.content,
    },
  });

  await createNotification({
    userId: receiverId,
    actorId: auth.session.user.id,
    type: 'MESSAGE',
    title: 'Nuevo mensaje sobre un tránsito',
    body: `${auth.session.user.name || 'Alguien'} te envió un mensaje`,
    link: `/help/cases/${placement.rescueCaseId}`,
    entityId: message.id,
  });

  return NextResponse.json({ success: true, message }, { status: 201 });
}
