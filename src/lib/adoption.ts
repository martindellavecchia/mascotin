import type { CompatibilityValue } from '@/lib/passport';

export interface AdopterProfileInput {
  housingType: string;
  hasYard: boolean;
  hasKids: boolean;
  hasOtherPets: boolean;
  experience: string;
}

export interface AdoptionPetInput {
  energy?: string | null;
  goodWithKids?: string | null;
  goodWithDogs?: string | null;
  goodWithCats?: string | null;
  specialNeeds?: string | null;
}

function compatibilityScore(
  answer: string | null | undefined,
  hasTrait: boolean
): number {
  const value = (answer || 'unknown') as CompatibilityValue | 'unknown';
  if (value === 'unknown') return 1;
  if (hasTrait && value === 'yes') return 3;
  if (hasTrait && value === 'no') return 0;
  if (!hasTrait && value === 'no') return 2;
  return 2;
}

export function scoreAdoptionCompatibility(
  pet: AdoptionPetInput,
  adopter: AdopterProfileInput
): number {
  let score = 0;
  const max = 15;

  score += compatibilityScore(pet.goodWithKids, adopter.hasKids);
  score += compatibilityScore(pet.goodWithDogs, adopter.hasOtherPets);
  score += compatibilityScore(pet.goodWithCats, adopter.hasOtherPets);

  if (pet.energy === 'high' && adopter.experience === 'experienced') score += 3;
  else if (pet.energy === 'high' && adopter.experience === 'some') score += 2;
  else if (pet.energy === 'high' && adopter.experience === 'none') score += 0;
  else if (pet.energy === 'medium') score += 2;
  else score += 3;

  if (pet.specialNeeds && pet.specialNeeds.trim().length > 0) {
    score += adopter.experience === 'experienced' ? 3 : adopter.experience === 'some' ? 1 : 0;
  } else {
    score += 2;
  }

  return Math.round((score / max) * 100);
}
