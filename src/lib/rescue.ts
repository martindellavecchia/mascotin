import type { RescueCaseStatus, RescueNeedStatus, RescueNeedType, SolidarityAlertType } from '@prisma/client';
import { haversineKm, toGeoPoint } from '@/lib/geo';
import { parseFosterList } from '@/lib/foster';

export const DEFAULT_SOLIDARITY_RADIUS_KM = 5;
export const MAX_SOLIDARITY_RADIUS_KM = 50;
export const SOLIDARITY_CONSENT_VERSION = '2026-08-16';

export const RESCUE_NEED_LABELS: Record<RescueNeedType, string> = {
  FOSTER: 'Hogar de tránsito',
  VETERINARY: 'Atención veterinaria',
  TRANSPORT: 'Traslado',
  SUPPLIES: 'Insumos',
  FIELD_SUPPORT: 'Apoyo en rescate',
};

export const RESCUE_NEED_STATUS_LABELS: Record<RescueNeedStatus, string> = {
  OPEN: 'Buscando ayuda',
  INTERESTED: 'Hay personas interesadas',
  ASSIGNED: 'Ayuda coordinada',
  ACTIVE: 'Ayuda en curso',
  FULFILLED: 'Ayuda completada',
  CANCELLED: 'Cancelada',
};

export interface RescueStatusSnapshot {
  currentStatus: RescueCaseStatus;
  needStatuses: RescueNeedStatus[];
  hasActiveFoster: boolean;
  hasOpenAdoption: boolean;
}

export function calculateRescueCaseStatus(snapshot: RescueStatusSnapshot): RescueCaseStatus {
  if (snapshot.currentStatus === 'CANCELLED') return 'CANCELLED';
  if (snapshot.hasOpenAdoption) return 'NEEDS_ADOPTION';
  if (snapshot.hasActiveFoster) return 'IN_FOSTER';
  if (snapshot.needStatuses.includes('ACTIVE')) return 'ASSISTANCE_ACTIVE';
  if (snapshot.needStatuses.includes('ASSIGNED')) return 'COORDINATING';
  if (snapshot.needStatuses.includes('INTERESTED')) return 'INTERESTED';
  if (snapshot.needStatuses.includes('OPEN')) return 'SEARCHING';
  if (snapshot.needStatuses.length > 0 && snapshot.needStatuses.every((status) => status === 'FULFILLED' || status === 'CANCELLED')) {
    return 'RESOLVED';
  }
  return snapshot.currentStatus;
}

export function normalizeSolidarityRadius(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_SOLIDARITY_RADIUS_KM;
  return Math.min(MAX_SOLIDARITY_RADIUS_KM, Math.max(1, Math.round(value as number)));
}

export interface SolidaritySubscriptionCandidate {
  type: SolidarityAlertType;
  enabled: boolean;
  radiusKm: number;
  species: string;
  sizes: string;
  urgencies: string;
  latitude: number;
  longitude: number;
}

export interface SolidarityAlertSubject {
  type: SolidarityAlertType;
  species: string;
  size?: string | null;
  urgency?: string | null;
  latitude: number;
  longitude: number;
}

export function matchesSolidaritySubscription(
  subject: SolidarityAlertSubject,
  candidate: SolidaritySubscriptionCandidate,
): boolean {
  if (!candidate.enabled || candidate.type !== subject.type) return false;
  const origin = toGeoPoint(subject.latitude, subject.longitude);
  const destination = toGeoPoint(candidate.latitude, candidate.longitude);
  if (!origin || !destination) return false;
  if (haversineKm(origin, destination) > normalizeSolidarityRadius(candidate.radiusKm)) return false;

  const species = parseFosterList(candidate.species);
  const sizes = parseFosterList(candidate.sizes);
  const urgencies = parseFosterList(candidate.urgencies);
  if (species.length > 0 && !species.includes(subject.species)) return false;
  if (subject.type !== 'VETERINARY' && sizes.length > 0 && (!subject.size || !sizes.includes(subject.size))) return false;
  if (subject.type !== 'ADOPTION' && urgencies.length > 0 && (!subject.urgency || !urgencies.includes(subject.urgency))) return false;
  return true;
}

export function publicRescueSummary(input: {
  status: RescueCaseStatus;
  primaryNeed: RescueNeedType;
  additionalNeeds: RescueNeedType[];
  publicZone: string;
}) {
  return {
    status: input.status,
    primaryNeed: input.primaryNeed,
    additionalNeeds: input.additionalNeeds,
    zone: input.publicZone,
  };
}

export function toGeneralZone(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return 'Cerca de tu zona';
  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean);
  const candidate = parts.length > 1 ? parts.slice(-2).join(', ') : parts[0];
  return /\d{2,}/.test(candidate) ? 'Zona cercana' : candidate.slice(0, 120);
}

const PUBLIC_PHONE_PATTERN = /\+?(?:[\s().-]*\d){7,}/;
const PUBLIC_EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
const PUBLIC_ADDRESS_PATTERN = /\b(?:calle|avenida|av\.?|pasaje|pje\.?|ruta|boulevard|bvd\.?|domicilio)\s+[^,\n]{1,60}\s+\d{1,5}\b/iu;

export function containsPrivatePublicRescueData(value: string) {
  return PUBLIC_PHONE_PATTERN.test(value)
    || PUBLIC_EMAIL_PATTERN.test(value)
    || PUBLIC_ADDRESS_PATTERN.test(value);
}
