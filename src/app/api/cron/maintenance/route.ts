import { NextResponse } from 'next/server';
import { cleanupExpiredRateLimitBuckets } from '@/lib/rate-limit';
import { cleanupExpiredSyntheticRuns, retryResidualPushDeliveries } from '@/lib/server/push';
import { expireFosterOffers } from '@/lib/server/foster';
import { expireVolunteerOffers } from '@/lib/server/volunteer-network';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }
  const [push, fosterOffers, volunteerOffers, syntheticRuns, rateLimitBuckets] = await Promise.all([
    retryResidualPushDeliveries(),
    expireFosterOffers(),
    expireVolunteerOffers(),
    cleanupExpiredSyntheticRuns(),
    cleanupExpiredRateLimitBuckets(),
  ]);
  return NextResponse.json({
    success: true,
    push,
    expiredFosterOffers: fosterOffers,
    expiredVolunteerOffers: volunteerOffers.count,
    syntheticRuns,
    rateLimitBuckets,
  });
}
