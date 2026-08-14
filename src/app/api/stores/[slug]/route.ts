import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getStoreTrustSummary } from '@/lib/store-reputation';
import { parseStoreImages } from '@/lib/stores';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const [{ slug }, session] = await Promise.all([params, getServerSession(authOptions)]);
    const userId = session?.user?.id;
    const store = await db.store.findFirst({
      where: { slug, isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        provider: {
          select: {
            id: true,
            name: true,
            image: true,
            owner: { select: { image: true } },
          },
        },
        bookingServices: {
          include: { provider: { select: { businessName: true, location: true } } },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          where: { status: 'PUBLISHED' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                owner: { select: { image: true } },
                stores: {
                  where: { isActive: true },
                  select: { id: true },
                  take: 1,
                },
              },
            },
            helpfulVotes: { select: { userId: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    const isOwner = Boolean(userId && store.providerId === userId);
    const [completedAppointment, userReview] = userId
      ? await Promise.all([
          db.appointment.findFirst({
            where: {
              userId,
              status: 'COMPLETED',
              service: { storeId: store.id },
            },
            select: { id: true },
            orderBy: { date: 'desc' },
          }),
          db.storeReview.findUnique({
            where: { storeId_authorId: { storeId: store.id, authorId: userId } },
            select: { id: true, rating: true, comment: true, appointmentId: true },
          }),
        ])
      : [null, null];

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        phone: store.phone,
        email: store.email,
        address: store.address,
        image: store.image,
        images: parseStoreImages(store.images),
        category: store.category,
        owner: store.provider
          ? {
              id: store.provider.id,
              name: store.provider.name,
              image: store.provider.image || store.provider.owner?.image || null,
            }
          : null,
        ratingAverage: store.ratingAverage,
        reviewCount: store.reviewCount,
        trust: getStoreTrustSummary(store.ratingAverage, store.reviewCount),
        services: store.bookingServices,
        reviews: store.reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          businessReply: review.businessReply,
          businessReplyAt: review.businessReplyAt,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          author: {
            id: review.author.id,
            name: review.author.name,
            image: review.author.image || review.author.owner?.image || null,
            isBusinessOwner: review.author.stores.length > 0,
          },
          helpfulCount: review.helpfulVotes.length,
          isHelpful: Boolean(userId && review.helpfulVotes.some((vote) => vote.userId === userId)),
          isMine: review.authorId === userId,
        })),
      },
      viewer: {
        isOwner,
        isAuthenticated: Boolean(userId),
        canReview: Boolean(userId && !isOwner && completedAppointment),
        hasCompletedAppointment: Boolean(completedAppointment),
        reviewAppointmentId: userReview?.appointmentId || completedAppointment?.id || null,
        userReview,
      },
    });
  } catch (error) {
    console.error('Error fetching store detail:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo obtener el negocio' },
      { status: 500 }
    );
  }
}
