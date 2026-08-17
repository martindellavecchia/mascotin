jest.mock('@/lib/db', () => ({
  db: {
    $queryRaw: jest.fn(),
    rateLimitBucket: { deleteMany: jest.fn() },
  },
}));

import { db } from '@/lib/db';
import { cleanupExpiredRateLimitBuckets, rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const dbMock = db as unknown as {
  $queryRaw: jest.Mock;
  rateLimitBucket: { deleteMany: jest.Mock };
};

describe('distributed rescue rate limits', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows requests inside the shared database window', async () => {
    dbMock.$queryRaw.mockResolvedValue([{ count: 1, expiresAt: new Date(Date.now() + 600000) }]);

    await expect(rateLimit('rescue-contact:user-1', RATE_LIMITS.rescueContact)).resolves.toMatchObject({
      allowed: true, remaining: 9,
    });
    expect(dbMock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('rejects requests after the distributed quota is exhausted', async () => {
    dbMock.$queryRaw.mockResolvedValue([{ count: 11, expiresAt: new Date(Date.now() + 300000) }]);

    await expect(rateLimit('rescue-contact:user-1', RATE_LIMITS.rescueContact)).resolves.toMatchObject({
      allowed: false, remaining: 0,
    });
  });

  it('fails closed if the distributed store is unavailable', async () => {
    dbMock.$queryRaw.mockRejectedValue(new Error('database unavailable'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(rateLimit('rescue-message:user-1', RATE_LIMITS.rescueMessage)).resolves.toEqual({
      allowed: false, remaining: 0, retryAfterMs: 60000,
    });
    consoleError.mockRestore();
  });

  it('cleans only expired buckets', async () => {
    dbMock.rateLimitBucket.deleteMany.mockResolvedValue({ count: 4 });

    await expect(cleanupExpiredRateLimitBuckets()).resolves.toBe(4);
    expect(dbMock.rateLimitBucket.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: expect.any(Date) } } });
  });
});
