const mockRequireAuth = jest.fn();
const mockRateLimit = jest.fn();
const mockInvalidatePublicStoreCache = jest.fn();
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();
const mockDelete = jest.fn();
const mockCreate = jest.fn();
const mockCount = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

jest.mock('@/lib/rate-limit', () => ({
  RATE_LIMITS: { review: { maxRequests: 20, windowMs: 60000 } },
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

jest.mock('@/lib/server/stores', () => ({
  invalidatePublicStoreCache: (...args: unknown[]) => mockInvalidatePublicStoreCache(...args),
}));

jest.mock('@/lib/db', () => ({
  db: {
    storeReview: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    reviewHelpful: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

import { POST } from '@/app/api/stores/[slug]/reviews/[reviewId]/helpful/route';

describe('POST /api/stores/[slug]/reviews/[reviewId]/helpful', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      session: { user: { id: 'user-1' } },
      error: null,
    });
    mockRateLimit.mockResolvedValue({ allowed: true });
    mockFindFirst.mockResolvedValue({
      id: 'rev-1',
      store: { id: 'store-1', slug: 'paw-spa' },
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'vote-1' });
    mockCount.mockResolvedValue(4);
    mockInvalidatePublicStoreCache.mockResolvedValue(undefined);
  });

  it('invalidates the public store cache with id and slug after voting', async () => {
    const response = await POST({} as Request, {
      params: Promise.resolve({ slug: 'paw-spa', reviewId: 'rev-1' }),
    });
    const body = await response.json();

    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      select: { id: true, store: { select: { id: true, slug: true } } },
    }));
    expect(mockCreate).toHaveBeenCalled();
    expect(mockInvalidatePublicStoreCache).toHaveBeenCalledWith({ id: 'store-1', slug: 'paw-spa' });
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, isHelpful: true, helpfulCount: 4 });
  });

  it('returns success with counts when invalidation fails after mutation', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFindUnique.mockResolvedValue({ id: 'vote-1' });
    mockDelete.mockResolvedValue({ id: 'vote-1' });
    mockCount.mockResolvedValue(2);
    mockInvalidatePublicStoreCache.mockRejectedValue(new Error('revalidate failed'));

    const response = await POST({} as Request, {
      params: Promise.resolve({ slug: 'paw-spa', reviewId: 'rev-1' }),
    });
    const body = await response.json();

    expect(mockDelete).toHaveBeenCalled();
    expect(mockInvalidatePublicStoreCache).toHaveBeenCalledWith({ id: 'store-1', slug: 'paw-spa' });
    expect(errorSpy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, isHelpful: false, helpfulCount: 2 });
    errorSpy.mockRestore();
  });
});
