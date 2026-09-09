import 'server-only';

import type { Pet } from '@/types';
import { db } from '@/lib/db';
import { serializeForClient } from '@/lib/server/serialize';
import { getRankedPetMatches } from '@/lib/server/pet-matching';
import { getFeedPage } from '@/lib/server/feed';

export interface HomeStatsData {
  totalPets: number;
  totalMatches: number;
  totalSwipes: number;
  likesReceived: number;
}

export interface HomeAppointmentData {
  id: string;
  date: string;
  status: string;
  service: {
    name: string;
    provider: { businessName: string };
  };
  pet: { id: string; name: string; images: string };
}

export interface HomeBootstrapSuggestion {
  id: string;
  name: string;
  petType: string;
  breed: string | null;
  image: string | null;
  matchScore: number;
  matchReason: string;
}

export interface HomeBootstrapData {
  pets: Pet[];
  selectedPetId?: string;
  hasMatches: boolean;
  hasOwnPosts: boolean;
  suggestions: HomeBootstrapSuggestion[];
  feedPage: Awaited<ReturnType<typeof getFeedPage>>;
}

const PET_SELECT = {
  id: true,
  ownerId: true,
  name: true,
  petType: true,
  breed: true,
  age: true,
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
  latitude: true,
  longitude: true,
  goodWithKids: true,
  goodWithDogs: true,
  goodWithCats: true,
  matchIntent: true,
  level: true,
  xp: true,
  totalMatches: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getSuggestionsForPet(
  userId: string,
  currentPet: {
    id: string;
    petType: string;
    breed: string | null;
    size?: string | null;
    energy?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    matchIntent?: string | null;
  },
  ownerLocation: string | null,
  ownerBio: string | null,
  myPetIds: string[],
  limit = 6,
  ownerCoords?: { latitude?: number | null; longitude?: number | null } | null
) {
  return getRankedPetMatches({
    userId, currentPet, ownerLocation, ownerBio, ownerCoords, myPetIds, limit,
  });
}

export async function getHomeBootstrapData(
  userId: string,
  requestedPetId?: string | null
): Promise<HomeBootstrapData> {
  const owner = await db.owner.findUnique({
    where: { userId },
    select: {
      id: true,
      location: true,
      bio: true,
      latitude: true,
      longitude: true,
      pets: {
        orderBy: { createdAt: 'desc' },
        select: PET_SELECT,
      },
    },
  });

  const emptyFeed = { posts: [], nextCursor: null, hasMore: false };
  if (!owner || owner.pets.length === 0) {
    return {
      pets: [], hasMatches: false, hasOwnPosts: false,
      suggestions: [], feedPage: emptyFeed,
    };
  }

  const pets = serializeForClient(owner.pets) as unknown as Pet[];
  const petIds = owner.pets.map((pet) => pet.id);
  const selectedPet = owner.pets.find((pet) => pet.id === requestedPetId) || owner.pets[0];

  const feedPromise = Promise.all([
    db.match.findFirst({
      where: { OR: [{ pet1Id: { in: petIds } }, { pet2Id: { in: petIds } }] },
      select: { id: true },
    }),
    db.post.findFirst({
      where: { authorId: userId, isVisible: true },
      select: { id: true },
    }),
  ]).then(async ([match, ownPost]) => ({
    hasMatches: Boolean(match),
    hasOwnPosts: Boolean(ownPost),
    feedPage: match || ownPost ? await getFeedPage({ userId, limit: 10 }) : emptyFeed,
  }));

  const [suggestions, feed] = await Promise.all([
    getSuggestionsForPet(
      userId, selectedPet, owner.location, owner.bio, petIds, 1,
      { latitude: owner.latitude, longitude: owner.longitude }
    ),
    feedPromise,
  ]);

  return { pets, selectedPetId: selectedPet.id, suggestions, ...feed };
}
