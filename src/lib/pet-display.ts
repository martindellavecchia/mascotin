import { parseJsonStringArray } from '@/lib/json-array';
import { getPrimaryImageUrl } from '@/lib/media';

export const PET_TYPE_LABELS: Record<string, string> = {
  dog: 'Perro',
  cat: 'Gato',
  bird: 'Ave',
  other: 'Otro',
};

export const PET_SIZE_LABELS: Record<string, string> = {
  small: 'Pequeño',
  medium: 'Mediano',
  large: 'Grande',
  xlarge: 'Extra grande',
};

export const PET_GENDER_LABELS: Record<string, string> = {
  male: 'Macho',
  female: 'Hembra',
};

export const PET_ENERGY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export const PET_ACTIVITY_LABELS: Record<string, string> = {
  walk: 'Pasear',
  play: 'Jugar',
  fetch: 'Buscar',
  swim: 'Nadar',
  socialize: 'Socializar',
  groom: 'Aseo',
  training: 'Entrenar',
};

export const UNSET_LABEL = 'Sin especificar';

const weightFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

export function formatPetAge(age: number | null | undefined): string | null {
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 0) return null;
  if (age < 1) return 'Menos de 1 año';
  const years = Math.floor(age);
  return years === 1 ? '1 año' : `${years} años`;
}

/**
 * Pets created through the short wizard are stored with age 0 and no gender,
 * so age 0 only counts as a real value once the rest of the profile was filled in.
 */
export function hasPetAge(pet: { age?: number | null; gender?: string | null }): boolean {
  if (formatPetAge(pet.age) === null) return false;
  return (pet.age ?? 0) > 0 || Boolean(pet.gender);
}

export function getPetAgeLabel(pet: { age?: number | null; gender?: string | null }): string | null {
  return hasPetAge(pet) ? formatPetAge(pet.age) : null;
}

export function formatPetWeight(weight: number | null | undefined): string | null {
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) return null;
  return `${weightFormatter.format(weight)} kg`;
}

export function getOptionLabel(labels: Record<string, string>, value: string | null | undefined): string | null {
  if (!value) return null;
  return labels[value.toLowerCase()] ?? null;
}

export function parsePetActivities(value: unknown): string[] {
  return parseJsonStringArray(value).filter((activity) => activity in PET_ACTIVITY_LABELS);
}

export interface PetCompletenessInput {
  age?: number | null;
  gender?: string | null;
  size?: string | null;
  energy?: string | null;
  images?: string | string[] | null;
  thumbnailIndex?: number | null;
}

export function getMissingPetProfileFields(pet: PetCompletenessInput): string[] {
  const missing: string[] = [];
  if (!getPrimaryImageUrl(pet.images, pet.thumbnailIndex ?? 0)) missing.push('foto');
  if (!hasPetAge(pet)) missing.push('edad');
  if (!getOptionLabel(PET_GENDER_LABELS, pet.gender)) missing.push('sexo');
  if (!getOptionLabel(PET_SIZE_LABELS, pet.size)) missing.push('tamaño');
  if (!getOptionLabel(PET_ENERGY_LABELS, pet.energy)) missing.push('energía');
  return missing;
}

export function formatMissingFields(fields: string[]): string {
  if (fields.length <= 1) return fields.join('');
  return `${fields.slice(0, -1).join(', ')} y ${fields[fields.length - 1]}`;
}
