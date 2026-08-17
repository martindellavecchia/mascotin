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

export interface PublicMapStore {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  featured: boolean;
  category: { id: string; name: string };
  ratingAverage: number;
  promotions: Array<{ title: string }>;
}

export const PUBLIC_STORE_CARD_KEYS = [
  'id',
  'name',
  'slug',
  'description',
  'address',
  'image',
  'category',
  'ratingAverage',
  'reviewCount',
  'trust',
  'services',
] as const satisfies ReadonlyArray<keyof PublicStoreCard>;

export interface PublicStoreDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  image: string | null;
  images: string[];
  tags: string[];
  category: { id: string; name: string };
  ratingAverage: number;
  reviewCount: number;
  trust: ReturnType<typeof withStoreTrustPresentation>;
  services: Array<{
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
    author: {
      name: string | null;
      image: string | null;
      isBusinessOwner: boolean;
    };
    helpfulCount: number;
  }>;
}

export type StoreInteractionProps = { id: string; slug: string };
export type ServiceBookProps = { id: string; name: string; price: number };
export type ReviewActionProps = { id: string; helpfulCount: number };

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

type DirectorySortRow = PublicStoreCard & {
  featured: boolean;
  distanceKm: number | null;
  weightedScore: number;
};

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

export function toPublicStoreCard(card: PublicStoreCard): PublicStoreCard {
  return {
    id: card.id,
    name: card.name,
    slug: card.slug,
    description: card.description,
    address: card.address,
    image: card.image,
    category: card.category,
    ratingAverage: card.ratingAverage,
    reviewCount: card.reviewCount,
    trust: card.trust,
    services: card.services.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
    })),
  };
}

export async function getPublicStoreDirectory(filters: StoreDirectoryFilters = {}): Promise<PublicStoreCard[]> {
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
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      address: true,
      image: true,
      latitude: true,
      longitude: true,
      plan: true,
      featuredUntil: true,
      ratingAverage: true,
      reviewCount: true,
      category: { select: { id: true, name: true } },
      bookingServices: {
        select: { id: true, name: true, price: true, duration: true },
        orderBy: { price: 'asc' },
        take: 3,
      },
    },
    take: 100,
  });

  const origin = near
    ? toGeoPoint(Number(near.split(',')[0]), Number(near.split(',')[1]))
    : null;

  const ranked: DirectorySortRow[] = stores.map((store) => {
    const point = toGeoPoint(store.latitude, store.longitude);
    const trust = withStoreTrustPresentation(getStoreTrustSummary(store.ratingAverage, store.reviewCount));
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      address: store.address,
      image: store.image,
      category: store.category,
      ratingAverage: store.ratingAverage,
      reviewCount: store.reviewCount,
      trust,
      services: store.bookingServices,
      featured: isFeaturedStore(store.plan, store.featuredUntil),
      distanceKm: origin && point ? Math.round(haversineKm(origin, point) * 10) / 10 : null,
      weightedScore: getWeightedStoreScore(store.ratingAverage, store.reviewCount),
    };
  }).filter((store) => {
    if (!origin || store.distanceKm === null) return true;
    return store.distanceKm <= radius;
  });

  ranked.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (sortBy === 'rating') return b.ratingAverage - a.ratingAverage || b.reviewCount - a.reviewCount;
    if (sortBy === 'reviews') return b.reviewCount - a.reviewCount || b.ratingAverage - a.ratingAverage;
    if (sortBy === 'distance' && a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
    return b.weightedScore - a.weightedScore || b.reviewCount - a.reviewCount;
  });

  return ranked.map((store) => toPublicStoreCard(store));
}

export const getCachedPublicStoreDirectory = unstable_cache(
  () => getPublicStoreDirectory({}),
  ['store-directory-initial'],
  { revalidate: 300, tags: [STORE_CACHE_TAGS.directory] }
);

export async function getPublicMapStores(): Promise<PublicMapStore[]> {
  const now = new Date();
  const stores = await db.store.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      latitude: true,
      longitude: true,
      tags: true,
      plan: true,
      featuredUntil: true,
      category: { select: { id: true, name: true } },
      ratingAverage: true,
      promotions: {
        where: {
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        select: { title: true },
        take: 1,
      },
    },
    take: 100,
  });

  return stores.map((store) => ({
    id: store.id,
    name: store.name,
    slug: store.slug,
    address: store.address,
    latitude: store.latitude,
    longitude: store.longitude,
    tags: parseJsonStringArray(store.tags),
    featured: isFeaturedStore(store.plan, store.featuredUntil),
    category: store.category,
    ratingAverage: store.ratingAverage,
    promotions: store.promotions,
  }));
}

export const getCachedPublicMapStores = unstable_cache(
  getPublicMapStores,
  ['store-map'],
  { revalidate: 300, tags: [STORE_CACHE_TAGS.directory] }
);

export const storeDetailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  address: true,
  image: true,
  images: true,
  tags: true,
  ratingAverage: true,
  reviewCount: true,
  category: { select: { id: true, name: true } },
  bookingServices: {
    select: { id: true, name: true, description: true, price: true, duration: true },
    orderBy: { createdAt: 'desc' as const },
  },
  reviews: {
    where: { status: 'PUBLISHED' as const },
    select: {
      id: true,
      rating: true,
      comment: true,
      businessReply: true,
      businessReplyAt: true,
      createdAt: true,
      author: {
        select: {
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
      _count: { select: { helpfulVotes: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.StoreSelect;

type StoreDetailQueryResult = Prisma.StoreGetPayload<{ select: typeof storeDetailSelect }>;

export function mapPublicStoreDetail(store: StoreDetailQueryResult): PublicStoreDetail {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    address: store.address,
    image: store.image,
    images: parseStoreImages(store.images),
    tags: parseJsonStringArray(store.tags),
    category: store.category,
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
        name: review.author.name,
        image: review.author.image || review.author.owner?.image || null,
        isBusinessOwner: review.author.stores.length > 0,
      },
      helpfulCount: review._count.helpfulVotes,
    })),
  };
}

export async function getPublicStoreBySlug(slug: string): Promise<PublicStoreDetail | null> {
  const store = await db.store.findFirst({
    where: { slug, isActive: true },
    select: storeDetailSelect,
  });

  if (!store) return null;
  return mapPublicStoreDetail(store);
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
    },
  });

  if (!store) return null;
  if (!userId) return anonymousStoreViewer();

  const isOwner = store.providerId === userId;
  const [completedAppointment, userReview, helpfulVotes] = await Promise.all([
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
    db.reviewHelpful.findMany({
      where: { userId, review: { storeId: store.id, status: 'PUBLISHED' } },
      select: { reviewId: true },
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
    helpfulReviewIds: helpfulVotes.map((vote) => vote.reviewId),
  };
}
