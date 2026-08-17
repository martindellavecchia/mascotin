import { readFileSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { getPublicMapStores, getStoreViewerState } from '@/lib/server/stores';

jest.mock('@/lib/db', () => ({
  db: {
    store: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    appointment: { findFirst: jest.fn() },
    storeReview: { findUnique: jest.fn() },
    reviewHelpful: { findMany: jest.fn() },
  },
}));
jest.mock('@/lib/stores', () => ({ parseStoreImages: () => [] }));
jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));

const mockedDb = db as unknown as {
  store: { findFirst: jest.Mock; findMany: jest.Mock };
  appointment: { findFirst: jest.Mock };
  storeReview: { findUnique: jest.Mock };
  reviewHelpful: { findMany: jest.Mock };
};

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('public store APIs', () => {
  it('does not write default categories during public GET', () => {
    const source = readSource('src/app/api/store-categories/route.ts');
    expect(source).not.toContain('ensureDefaultStoreCategories');
    expect(source).toContain('getCachedActiveStoreCategories');
    expect(source).toContain('categoriesCacheControl');
  });

  it('server-renders /shop with cached categories and stores', () => {
    const shopPage = readSource('src/app/(public)/shop/page.tsx');
    expect(shopPage).not.toContain("'use client'");
    expect(shopPage).toContain('initialStores');
    expect(shopPage).toContain('getCachedPublicStoreDirectory');
    expect(shopPage).toContain('revalidate = 300');
  });

  it('caches the unfiltered directory and bypasses cache for high-cardinality filters', () => {
    const source = readSource('src/app/api/stores/route.ts');
    expect(source).toContain('hasHighCardinalityStoreFilters');
    expect(source).toContain('getCachedPublicStoreDirectory');
    expect(source).toContain('getPublicStoreDirectory');
    expect(source).toContain('directoryCacheControl');
    expect(source).toContain('noStoreCacheControl');
  });

  it('serves the map from a dedicated minimal cached DTO', async () => {
    mockedDb.store.findMany.mockResolvedValueOnce([{
      id: 'store-1',
      name: 'Huellitas',
      slug: 'huellitas',
      address: 'Calle 123',
      latitude: -34.6,
      longitude: -58.38,
      tags: '["veterinaria_24h"]',
      plan: 'FREE',
      featuredUntil: null,
      category: { id: 'category-1', name: 'Veterinaria' },
      ratingAverage: 4.8,
      promotions: [{ title: 'Consulta bonificada' }],
    }]);

    const stores = await getPublicMapStores();

    expect(mockedDb.store.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true },
      select: expect.objectContaining({
        latitude: true,
        longitude: true,
        tags: true,
        promotions: expect.objectContaining({
          select: { title: true },
          take: 1,
        }),
      }),
      take: 100,
    }));
    expect(stores).toEqual([{
      id: 'store-1',
      name: 'Huellitas',
      slug: 'huellitas',
      address: 'Calle 123',
      latitude: -34.6,
      longitude: -58.38,
      tags: ['veterinaria_24h'],
      featured: false,
      category: { id: 'category-1', name: 'Veterinaria' },
      ratingAverage: 4.8,
      promotions: [{ title: 'Consulta bonificada' }],
    }]);

    const mapPage = readSource('src/app/(main)/map/page.tsx');
    const mapRoute = readSource('src/app/api/stores/map/route.ts');
    expect(mapPage).toContain("fetch('/api/stores/map')");
    expect(mapRoute).toContain('getCachedPublicMapStores');
    expect(mapRoute).toContain('directoryCacheControl');
  });

  it('keeps the viewer endpoint private, envelope-shaped and never 401', () => {
    const source = readSource('src/app/api/stores/[slug]/viewer/route.ts');
    expect(source).toContain('privateNoStoreCacheControl');
    expect(source).toContain('success: true, data: viewer');
    expect(source).not.toContain('status: 401');
    expect(source).toContain('getCachedSession');
  });

  it('returns anonymous viewer state for visitors', async () => {
    mockedDb.store.findFirst.mockResolvedValueOnce({
      id: 'store-1',
      providerId: 'owner-1',
    });

    const viewer = await getStoreViewerState('paw-spa', null);

    expect(viewer).toEqual({
      isAuthenticated: false,
      isOwner: false,
      reviewEligibility: 'unauthenticated',
      ownReviewId: null,
      ownReview: null,
      helpfulReviewIds: [],
    });
    expect(mockedDb.appointment.findFirst).not.toHaveBeenCalled();
    expect(mockedDb.reviewHelpful.findMany).not.toHaveBeenCalled();
  });

  it('loads helpful votes scoped to the authenticated user', async () => {
    mockedDb.store.findFirst.mockResolvedValueOnce({
      id: 'store-1',
      providerId: 'owner-1',
    });
    mockedDb.appointment.findFirst.mockResolvedValueOnce({ id: 'appt-1' });
    mockedDb.storeReview.findUnique.mockResolvedValueOnce(null);
    mockedDb.reviewHelpful.findMany.mockResolvedValueOnce([{ reviewId: 'rev-1' }]);

    const viewer = await getStoreViewerState('paw-spa', 'user-1');

    expect(mockedDb.reviewHelpful.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', review: { storeId: 'store-1', status: 'PUBLISHED' } },
      select: { reviewId: true },
    });
    expect(viewer).toMatchObject({
      isAuthenticated: true,
      helpfulReviewIds: ['rev-1'],
      reviewEligibility: 'eligible',
    });
  });

  it('disables prefetch for authenticated app entrypoints', () => {
    const header = readSource('src/components/PublicHeader.tsx');
    const directory = readSource('src/components/shop/ShopDirectory.tsx');
    expect(header).toContain('href="/inicio" prefetch={false}');
    expect(directory).toContain('href="/map" prefetch={false}');
    expect(directory).toContain('href="/provider" prefetch={false}');
    expect(header).toContain('href="/shop"');
    expect(header).not.toMatch(/href="\/shop"[^>]*prefetch=\{false\}/);
  });
});
