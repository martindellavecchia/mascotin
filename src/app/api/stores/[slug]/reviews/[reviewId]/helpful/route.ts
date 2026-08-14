import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; reviewId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const limit = await rateLimit(`review-helpful:${auth.session.user.id}`, RATE_LIMITS.review);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Demasiados intentos' }, { status: 429 });
  }

  try {
    const { slug, reviewId } = await params;
    const review = await db.storeReview.findFirst({
      where: { id: reviewId, status: 'PUBLISHED', store: { OR: [{ id: slug }, { slug }], isActive: true } },
      select: { id: true },
    });
    if (!review) {
      return NextResponse.json({ success: false, error: 'Reseña no encontrada' }, { status: 404 });
    }

    const key = { reviewId_userId: { reviewId, userId: auth.session.user.id } };
    const existing = await db.reviewHelpful.findUnique({ where: key });
    if (existing) {
      await db.reviewHelpful.delete({ where: key });
    } else {
      await db.reviewHelpful.create({ data: { reviewId, userId: auth.session.user.id } });
    }
    const helpfulCount = await db.reviewHelpful.count({ where: { reviewId } });
    return NextResponse.json({ success: true, isHelpful: !existing, helpfulCount });
  } catch (error) {
    console.error('Error toggling helpful review:', error);
    return NextResponse.json({ success: false, error: 'No se pudo registrar el voto' }, { status: 500 });
  }
}
