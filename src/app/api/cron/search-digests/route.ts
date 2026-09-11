import { NextResponse } from 'next/server';
import { productEnabled } from '@/lib/product-flags';
import { runSearchDigests } from '@/lib/server/search-digest';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!productEnabled('SAVED_SEARCHES')) return NextResponse.json({ enabled: false });
  const result = await runSearchDigests();
  if (result.hasMore) console.warn('search_digest_backlog', result);
  return NextResponse.json(result);
}
