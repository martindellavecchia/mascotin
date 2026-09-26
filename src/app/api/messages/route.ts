import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  buildMessagePage,
  clampMessageLimit,
  parseMessageCursor,
} from '@/lib/messages';
import { createNotification } from '@/lib/notifications';

async function markConversationRead(matchId: string, userId: string): Promise<number> {
  try {
    const [messages] = await Promise.all([
      db.message.updateMany({
        where: { matchId, receiverId: userId, read: false },
        data: { read: true },
      }),
      db.notification.updateMany({
        where: { userId, read: false, link: `/messages?matchId=${matchId}` },
        data: { read: true },
      }),
    ]);
    return messages.count;
  } catch (error) {
    console.error('mark_messages_read', error);
    return 0;
  }
}

// GET - Retrieve messages for a match
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const rawAfter = searchParams.get('after');
    const rawBefore = searchParams.get('before');
    const after = parseMessageCursor(rawAfter);
    const before = parseMessageCursor(rawBefore);
    const limit = clampMessageLimit(searchParams.get('limit'));

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: 'Falta indicar la conversación' },
        { status: 400 }
      );
    }

    if ((rawAfter && !after) || (rawBefore && !before) || (after && before)) {
      return NextResponse.json(
        { success: false, error: 'El cursor de mensajes no es válido' },
        { status: 400 }
      );
    }

    const match = await db.match.findUnique({
      where: { id: matchId },
      include: {
        pet1: { select: { owner: { select: { userId: true } } } },
        pet2: { select: { owner: { select: { userId: true } } } },
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    const petOwnerIds = [
      match.pet1?.owner?.userId,
      match.pet2?.owner?.userId,
    ].filter((id): id is string => Boolean(id));
    const legacyUserIds = [match.user1Id, match.user2Id].filter(Boolean);
    const allowedUserIds = new Set([...petOwnerIds, ...legacyUserIds]);

    if (!allowedUserIds.has(userId)) {
      return NextResponse.json(
        { success: false, error: 'No tenés acceso a esta conversación' },
        { status: 403 }
      );
    }

    const createdAt = after ? { gt: after } : before ? { lt: before } : undefined;
    const messages = await db.message.findMany({
      where: {
        matchId,
        ...(createdAt ? { createdAt } : {}),
      },
      orderBy: {
        createdAt: after ? 'asc' : 'desc'
      },
      take: after ? limit : limit + 1,
    });

    const page = buildMessagePage(messages, {
      limit,
      incremental: Boolean(after),
    });

    const shouldMarkRead = !before && (!after || messages.length > 0);
    const [markedRead, lastSeen] = await Promise.all([
      shouldMarkRead ? markConversationRead(matchId, userId) : Promise.resolve(0),
      db.message.findFirst({
        where: { matchId, senderId: userId, read: true },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      ...page,
      markedRead,
      lastSeenAt: lastSeen?.createdAt ? new Date(lastSeen.createdAt).toISOString() : null,
    });
  } catch (error) {
    console.error('get_messages', error);
    return NextResponse.json(
      { success: false, error: 'No pudimos cargar los mensajes' },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const matchId: unknown = body?.matchId;
    const content: unknown = body?.content;

    if (typeof matchId !== 'string' || !matchId || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Escribí un mensaje antes de enviarlo' },
        { status: 400 }
      );
    }

    const match = await db.match.findUnique({
      where: { id: matchId },
      include: {
        pet1: { select: { owner: { select: { userId: true } } } },
        pet2: { select: { owner: { select: { userId: true } } } },
      },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: 'Conversación no encontrada' },
        { status: 404 }
      );
    }

    const petOwnerIds = [
      match.pet1?.owner?.userId,
      match.pet2?.owner?.userId,
    ].filter((id): id is string => Boolean(id));
    const legacyUserIds = [match.user1Id, match.user2Id].filter(Boolean);
    const participantIds = (petOwnerIds.length > 0 ? petOwnerIds : legacyUserIds)
      .filter((id): id is string => Boolean(id));

    if (!participantIds.includes(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'No podés enviar mensajes en esta conversación' },
        { status: 403 }
      );
    }

    const receiverId = participantIds.find(id => id !== session.user.id);
    if (!receiverId) {
      return NextResponse.json(
        { success: false, error: 'No pudimos identificar a quién enviarle el mensaje' },
        { status: 400 }
      );
    }

    const message = await db.message.create({
      data: {
        matchId,
        senderId: session.user.id,
        receiverId,
        content: content.trim()
      },
    });

    createNotification({
      userId: receiverId,
      actorId: session.user.id,
      type: 'MESSAGE',
      title: 'Nuevo mensaje',
      body: `${session.user.name || 'Alguien'} te envió un mensaje`,
      link: `/messages?matchId=${matchId}`,
      entityId: message.id,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('send_message', error);
    return NextResponse.json(
      { success: false, error: 'No pudimos enviar el mensaje. Reintentá.' },
      { status: 500 }
    );
  }
}
