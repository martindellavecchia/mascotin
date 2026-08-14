import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { businessReplySchema, storeReviewSchema } from '@/lib/schemas';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { recalculateStoreRating } from '@/lib/stores';

interface ReviewParams {
  slug: string;
  reviewId: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<ReviewParams> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const limit = await rateLimit(`store-review-edit:${auth.session.user.id}`, RATE_LIMITS.review);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Demasiados intentos' }, { status: 429 });
  }

  try {
    const [{ slug, reviewId }, body] = await Promise.all([params, request.json()]);
    const review = await db.storeReview.findFirst({
      where: { id: reviewId, store: { OR: [{ id: slug }, { slug }] } },
      include: { store: { select: { id: true, providerId: true } } },
    });
    if (!review) {
      return NextResponse.json({ success: false, error: 'Reseña no encontrada' }, { status: 404 });
    }

    if (review.store.providerId === auth.session.user.id && 'businessReply' in body) {
      const parsed = businessReplySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Revisá la respuesta', details: parsed.error.issues },
          { status: 400 }
        );
      }
      const updated = await db.storeReview.update({
        where: { id: review.id },
        data: { businessReply: parsed.data.businessReply, businessReplyAt: new Date() },
      });
      return NextResponse.json({ success: true, review: updated });
    }

    if (review.authorId !== auth.session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No tenés permiso para editar esta reseña' },
        { status: 403 }
      );
    }

    const parsed = storeReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Revisá la calificación y el comentario', details: parsed.error.issues },
        { status: 400 }
      );
    }
    const updated = await db.$transaction(async (tx) => {
      const saved = await tx.storeReview.update({
        where: { id: review.id },
        data: {
          rating: parsed.data.rating,
          comment: parsed.data.comment || null,
          status: 'PUBLISHED',
        },
      });
      await recalculateStoreRating(tx, review.store.id);
      return saved;
    });
    return NextResponse.json({ success: true, review: updated });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ success: false, error: 'No se pudo actualizar la reseña' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<ReviewParams> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { slug, reviewId } = await params;
    const review = await db.storeReview.findFirst({
      where: { id: reviewId, authorId: auth.session.user.id, store: { OR: [{ id: slug }, { slug }] } },
      select: { id: true, storeId: true },
    });
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Reseña no encontrada o no te pertenece' },
        { status: 404 }
      );
    }
    await db.$transaction(async (tx) => {
      await tx.storeReview.delete({ where: { id: review.id } });
      await recalculateStoreRating(tx, review.storeId);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ success: false, error: 'No se pudo eliminar la reseña' }, { status: 500 });
  }
}
