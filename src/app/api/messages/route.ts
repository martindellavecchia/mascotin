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

// GET - Retrieve messages for a match
export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const rawAfter = searchParams.get('after');
    const after = parseMessageCursor(rawAfter);
    const limit = clampMessageLimit(searchParams.get('limit'));

    if (!matchId) {
      return NextResponse.json(
        {
          success: false,
          error: 'matchId is required'
        },
        { status: 400 }
      );
    }

    if (rawAfter && !after) {
      return NextResponse.json(
        {
          success: false,
          error: 'after must be a valid ISO date'
        },
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
        { success: false, error: 'Match not found' },
        { status: 404 }
      );
    }

    const petOwnerIds = [
      match.pet1?.owner?.userId,
      match.pet2?.owner?.userId,
    ].filter((id): id is string => Boolean(id));
    const legacyUserIds = [match.user1Id, match.user2Id].filter(Boolean);
    const allowedUserIds = new Set([...petOwnerIds, ...legacyUserIds]);

    if (!allowedUserIds.has(session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view these messages' },
        { status: 403 }
      );
    }

    const messages = await db.message.findMany({
      where: {
        matchId,
        ...(after ? { createdAt: { gt: after } } : {}),
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

    return NextResponse.json({
      success: true,
      ...page
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch messages'
      },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { matchId, content } = body;

    if (!matchId || !content || !content.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields'
        },
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
        { success: false, error: 'Match not found' },
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
        { success: false, error: 'Not authorized to send messages for this match' },
        { status: 403 }
      );
    }

    const receiverId = participantIds.find(id => id !== session.user.id);
    if (!receiverId) {
      return NextResponse.json(
        { success: false, error: 'Unable to resolve message recipient' },
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
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send message'
      },
      { status: 500 }
    );
  }
}
