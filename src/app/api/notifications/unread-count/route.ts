import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Lightweight unread notification count (used for polling)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const count = await db.notification.count({
      where: { userId: session.user.id, read: false },
    });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener conteo' },
      { status: 500 }
    );
  }
}
