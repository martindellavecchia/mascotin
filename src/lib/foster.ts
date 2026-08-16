import { haversineKm, toGeoPoint } from '@/lib/geo';

export const DEFAULT_FOSTER_RADIUS_KM = 5;
export const MAX_FOSTER_RADIUS_KM = 50;
export const MAX_FOSTER_OFFERS = 5;
export const FOSTER_TERMS_VERSION = '2026-08-16';
export const RESCUE_CONSENT_VERSION = '2026-08-16';

export const SPECIES_LABELS: Record<string, string> = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otro animal',
};

export const SIZE_LABELS: Record<string, string> = {
  small: 'Pequeño',
  medium: 'Mediano',
  large: 'Grande',
  any: 'Cualquier tamaño',
};

export const RESCUE_STATUS_LABELS: Record<string, string> = {
  SEARCHING: 'Buscando hogar',
  INTERESTED: 'Hay hogares interesados',
  COORDINATING: 'Coordinando entrega',
  IN_FOSTER: 'En hogar de tránsito',
  RESOLVED: 'Resuelto',
  NEEDS_ADOPTION: 'Busca adopción',
  CANCELLED: 'Cancelado',
};

export type FosterProfileStatusValue = 'ACTIVE' | 'PAUSED' | 'SUSPENDED';

export interface FosterCandidate {
  id: string;
  userId: string;
  status: FosterProfileStatusValue;
  acceptsSpecies: string;
  acceptsSizes: string;
  capacity: number;
  occupiedSlots: number;
  latitude: number;
  longitude: number;
  availableFrom: Date | null;
  availableUntil: Date | null;
  maxDurationDays: number;
  experience: string;
}

export interface FosterNeed {
  createdByUserId: string;
  species: string;
  size: string;
  latitude: number;
  longitude: number;
  searchRadiusKm: number;
  requestedDays: number;
}

export interface RankedFosterCandidate {
  profileId: string;
  distanceKm: number;
  score: number;
  reasons: string[];
}

export function parseFosterList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function normalizeFosterRadius(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_FOSTER_RADIUS_KM;
  return Math.min(MAX_FOSTER_RADIUS_KM, Math.max(1, Math.round(value as number)));
}

export function scoreFosterCandidate(
  need: FosterNeed,
  candidate: FosterCandidate,
  now = new Date()
): RankedFosterCandidate | null {
  if (candidate.userId === need.createdByUserId || candidate.status !== 'ACTIVE') return null;
  if (candidate.occupiedSlots >= candidate.capacity) return null;

  const acceptedSpecies = parseFosterList(candidate.acceptsSpecies);
  const acceptedSizes = parseFosterList(candidate.acceptsSizes);
  if (!acceptedSpecies.includes(need.species) && !acceptedSpecies.includes('other')) return null;
  if (!acceptedSizes.includes(need.size) && !acceptedSizes.includes('any')) return null;
  if (candidate.maxDurationDays < need.requestedDays) return null;
  if (candidate.availableFrom && candidate.availableFrom > now) return null;

  const expectedEnd = new Date(now);
  expectedEnd.setUTCDate(expectedEnd.getUTCDate() + need.requestedDays);
  if (candidate.availableUntil && candidate.availableUntil < expectedEnd) return null;

  const origin = toGeoPoint(need.latitude, need.longitude);
  const destination = toGeoPoint(candidate.latitude, candidate.longitude);
  if (!origin || !destination) return null;

  const radiusKm = normalizeFosterRadius(need.searchRadiusKm);
  const distanceKm = haversineKm(origin, destination);
  if (distanceKm > radiusKm) return null;

  const distanceScore = Math.round(50 * (1 - distanceKm / radiusKm));
  const capacityScore = Math.min(15, (candidate.capacity - candidate.occupiedSlots) * 5);
  const durationScore = Math.min(15, Math.round((candidate.maxDurationDays / need.requestedDays) * 5));
  const experienceScore = candidate.experience === 'experienced' ? 15 : candidate.experience === 'some' ? 10 : 5;
  const reasons = [
    `${distanceKm.toFixed(1)} km de distancia`,
    `Acepta ${need.species === 'dog' ? 'perros' : need.species === 'cat' ? 'gatos' : 'otros animales'}`,
    `${candidate.capacity - candidate.occupiedSlots} lugar${candidate.capacity - candidate.occupiedSlots === 1 ? '' : 'es'} disponible${candidate.capacity - candidate.occupiedSlots === 1 ? '' : 's'}`,
  ];

  return {
    profileId: candidate.id,
    distanceKm: Number(distanceKm.toFixed(2)),
    score: Math.min(100, distanceScore + capacityScore + durationScore + experienceScore),
    reasons,
  };
}

export function rankFosterCandidates(
  need: FosterNeed,
  candidates: FosterCandidate[],
  now = new Date(),
  limit = MAX_FOSTER_OFFERS
): RankedFosterCandidate[] {
  return candidates
    .map((candidate) => scoreFosterCandidate(need, candidate, now))
    .filter((candidate): candidate is RankedFosterCandidate => candidate !== null)
    .sort((left, right) => right.score - left.score || left.distanceKm - right.distanceKm)
    .slice(0, limit);
}
