import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getStoreTrustSummary, getWeightedStoreScore } from '@/lib/store-reputation';
import { parseStoreImages } from '@/lib/stores';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const categoryId = searchParams.get('categoryId');
    const minRating = Number(searchParams.get('minRating') || 0);
    const sortBy = searchParams.get('sortBy') || 'recommended';

    const where: Prisma.StoreWhereInput = {
      isActive: true,
      ...(categoryId && categoryId !== '_all' ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { category: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(minRating > 0 ? { ratingAverage: { gte: minRating } } : {}),
    };

    const stores = await db.store.findMany({
      where,
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
          select: { id: true, name: true, price: true, duration: true },
          orderBy: { price: 'asc' },
          take: 3,
        },
      },
      take: 100,
    });

    const formatted = stores.map((store) => ({
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
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
      weightedScore: getWeightedStoreScore(store.ratingAverage, store.reviewCount),
      services: store.bookingServices,
    }));

    formatted.sort((a, b) => {
      if (sortBy === 'rating') return b.ratingAverage - a.ratingAverage || b.reviewCount - a.reviewCount;
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount || b.ratingAverage - a.ratingAverage;
      return b.weightedScore - a.weightedScore || b.reviewCount - a.reviewCount;
    });

    return NextResponse.json({ success: true, stores: formatted });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudieron obtener los negocios' },
      { status: 500 }
    );
  }
}
