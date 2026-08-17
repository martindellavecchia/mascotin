import { NextResponse } from 'next/server';
import { directoryCacheControl, logStoreQuery } from '@/lib/server/store-cache';
import { getCachedPublicMapStores } from '@/lib/server/stores';

export async function GET() {
  const started = Date.now();

  try {
    const stores = await getCachedPublicMapStores();

    logStoreQuery({
      route: '/api/stores/map',
      duration_ms: Date.now() - started,
      result_count: stores.length,
      cache_mode: 'ISR',
    });

    return NextResponse.json(
      { success: true, stores },
      { headers: { 'Cache-Control': directoryCacheControl() } }
    );
  } catch (error) {
    console.error('Error fetching stores for map:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudieron obtener los negocios del mapa' },
      { status: 500 }
    );
  }
}
