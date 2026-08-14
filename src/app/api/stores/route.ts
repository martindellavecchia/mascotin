import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getStoreTrustSummary, getWeightedStoreScore } from '@/lib/store-reputation';
import { parseStoreImages } from '@/lib/stores';
import { haversineKm, toGeoPoint } from '@/lib/geo';
import { isFeaturedStore } from '@/lib/places';
import { parseJsonStringArray } from '@/lib/json-array';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const categoryId = searchParams.get('categoryId');
    const minRating = Number(searchParams.get('minRating') || 0);
    const sortBy = searchParams.get('sortBy') || 'recommended';
    const near = searchParams.get('near');
    const radius = Number(searchParams.get('radius') || 25);

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
        promotions: {
          where: {
            startsAt: { lte: new Date() },
            endsAt: { gte: new Date() },
          },
          select: { title: true, body: true },
          take: 1,
        },
      },
      take: 100,
    });

    const origin = near
      ? toGeoPoint(Number(near.split(',')[0]), Number(near.split(',')[1]))
      : null;

    const formatted = stores.map((store) => {
      const point = toGeoPoint(store.latitude, store.longitude);
      return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      address: store.address,
      image: store.image,
      images: parseStoreImages(store.images),
      latitude: store.latitude,
      longitude: store.longitude,
      tags: parseJsonStringArray(store.tags),
      plan: store.plan,
      featured: isFeaturedStore(store.plan, store.featuredUntil),
      distanceKm: origin && point ? Math.round(haversineKm(origin, point) * 10) / 10 : null,
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
      promotions: store.promotions,
    };
    }).filter((store) => {
      if (!origin || store.distanceKm === null) return true;
      return store.distanceKm <= radius;
    });

    formatted.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (sortBy === 'rating') return b.ratingAverage - a.ratingAverage || b.reviewCount - a.reviewCount;
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount || b.ratingAverage - a.ratingAverage;
      if (sortBy === 'distance' && a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
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
