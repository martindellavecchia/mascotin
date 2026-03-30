import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - List notifications for current user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20') || 20, 1), 50);
    const cursor = searchParams.get('cursor');

    const notifications = await db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        actor: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const unreadCount = await db.notification.count({
      where: { userId: session.user.id, read: false },
    });

    return NextResponse.json({
      success: true,
      notifications: items,
      unreadCount,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener notificaciones' },
      { status: 500 }
    );
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, all } = body;

    if (all) {
      const result = await db.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const result = await db.notification.updateMany({
        where: {
          id: { in: ids },
          userId: session.user.id,
        },
        data: { read: true },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    return NextResponse.json(
      { success: false, error: 'Se requiere "ids" o "all"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar notificaciones' },
      { status: 500 }
    );
  }
}
