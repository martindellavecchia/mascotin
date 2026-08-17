import { unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { parseJsonStringArray } from '@/lib/json-array';
import { haversineKm, toGeoPoint } from '@/lib/geo';
import { isFeaturedStore } from '@/lib/places';
import { getStoreTrustSummary, getWeightedStoreScore, withStoreTrustPresentation } from '@/lib/store-reputation';
import { parseStoreImages } from '@/lib/stores';
import { invalidateStoreDirectoryCache, STORE_CACHE_TAGS } from '@/lib/server/store-cache';

export interface StoreDirectoryFilters {
  search?: string;
  categoryId?: string;
  minRating?: number;
  sortBy?: string;
  near?: string;
  radius?: number;
}

export interface PublicStoreCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  image: string | null;
  category: { id: string; name: string };
  ratingAverage: number;
  reviewCount: number;
  trust: ReturnType<typeof withStoreTrustPresentation>;
  services: Array<{ id: string; name: string; price: number; duration: number }>;
}

export type StoreReviewEligibility =
  | 'unauthenticated'
  | 'eligible'
  | 'already-reviewed'
  | 'no-completed-appointment';

export interface StoreViewerState {
  isAuthenticated: boolean;
  isOwner: boolean;
  reviewEligibility: StoreReviewEligibility;
  ownReviewId: string | null;
  ownReview: { id: string; rating: number; comment: string | null } | null;
  helpfulReviewIds: string[];
}

export function hasHighCardinalityStoreFilters(filters: StoreDirectoryFilters) {
  return Boolean(
    filters.search?.trim()
    || (filters.categoryId && filters.categoryId !== '_all')
    || (filters.minRating && filters.minRating > 0)
    || (filters.sortBy && filters.sortBy !== 'recommended')
    || filters.near
  );
}

export async function getActiveStoreCategories() {
  return db.storeCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  });
}

export const getCachedActiveStoreCategories = unstable_cache(
  getActiveStoreCategories,
  ['store-categories'],
  { revalidate: 3600, tags: [STORE_CACHE_TAGS.categories] }
);

export async function getPublicStoreDirectory(filters: StoreDirectoryFilters = {}) {
  const search = filters.search?.trim();
  const categoryId = filters.categoryId;
  const minRating = Number(filters.minRating || 0);
  const sortBy = filters.sortBy || 'recommended';
  const near = filters.near;
  const radius = Number(filters.radius || 25);

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
      trust: withStoreTrustPresentation(getStoreTrustSummary(store.ratingAverage, store.reviewCount)),
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

  return formatted;
}

export const getCachedPublicStoreDirectory = unstable_cache(
  () => getPublicStoreDirectory({}),
  ['store-directory-initial'],
  { revalidate: 300, tags: [STORE_CACHE_TAGS.directory] }
);

function mapPublicStore(store: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  image: string | null;
  images: string | null;
    tags: string | null;
    providerId: string | null;
  ratingAverage: number;
  reviewCount: number;
  category: { id: string; name: string };
  provider: {
    id: string;
    name: string | null;
    image: string | null;
    owner: { image: string | null } | null;
  } | null;
  bookingServices: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    businessReply: string | null;
    businessReplyAt: Date | null;
    createdAt: Date;
    authorId: string;
    author: {
      id: string;
      name: string | null;
      image: string | null;
      owner: { image: string | null } | null;
      stores: Array<{ id: string }>;
    };
    helpfulVotes: Array<{ userId: string }>;
  }>;
}) {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    phone: store.phone,
    email: store.email,
    address: store.address,
    image: store.image,
    images: parseStoreImages(store.images),
    tags: parseJsonStringArray(store.tags),
    providerId: store.providerId,
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
    trust: withStoreTrustPresentation(getStoreTrustSummary(store.ratingAverage, store.reviewCount)),
    services: store.bookingServices,
    reviews: store.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      businessReply: review.businessReply,
      businessReplyAt: review.businessReplyAt,
      createdAt: review.createdAt,
      author: {
        id: review.author.id,
        name: review.author.name,
        image: review.author.image || review.author.owner?.image || null,
        isBusinessOwner: review.author.stores.length > 0,
      },
      helpfulCount: review.helpfulVotes.length,
    })),
  };
}

const storeDetailInclude = {
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
    select: { id: true, name: true, description: true, price: true, duration: true },
    orderBy: { createdAt: 'desc' as const },
  },
  reviews: {
    where: { status: 'PUBLISHED' as const },
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
    orderBy: { createdAt: 'desc' as const },
  },
};

export async function getPublicStoreBySlug(slug: string) {
  const store = await db.store.findFirst({
    where: { slug, isActive: true },
    include: storeDetailInclude,
  });

  if (!store) return null;
  return mapPublicStore(store);
}

export function getCachedPublicStoreBySlug(slug: string) {
  return unstable_cache(
    () => getPublicStoreBySlug(slug),
    ['public-store', slug],
    { revalidate: 300, tags: [STORE_CACHE_TAGS.directory, STORE_CACHE_TAGS.store(slug)] }
  )();
}

export function anonymousStoreViewer(): StoreViewerState {
  return {
    isAuthenticated: false,
    isOwner: false,
    reviewEligibility: 'unauthenticated',
    ownReviewId: null,
    ownReview: null,
    helpfulReviewIds: [],
  };
}

export async function invalidatePublicStoreCache(store: { id?: string | null; slug?: string | null }) {
  let slug = store.slug || undefined;
  if (!slug && store.id) {
    const found = await db.store.findUnique({
      where: { id: store.id },
      select: { slug: true },
    });
    slug = found?.slug || undefined;
  }
  invalidateStoreDirectoryCache(slug);
}

export async function getStoreViewerState(slug: string, userId?: string | null): Promise<StoreViewerState | null> {
  const store = await db.store.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      providerId: true,
      reviews: {
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          authorId: true,
          helpfulVotes: { select: { userId: true } },
        },
      },
    },
  });

  if (!store) return null;
  if (!userId) return anonymousStoreViewer();

  const isOwner = store.providerId === userId;
  const [completedAppointment, userReview] = await Promise.all([
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
      select: { id: true, rating: true, comment: true },
    }),
  ]);

  let reviewEligibility: StoreReviewEligibility = 'no-completed-appointment';
  if (isOwner) {
    reviewEligibility = 'no-completed-appointment';
  } else if (userReview) {
    reviewEligibility = 'already-reviewed';
  } else if (completedAppointment) {
    reviewEligibility = 'eligible';
  }

  return {
    isAuthenticated: true,
    isOwner,
    reviewEligibility,
    ownReviewId: userReview?.id || null,
    ownReview: userReview,
    helpfulReviewIds: store.reviews
      .filter((review) => review.helpfulVotes.some((vote) => vote.userId === userId))
      .map((review) => review.id),
  };
}

export type PublicStoreDetail = NonNullable<Awaited<ReturnType<typeof getPublicStoreBySlug>>>;
