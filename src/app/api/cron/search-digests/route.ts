import { NextResponse } from 'next/server';
import { productEnabled } from '@/lib/product-flags';
import { sendHealthReminders } from '@/lib/server/health-reminders';
import { runSearchDigests } from '@/lib/server/search-digest';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Vercel Hobby allows two cron jobs; this morning run also delivers health reminders.
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const healthReminders = await sendHealthReminders().catch((error) => {
    console.error('health_reminders_failed', error);
    return { candidates: 0, sent: 0 };
  });
  if (!productEnabled('SAVED_SEARCHES')) return NextResponse.json({ enabled: false, healthReminders });
  const result = await runSearchDigests();
  if (result.hasMore) console.warn('search_digest_backlog', result);
  return NextResponse.json({ ...result, healthReminders });
}
