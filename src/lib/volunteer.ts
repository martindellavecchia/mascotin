import type { RescueNeedType, VolunteerProfileStatus, VolunteerRole } from '@prisma/client';
import { haversineKm, toGeoPoint } from '@/lib/geo';
import { parseFosterList } from '@/lib/foster';
import { normalizeSolidarityRadius } from '@/lib/rescue';

export const VOLUNTEER_TERMS_VERSION = '2026-08-16';
export const MAX_VOLUNTEER_OFFERS = 5;
export const VOLUNTEER_OFFER_LIFETIME_MS = 24 * 60 * 60 * 1000;

export const VOLUNTEER_ROLE_LABELS: Record<VolunteerRole, string> = {
  TRANSPORT: 'Traslados',
  VET_COMPANION: 'Acompañamiento veterinario',
  FIELD_SUPPORT: 'Apoyo en rescates',
  SUPPLIES_LOGISTICS: 'Logística de insumos',
};

export const NEED_ROLE_MAP: Partial<Record<RescueNeedType, VolunteerRole>> = {
  VETERINARY: 'VET_COMPANION',
  TRANSPORT: 'TRANSPORT',
  SUPPLIES: 'SUPPLIES_LOGISTICS',
  FIELD_SUPPORT: 'FIELD_SUPPORT',
};

export interface VolunteerNeed {
  createdByUserId: string;
  type: RescueNeedType;
  latitude: number;
  longitude: number;
  searchRadiusKm: number;
}

export interface VolunteerCandidate {
  id: string;
  userId: string;
  status: VolunteerProfileStatus;
  roles: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  availableFrom: Date | null;
  availableUntil: Date | null;
  maxConcurrentTasks: number;
  occupiedTasks: number;
}

export interface RankedVolunteerCandidate {
  profileId: string;
  role: VolunteerRole;
  distanceKm: number;
  score: number;
  reasons: string[];
}

export function scoreVolunteerCandidate(
  need: VolunteerNeed,
  candidate: VolunteerCandidate,
  now = new Date(),
): RankedVolunteerCandidate | null {
  const requiredRole = NEED_ROLE_MAP[need.type];
  if (!requiredRole || candidate.userId === need.createdByUserId || candidate.status !== 'ACTIVE') return null;
  if (candidate.occupiedTasks >= candidate.maxConcurrentTasks) return null;
  if (!parseFosterList(candidate.roles).includes(requiredRole)) return null;
  if (candidate.availableFrom && candidate.availableFrom > now) return null;
  if (candidate.availableUntil && candidate.availableUntil < now) return null;

  const origin = toGeoPoint(need.latitude, need.longitude);
  const destination = toGeoPoint(candidate.latitude, candidate.longitude);
  if (!origin || !destination) return null;
  const effectiveRadius = Math.min(
    normalizeSolidarityRadius(need.searchRadiusKm),
    normalizeSolidarityRadius(candidate.radiusKm),
  );
  const distanceKm = haversineKm(origin, destination);
  if (distanceKm > effectiveRadius) return null;

  const distanceScore = Math.round(70 * (1 - distanceKm / effectiveRadius));
  const capacityScore = Math.min(30, (candidate.maxConcurrentTasks - candidate.occupiedTasks) * 10);
  return {
    profileId: candidate.id,
    role: requiredRole,
    distanceKm: Number(distanceKm.toFixed(2)),
    score: Math.max(1, Math.min(100, distanceScore + capacityScore)),
    reasons: [
      `${distanceKm.toFixed(1)} km de distancia`,
      VOLUNTEER_ROLE_LABELS[requiredRole],
      `${candidate.maxConcurrentTasks - candidate.occupiedTasks} cupo${candidate.maxConcurrentTasks - candidate.occupiedTasks === 1 ? '' : 's'} disponible${candidate.maxConcurrentTasks - candidate.occupiedTasks === 1 ? '' : 's'}`,
    ],
  };
}

export function rankVolunteerCandidates(
  need: VolunteerNeed,
  candidates: VolunteerCandidate[],
  now = new Date(),
  limit = MAX_VOLUNTEER_OFFERS,
): RankedVolunteerCandidate[] {
  return candidates
    .map((candidate) => scoreVolunteerCandidate(need, candidate, now))
    .filter((candidate): candidate is RankedVolunteerCandidate => candidate !== null)
    .sort((left, right) => right.score - left.score || left.distanceKm - right.distanceKm)
    .slice(0, limit);
}
