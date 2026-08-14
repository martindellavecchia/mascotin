import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export async function GET(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const reviews = await db.storeReview.findMany({
      where: {
        ...(status === 'reported' ? { reports: { some: { status: 'PENDING' } } } : {}),
        ...(status === 'hidden' ? { status: 'HIDDEN' } : {}),
      },
      include: {
        store: { select: { id: true, name: true, slug: true, ratingAverage: true, reviewCount: true } },
        author: { select: { id: true, name: true, email: true } },
        reports: {
          include: { reporter: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { helpfulVotes: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching review moderation queue:', error);
    return NextResponse.json({ success: false, error: 'No se pudo obtener la moderación' }, { status: 500 });
  }
}
