import { NextResponse } from 'next/server';
import { directoryCacheControl, logStoreQuery, noStoreCacheControl } from '@/lib/server/store-cache';
import {
  getCachedPublicStoreDirectory,
  getPublicStoreDirectory,
  hasHighCardinalityStoreFilters,
} from '@/lib/server/stores';

export async function GET(request: Request) {
  const started = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const minRatingRaw = Number(searchParams.get('minRating') || 0);
    const filters = {
      search: searchParams.get('search')?.trim() || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      minRating: minRatingRaw > 0 ? minRatingRaw : undefined,
      sortBy: searchParams.get('sortBy') || 'recommended',
      near: searchParams.get('near') || undefined,
      radius: Number(searchParams.get('radius') || 25),
    };

    const highCardinality = hasHighCardinalityStoreFilters(filters);
    const stores = highCardinality
      ? await getPublicStoreDirectory(filters)
      : await getCachedPublicStoreDirectory();

    logStoreQuery({
      route: '/api/stores',
      duration_ms: Date.now() - started,
      result_count: stores.length,
      cache_mode: highCardinality ? 'no-store' : 'ISR',
      filters: {
        search: Boolean(filters.search),
        category: Boolean(filters.categoryId && filters.categoryId !== '_all'),
        minRating: filters.minRating ?? null,
        sortBy: filters.sortBy,
      },
    });

    return NextResponse.json(
      { success: true, stores },
      {
        headers: {
          'Cache-Control': highCardinality ? noStoreCacheControl() : directoryCacheControl(),
        },
      }
    );
  } catch (error) {
    console.error('Error fetching stores:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudieron obtener los negocios' },
      { status: 500 }
    );
  }
}
