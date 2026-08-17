import { revalidateTag } from 'next/cache';

export const STORE_CACHE_TAGS = {
  categories: 'store-categories',
  directory: 'store-directory',
  store: (slug: string) => `store:${slug}`,
} as const;

export function categoriesCacheControl() {
  return 'public, s-maxage=3600, stale-while-revalidate=86400';
}

export function directoryCacheControl() {
  return 'public, s-maxage=300, stale-while-revalidate=600';
}

export function noStoreCacheControl() {
  return 'no-store';
}

export function privateNoStoreCacheControl() {
  return 'private, no-store';
}

export function invalidateStoreCategoriesCache() {
  revalidateTag(STORE_CACHE_TAGS.categories);
}

export function invalidateStoreDirectoryCache(slug?: string) {
  revalidateTag(STORE_CACHE_TAGS.directory);
  if (slug) {
    revalidateTag(STORE_CACHE_TAGS.store(slug));
  }
}

export function logStoreQuery(entry: {
  route: string;
  duration_ms: number;
  result_count: number;
  cache_mode: 'ISR' | 'no-store' | 'private';
  filters?: {
    search?: boolean;
    category?: boolean;
    minRating?: number | null;
    sortBy?: string;
  };
}) {
  console.info(JSON.stringify({
    type: 'store_query',
    ...entry,
  }));
}
