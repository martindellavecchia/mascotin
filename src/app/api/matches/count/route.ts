import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const userId = auth.session.user.id;
    const count = await db.match.count({
      where: {
        OR: [
          { pet1: { owner: { userId } } },
          { pet2: { owner: { userId } } },
        ],
      },
    });

    return NextResponse.json({ success: true, count }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Error loading match count:', error);
    return NextResponse.json({ success: false, error: 'No pudimos cargar tus encuentros' }, { status: 500 });
  }
}
