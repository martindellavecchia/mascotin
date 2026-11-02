import type { Prisma } from '@prisma/client';
import { withImageFields } from '@/lib/media';
import { toGeneralZone } from '@/lib/rescue';

export const PUBLIC_PET_SELECT = {
  id: true,
  name: true,
  petType: true,
  breed: true,
  age: true,
  weight: true,
  size: true,
  gender: true,
  vaccinated: true,
  neutered: true,
  energy: true,
  bio: true,
  activities: true,
  location: true,
  images: true,
  thumbnailIndex: true,
  goodWithKids: true,
  goodWithDogs: true,
  goodWithCats: true,
  goodWithStrangers: true,
  temperament: true,
  matchIntent: true,
  careRole: true,
  level: true,
  totalMatches: true,
  owner: { select: { name: true, location: true, image: true } },
} satisfies Prisma.PetSelect;

type PublicPetSource = Prisma.PetGetPayload<{ select: typeof PUBLIC_PET_SELECT }>;

export function toPublicPet(pet: PublicPetSource) {
  const location = toGeneralZone(pet.location);

  return withImageFields({
    id: pet.id,
    name: pet.name,
    petType: pet.petType,
    breed: pet.breed,
    age: pet.age,
    weight: pet.weight,
    size: pet.size,
    gender: pet.gender,
    vaccinated: pet.vaccinated,
    neutered: pet.neutered,
    energy: pet.energy,
    bio: pet.bio,
    activities: pet.activities,
    location,
    images: pet.images,
    thumbnailIndex: pet.thumbnailIndex,
    goodWithKids: pet.goodWithKids,
    goodWithDogs: pet.goodWithDogs,
    goodWithCats: pet.goodWithCats,
    goodWithStrangers: pet.goodWithStrangers,
    temperament: pet.temperament,
    matchIntent: pet.matchIntent,
    careRole: pet.careRole,
    level: pet.level,
    totalMatches: pet.totalMatches,
    owner: pet.careRole === 'FOSTER'
      ? { name: 'Hogar de tránsito', location, image: null }
      : { name: pet.owner.name, location: toGeneralZone(pet.owner.location), image: pet.owner.image },
  });
}
