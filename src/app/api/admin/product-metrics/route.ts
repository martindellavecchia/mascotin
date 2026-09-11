import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
export async function GET(request: Request) {
  const adminError = await requireAdmin();
  if (adminError) return adminError;
  const synthetic = new URL(request.url).searchParams.get('synthetic') === 'true';
  const since = new Date(Date.now() - 30 * 86400000);
  const user = { syntheticRunId: synthetic ? { not: null } : null };
  const [
    events,
    appointments,
    fosterResponses,
    volunteerResponses,
    placements,
    adoptions,
    oldestPendingSearch,
  ] = await Promise.all([
    db.productEvent.groupBy({
      by: ['name'],
      where: { createdAt: { gte: since }, syntheticRunId: user.syntheticRunId },
      _count: true,
    }),
    db.appointment.groupBy({
      by: ['status'],
      where: { user, createdAt: { gte: since } },
      _count: true,
    }),
    db.fosterOffer.count({ where: { respondedAt: { gte: since }, fosterProfile: { user } } }),
    db.volunteerOffer.count({ where: { respondedAt: { gte: since }, volunteerProfile: { user } } }),
    db.fosterPlacement.groupBy({
      by: ['status'],
      where: { fosterProfile: { user }, createdAt: { gte: since } },
      _count: true,
    }),
    db.adoptionListing.groupBy({
      by: ['status'],
      where: { listedBy: user, createdAt: { gte: since } },
      _count: true,
    }),
    db.savedSearch.findFirst({
      where: { enabled: true, user },
      orderBy: { lastCheckedAt: 'asc' },
      select: { lastCheckedAt: true },
    }),
  ]);
  return NextResponse.json({
    since,
    synthetic,
    events,
    appointments,
    fosterResponses,
    volunteerResponses,
    placements,
    adoptions,
    oldestSearchCheckpoint: oldestPendingSearch?.lastCheckedAt || null,
    note: 'Eventos deduplicados desde la activación; estados de dominio de los últimos 30 días. No incluye textos ni ubicaciones.',
  });
}
