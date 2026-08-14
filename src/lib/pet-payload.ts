import { db } from '@/lib/db';
import { geocodeAddress, toGeoPoint } from '@/lib/geo';
import {
  createEmergencyToken,
  createPublicSlug,
  isCompatibilityValue,
  parseMatchIntent,
  parseTemperament,
} from '@/lib/passport';

export async function resolveCoordinates(
  location?: string | null,
  latitude?: number | null,
  longitude?: number | null
) {
  const existing = toGeoPoint(latitude, longitude);
  if (existing) return existing;
  if (!location) return null;
  return geocodeAddress(location);
}

export function extractPassportFields(body: Record<string, unknown>) {
  const matchIntent = parseMatchIntent(body.matchIntent);
  const temperament = parseTemperament(body.temperament);

  return {
    goodWithKids: isCompatibilityValue(body.goodWithKids) ? body.goodWithKids : undefined,
    goodWithDogs: isCompatibilityValue(body.goodWithDogs) ? body.goodWithDogs : undefined,
    goodWithCats: isCompatibilityValue(body.goodWithCats) ? body.goodWithCats : undefined,
    goodWithStrangers: isCompatibilityValue(body.goodWithStrangers) ? body.goodWithStrangers : undefined,
    temperament: temperament.length > 0 ? JSON.stringify(temperament) : undefined,
    microchipId: typeof body.microchipId === 'string' ? body.microchipId : undefined,
    allergies: typeof body.allergies === 'string' ? body.allergies : undefined,
    specialNeeds: typeof body.specialNeeds === 'string' ? body.specialNeeds : undefined,
    vetClinicName: typeof body.vetClinicName === 'string' ? body.vetClinicName : undefined,
    matchIntent: body.matchIntent !== undefined ? JSON.stringify(matchIntent) : undefined,
    sharePhoneOnScan:
      typeof body.sharePhoneOnScan === 'boolean' ? body.sharePhoneOnScan : undefined,
    shareVetOnScan: typeof body.shareVetOnScan === 'boolean' ? body.shareVetOnScan : undefined,
  };
}

export async function withPetIdentity(petId: string, name: string) {
  return {
    publicSlug: createPublicSlug(name, petId),
    emergencyToken: createEmergencyToken(),
  };
}

export async function ensurePetIdentity(pet: { id: string; name: string; publicSlug: string | null; emergencyToken: string | null }) {
  if (pet.publicSlug && pet.emergencyToken) return pet;

  return db.pet.update({
    where: { id: pet.id },
    data: {
      publicSlug: pet.publicSlug || createPublicSlug(pet.name, pet.id),
      emergencyToken: pet.emergencyToken || createEmergencyToken(),
    },
  });
}
