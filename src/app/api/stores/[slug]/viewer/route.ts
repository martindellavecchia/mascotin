import { NextResponse } from 'next/server';
import { logStoreQuery, noStoreCacheControl, privateNoStoreCacheControl } from '@/lib/server/store-cache';
import { getStoreViewerState } from '@/lib/server/stores';
import { getCachedSession } from '@/lib/session';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const started = Date.now();
  try {
    const { slug } = await params;
    const session = await getCachedSession();
    const viewer = await getStoreViewerState(slug, session?.user?.id);

    if (!viewer) {
      return NextResponse.json(
        { success: false, error: 'Negocio no encontrado' },
        { status: 404, headers: { 'Cache-Control': noStoreCacheControl() } }
      );
    }

    logStoreQuery({
      route: '/api/stores/[slug]/viewer',
      duration_ms: Date.now() - started,
      result_count: 1,
      cache_mode: 'private',
    });

    return NextResponse.json(
      { success: true, data: viewer },
      { headers: { 'Cache-Control': privateNoStoreCacheControl() } }
    );
  } catch (error) {
    console.error('Error fetching store viewer:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo obtener el estado del visitante' },
      { status: 500, headers: { 'Cache-Control': privateNoStoreCacheControl() } }
    );
  }
}
