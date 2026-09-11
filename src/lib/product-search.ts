import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const searchFiltersSchema = z.object({
  search: z.string().trim().max(100).default(''),
  categoryId: z.string().max(100).default(''),
  minRating: z.number().min(0).max(5).default(0),
  species: z.enum(['', 'dog', 'cat', 'bird', 'other']).default(''),
  size: z.enum(['', 'small', 'medium', 'large']).default(''),
  zone: z.string().trim().max(100).default(''),
});
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export const savedSearchSchema = z.object({
  name: z.string().trim().min(1, 'Escribí un nombre').max(80),
  kind: z.enum(['ADOPTION', 'SERVICES']),
  filters: searchFiltersSchema,
  enabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(false),
});
export function storeSearchWhere(filters: Partial<SearchFilters>): Prisma.StoreWhereInput {
  return {
    isActive: true,
    ...(filters.categoryId && filters.categoryId !== '_all'
      ? { categoryId: filters.categoryId }
      : {}),
    ...(filters.minRating ? { ratingAverage: { gte: filters.minRating } } : {}),
    ...(filters.zone ? { address: { contains: filters.zone, mode: 'insensitive' } } : {}),
    ...(filters.search?.trim()
      ? {
          OR: [
            { name: { contains: filters.search.trim(), mode: 'insensitive' } },
            { description: { contains: filters.search.trim(), mode: 'insensitive' } },
            { address: { contains: filters.search.trim(), mode: 'insensitive' } },
            { category: { name: { contains: filters.search.trim(), mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
}
export function adoptionSearchWhere(
  filters: Partial<SearchFilters>
): Prisma.AdoptionListingWhereInput {
  return {
    status: 'OPEN',
    pet: {
      isActive: true,
      ...(filters.species ? { petType: filters.species } : {}),
      ...(filters.size ? { size: filters.size } : {}),
    },
    ...(filters.zone ? { location: { contains: filters.zone, mode: 'insensitive' } } : {}),
    ...(filters.search
      ? {
          OR: [
            { pet: { name: { contains: filters.search, mode: 'insensitive' } } },
            { character: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}
export function filtersFromParams(params: URLSearchParams): SearchFilters {
  return searchFiltersSchema.parse({
    search: params.get('search') || '',
    categoryId: params.get('categoryId') || '',
    minRating: Number(params.get('minRating') || 0),
    species: params.get('species') || '',
    size: params.get('size') || '',
    zone: params.get('zone') || '',
  });
}
export function searchHref(kind: string, filters: SearchFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
  });
  return `${kind === 'ADOPTION' ? '/adoptions' : '/shop'}?${params}`;
}
