import { NextResponse } from 'next/server';
import { categoriesCacheControl, logStoreQuery } from '@/lib/server/store-cache';
import { getCachedActiveStoreCategories } from '@/lib/server/stores';

export async function GET() {
  const started = Date.now();
  try {
    const categories = await getCachedActiveStoreCategories();
    logStoreQuery({
      route: '/api/store-categories',
      duration_ms: Date.now() - started,
      result_count: categories.length,
      cache_mode: 'ISR',
    });

    return NextResponse.json(
      { success: true, categories },
      { headers: { 'Cache-Control': categoriesCacheControl() } }
    );
  } catch (error) {
    console.error('Error fetching store categories:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudieron obtener las categorías' },
      { status: 500 }
    );
  }
}
