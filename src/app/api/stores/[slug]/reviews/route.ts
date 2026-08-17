import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { storeReviewSchema } from '@/lib/schemas';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { recalculateStoreRating } from '@/lib/stores';
import { createNotification } from '@/lib/notifications';
import { isPlaceReviewCategory } from '@/lib/places';
import { invalidatePublicStoreCache } from '@/lib/server/stores';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const limit = await rateLimit(`store-review:${auth.session.user.id}`, RATE_LIMITS.review);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
      { status: 429 }
    );
  }

  try {
    const [{ slug }, body] = await Promise.all([params, request.json()]);
    const parsed = storeReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Revisá la calificación y el comentario', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const store = await db.store.findFirst({
      where: { OR: [{ id: slug }, { slug }], isActive: true },
      select: { id: true, slug: true, name: true, providerId: true, category: { select: { name: true } } },
    });
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }
    if (store.providerId === auth.session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No podés calificar tu propio negocio' },
        { status: 403 }
      );
    }

    const existing = await db.storeReview.findUnique({
      where: {
        storeId_authorId: { storeId: store.id, authorId: auth.session.user.id },
      },
      select: { id: true, appointmentId: true },
    });
    const allowWithoutAppointment = isPlaceReviewCategory(store.category.name);
    const completedAppointment = existing
      ? { id: existing.appointmentId }
      : await db.appointment.findFirst({
          where: {
            userId: auth.session.user.id,
            status: 'COMPLETED',
            service: { storeId: store.id },
          },
          select: { id: true },
          orderBy: { date: 'desc' },
        });
    if (!completedAppointment && !allowWithoutAppointment) {
      return NextResponse.json(
        { success: false, error: 'Sólo podés reseñar después de completar una cita con este negocio' },
        { status: 403 }
      );
    }

    const review = await db.$transaction(async (tx) => {
      const saved = await tx.storeReview.upsert({
        where: {
          storeId_authorId: { storeId: store.id, authorId: auth.session.user.id },
        },
        update: {
          rating: parsed.data.rating,
          comment: parsed.data.comment || null,
          status: 'PUBLISHED',
        },
        create: {
          storeId: store.id,
          authorId: auth.session.user.id,
          appointmentId: completedAppointment?.id || null,
          rating: parsed.data.rating,
          comment: parsed.data.comment || null,
        },
      });
      const rating = await recalculateStoreRating(tx, store.id);
      return { ...saved, storeRating: rating };
    });

    if (store.providerId) {
      createNotification({
        userId: store.providerId,
        actorId: auth.session.user.id,
        type: 'COMMENT',
        title: existing ? 'Reseña actualizada' : 'Nueva reseña del negocio',
        body: `${auth.session.user.name || 'Un cliente'} calificó ${store.name} con ${parsed.data.rating} estrellas`,
        link: `/shop/${store.slug}`,
        entityId: review.id,
      }).catch(console.error);
    }
    await invalidatePublicStoreCache(store);

    return NextResponse.json({ success: true, review }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Error saving store review:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo guardar la reseña' },
      { status: 500 }
    );
  }
}
