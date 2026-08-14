import type { Prisma, PrismaClient } from '@prisma/client';
import { DEFAULT_STORE_CATEGORIES } from '@/lib/store-reputation';

type StoreDbClient = PrismaClient | Prisma.TransactionClient;

export function slugifyStoreName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseStoreImages(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : [];
  } catch {
    return [];
  }
}

export async function createUniqueStoreSlug(
  client: StoreDbClient,
  name: string,
  excludeStoreId?: string
): Promise<string> {
  const base = slugifyStoreName(name) || 'negocio';
  let candidate = base;
  let suffix = 2;

  while (
    await client.store.findFirst({
      where: {
        slug: candidate,
        ...(excludeStoreId ? { id: { not: excludeStoreId } } : {}),
      },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function ensureDefaultStoreCategories(
  client: StoreDbClient
): Promise<void> {
  await Promise.all(
    DEFAULT_STORE_CATEGORIES.map((category) =>
      client.storeCategory.upsert({
        where: { name: category.name },
        update: { description: category.description, isActive: true },
        create: category,
      })
    )
  );
}

export async function recalculateStoreRating(
  client: StoreDbClient,
  storeId: string
): Promise<{ ratingAverage: number; reviewCount: number }> {
  const aggregate = await client.storeReview.aggregate({
    where: { storeId, status: 'PUBLISHED' },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const ratingAverage = Number((aggregate._avg.rating ?? 0).toFixed(2));
  const reviewCount = aggregate._count.rating;

  await client.store.update({
    where: { id: storeId },
    data: { ratingAverage, reviewCount },
  });

  const store = await client.store.findUnique({
    where: { id: storeId },
    select: { providerId: true },
  });
  if (store?.providerId) {
    await client.providerProfile.updateMany({
      where: { userId: store.providerId },
      data: { rating: ratingAverage, reviewCount },
    });
  }

  return { ratingAverage, reviewCount };
}
