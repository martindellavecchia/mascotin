import { NextResponse } from 'next/server';
import { directoryCacheControl, logStoreQuery, noStoreCacheControl } from '@/lib/server/store-cache';
import { getCachedPublicStoreBySlug } from '@/lib/server/stores';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const started = Date.now();
  try {
    const { slug } = await params;
    const store = await getCachedPublicStoreBySlug(slug);

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404, headers: { 'Cache-Control': noStoreCacheControl() } }
      );
    }

    logStoreQuery({
      route: '/api/stores/[slug]',
      duration_ms: Date.now() - started,
      result_count: 1,
      cache_mode: 'ISR',
    });

    return NextResponse.json(
      { success: true, store },
      { headers: { 'Cache-Control': directoryCacheControl() } }
    );
  } catch (error) {
    console.error('Error fetching store detail:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo obtener el negocio' },
      { status: 500 }
    );
  }
}
