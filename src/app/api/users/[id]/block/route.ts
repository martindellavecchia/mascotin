import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';

// POST - Block a user
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const session = auth.session;

    const { id: blockedId } = await params;

    if (blockedId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No puedes bloquearte a ti mismo' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check if already blocked
    const existing = await db.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Este usuario ya está bloqueado' },
        { status: 409 }
      );
    }

    await db.blockedUser.create({
      data: {
        blockerId: session.user.id,
        blockedId,
      },
    });

    return NextResponse.json({ success: true, message: 'Usuario bloqueado' });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json(
      { success: false, error: 'Error al bloquear usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Unblock a user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const session = auth.session;

    const { id: blockedId } = await params;

    const existing = await db.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Este usuario no está bloqueado' },
        { status: 404 }
      );
    }

    await db.blockedUser.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true, message: 'Usuario desbloqueado' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json(
      { success: false, error: 'Error al desbloquear usuario' },
      { status: 500 }
    );
  }
}

// GET - Check if a user is blocked
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const session = auth.session;

    const { id: targetId } = await params;

    const blocked = await db.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: targetId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      isBlocked: !!blocked,
    });
  } catch (error) {
    console.error('Error checking block status:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar bloqueo' },
      { status: 500 }
    );
  }
}
