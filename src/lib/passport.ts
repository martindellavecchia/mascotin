import { randomBytes } from 'crypto';
import { parseJsonStringArray } from '@/lib/json-array';

export const COMPATIBILITY_VALUES = ['yes', 'no', 'unknown'] as const;
export type CompatibilityValue = (typeof COMPATIBILITY_VALUES)[number];

export const MATCH_INTENTS = ['walk', 'play', 'social', 'sit'] as const;
export type MatchIntent = (typeof MATCH_INTENTS)[number];

export const TEMPERAMENT_TAGS = [
  'sociable',
  'territorial',
  'anxious',
  'playful',
  'calm',
  'independent',
] as const;

export function createEmergencyToken(): string {
  return randomBytes(16).toString('hex');
}

export function createPublicSlug(name: string, petId: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'mascota';

  return `${base}-${petId.slice(-6)}`;
}

export function parseTemperament(value: unknown): string[] {
  return parseJsonStringArray(value).filter((tag) =>
    TEMPERAMENT_TAGS.includes(tag as (typeof TEMPERAMENT_TAGS)[number])
  );
}

export function parseMatchIntent(value: unknown): MatchIntent[] {
  return parseJsonStringArray(value).filter((item): item is MatchIntent =>
    MATCH_INTENTS.includes(item as MatchIntent)
  );
}

export function isCompatibilityValue(value: unknown): value is CompatibilityValue {
  return typeof value === 'string' && COMPATIBILITY_VALUES.includes(value as CompatibilityValue);
}
