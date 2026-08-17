import { haversineKm, locationsShareZone, toGeoPoint } from '@/lib/geo';
import { getPrimaryImageUrl } from '@/lib/media';
import { parseJsonStringArray } from '@/lib/json-array';

export interface MatchPreferences {
  matchingPaused: boolean;
  matchDistance: number;
  matchPetTypes: string[];
  matchPetSizes: string[];
}

export interface MatchableCurrentPet {
  id: string;
  petType: string;
  breed: string | null;
  size?: string | null;
  energy?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  matchIntent?: string | null;
}

export interface MatchableCandidatePet {
  id: string;
  name: string;
  petType: string;
  breed: string | null;
  size?: string | null;
  energy?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  matchIntent?: string | null;
  images: string;
  thumbnailIndex?: number | null;
  owner: {
    location: string | null;
    bio: string | null;
    latitude?: number | null;
    longitude?: number | null;
    user?: {
      settings?: {
        matchingPaused?: boolean;
      } | null;
    } | null;
  };
}

export interface ScoredMatch {
  id: string;
  name: string;
  petType: string;
  breed: string | null;
  image: string | null;
  matchScore: number;
  matchReason: string;
  distanceKm: number | null;
}

export const DEFAULT_MATCH_PREFERENCES: MatchPreferences = {
  matchingPaused: false,
  matchDistance: 50,
  matchPetTypes: [],
  matchPetSizes: [],
};

export function parseMatchPreferences(settings?: {
  matchingPaused?: boolean;
  matchDistance?: number;
  matchPetTypes?: string;
  matchPetSizes?: string;
} | null): MatchPreferences {
  if (!settings) return { ...DEFAULT_MATCH_PREFERENCES };

  return {
    matchingPaused: Boolean(settings.matchingPaused),
    matchDistance: settings.matchDistance ?? DEFAULT_MATCH_PREFERENCES.matchDistance,
    matchPetTypes: parseJsonStringArray(settings.matchPetTypes),
    matchPetSizes: parseJsonStringArray(settings.matchPetSizes),
  };
}

export function candidateOrigin(pet: MatchableCandidatePet) {
  return (
    toGeoPoint(pet.latitude, pet.longitude) ||
    toGeoPoint(pet.owner.latitude, pet.owner.longitude)
  );
}

export function currentOrigin(
  pet: MatchableCurrentPet,
  ownerLocation?: { latitude?: number | null; longitude?: number | null } | null
) {
  return (
    toGeoPoint(pet.latitude, pet.longitude) ||
    toGeoPoint(ownerLocation?.latitude, ownerLocation?.longitude)
  );
}

export function passesMatchFilters(
  candidate: MatchableCandidatePet,
  preferences: MatchPreferences,
  origin: ReturnType<typeof currentOrigin>
): boolean {
  if (candidate.owner.user?.settings?.matchingPaused) return false;

  if (
    preferences.matchPetTypes.length > 0 &&
    !preferences.matchPetTypes.includes(candidate.petType)
  ) {
    return false;
  }

  if (
    preferences.matchPetSizes.length > 0 &&
    candidate.size &&
    !preferences.matchPetSizes.includes(candidate.size)
  ) {
    return false;
  }

  const candidatePoint = candidateOrigin(candidate);
  if (origin && candidatePoint) {
    return haversineKm(origin, candidatePoint) <= preferences.matchDistance;
  }

  return true;
}

export function scorePetMatch(
  currentPet: MatchableCurrentPet,
  candidate: MatchableCandidatePet,
  ownerLocation: string | null,
  ownerBio: string | null
): ScoredMatch {
  let score = 0;
  const reasons: string[] = [];
  const origin = currentOrigin(currentPet);
  const candidatePoint = candidateOrigin(candidate);
  const distanceKm =
    origin && candidatePoint ? Math.round(haversineKm(origin, candidatePoint) * 10) / 10 : null;

  if (candidate.petType === currentPet.petType) {
    score += 5;
    reasons.push('Mismo tipo');
  }

  if (currentPet.size && candidate.size && currentPet.size === candidate.size) {
    score += 3;
    reasons.push('Mismo tamaño');
  }

  if (currentPet.energy && candidate.energy && currentPet.energy === candidate.energy) {
    score += 3;
    reasons.push('Misma energía');
  }

  const currentIntents = parseJsonStringArray(currentPet.matchIntent);
  const candidateIntents = parseJsonStringArray(candidate.matchIntent);
  const sharedIntents = currentIntents.filter((intent) => candidateIntents.includes(intent));
  if (sharedIntents.includes('walk')) {
    score += 4;
    reasons.push('Compañero de paseo');
  } else if (sharedIntents.length > 0) {
    score += 2;
    reasons.push('Misma intención');
  }

  if (
    candidate.breed &&
    currentPet.breed &&
    candidate.breed.toLowerCase() === currentPet.breed.toLowerCase()
  ) {
    score += 3;
    reasons.push('Misma raza');
  }

  const currentLocation = currentPet.location || ownerLocation;
  const candidateLocation = candidate.location || candidate.owner.location;
  if (distanceKm !== null && distanceKm <= 5) {
    score += 4;
    reasons.push('Muy cerca');
  } else if (locationsShareZone(currentLocation, candidateLocation)) {
    score += 2;
    reasons.push('Misma zona');
  }

  if (candidate.owner.bio && ownerBio) {
    const petOwnerInterests = candidate.owner.bio.toLowerCase().split(/[\s,]+/);
    const myInterests = ownerBio.toLowerCase().split(/[\s,]+/);
    const commonInterests = petOwnerInterests.filter(
      (item) => myInterests.includes(item) && item.length > 3
    );
    if (commonInterests.length > 0) {
      score += commonInterests.length;
      reasons.push('Intereses comunes');
    }
  }

  return {
    id: candidate.id,
    name: candidate.name,
    petType: candidate.petType,
    breed: candidate.breed,
    image: getPrimaryImageUrl(candidate.images, candidate.thumbnailIndex ?? 0),
    matchScore: score,
    matchReason: reasons.length > 0 ? reasons.join(' • ') : 'Nuevo amigo',
    distanceKm,
  };
}

export function rankCandidates(
  currentPet: MatchableCurrentPet,
  candidates: MatchableCandidatePet[],
  preferences: MatchPreferences,
  ownerLocation: string | null,
  ownerBio: string | null,
  ownerCoords?: { latitude?: number | null; longitude?: number | null } | null,
  limit = 6
): ScoredMatch[] {
  const origin = currentOrigin(currentPet, ownerCoords);

  return candidates
    .filter((candidate) => passesMatchFilters(candidate, preferences, origin))
    .map((candidate) => scorePetMatch(currentPet, candidate, ownerLocation, ownerBio))
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, limit);
}
