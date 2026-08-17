import {
  categoriesCacheControl,
  directoryCacheControl,
  invalidateStoreCategoriesCache,
  invalidateStoreDirectoryCache,
  privateNoStoreCacheControl,
  STORE_CACHE_TAGS,
} from '@/lib/server/store-cache';
import { hasHighCardinalityStoreFilters } from '@/lib/server/stores';

jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/stores', () => ({ parseStoreImages: () => [] }));
jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));

const { revalidateTag } = jest.requireMock('next/cache') as { revalidateTag: jest.Mock };

describe('store cache policy', () => {
  beforeEach(() => {
    revalidateTag.mockClear();
  });

  it('exposes CDN cache headers required by the plan', () => {
    expect(categoriesCacheControl()).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    expect(directoryCacheControl()).toBe('public, s-maxage=300, stale-while-revalidate=600');
    expect(privateNoStoreCacheControl()).toBe('private, no-store');
  });

  it('treats search, category, rating, sort and geo as high-cardinality filters', () => {
    expect(hasHighCardinalityStoreFilters({})).toBe(false);
    expect(hasHighCardinalityStoreFilters({ sortBy: 'recommended' })).toBe(false);
    expect(hasHighCardinalityStoreFilters({ search: 'vet' })).toBe(true);
    expect(hasHighCardinalityStoreFilters({ categoryId: 'cat-1' })).toBe(true);
    expect(hasHighCardinalityStoreFilters({ minRating: 4 })).toBe(true);
    expect(hasHighCardinalityStoreFilters({ sortBy: 'rating' })).toBe(true);
    expect(hasHighCardinalityStoreFilters({ near: '-34.6,-58.4' })).toBe(true);
  });

  it('invalidates category and directory tags after public mutations', () => {
    invalidateStoreCategoriesCache();
    invalidateStoreDirectoryCache('paw-spa');

    expect(revalidateTag).toHaveBeenCalledWith(STORE_CACHE_TAGS.categories);
    expect(revalidateTag).toHaveBeenCalledWith(STORE_CACHE_TAGS.directory);
    expect(revalidateTag).toHaveBeenCalledWith(STORE_CACHE_TAGS.store('paw-spa'));
  });
});
