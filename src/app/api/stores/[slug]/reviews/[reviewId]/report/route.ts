import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { reviewReportSchema } from '@/lib/schemas';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; reviewId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const limit = await rateLimit(`review-report:${auth.session.user.id}`, RATE_LIMITS.reviewReport);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Alcanzaste el límite temporal de reportes' },
      { status: 429 }
    );
  }

  try {
    const [{ slug, reviewId }, body] = await Promise.all([params, request.json()]);
    const parsed = reviewReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Elegí un motivo válido', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const review = await db.storeReview.findFirst({
      where: { id: reviewId, store: { OR: [{ id: slug }, { slug }] } },
      select: { id: true, authorId: true },
    });
    if (!review) {
      return NextResponse.json({ success: false, error: 'Reseña no encontrada' }, { status: 404 });
    }
    if (review.authorId === auth.session.user.id) {
      return NextResponse.json({ success: false, error: 'No podés reportar tu propia reseña' }, { status: 403 });
    }
    const report = await db.reviewReport.upsert({
      where: { reviewId_reporterId: { reviewId, reporterId: auth.session.user.id } },
      update: { ...parsed.data, status: 'PENDING' },
      create: { reviewId, reporterId: auth.session.user.id, ...parsed.data },
    });
    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    console.error('Error reporting review:', error);
    return NextResponse.json({ success: false, error: 'No se pudo enviar el reporte' }, { status: 500 });
  }
}
