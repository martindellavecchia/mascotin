import 'server-only';

import { db } from '@/lib/db';
import { DISCOVERY_CANDIDATE_LIMIT, DISCOVERY_CANDIDATE_ORDER, getPetDiscoveryQuery } from '@/lib/server/pet-discovery';
import { getPrimaryImageUrl } from '@/lib/media';
import {
  rankCandidates,
  type MatchableCandidatePet,
  type MatchableCurrentPet,
  type ScoredMatch,
} from '@/lib/matching';

const CANDIDATE_SELECT = {
  id: true,
  name: true,
  petType: true,
  breed: true,
  size: true,
  energy: true,
  location: true,
  latitude: true,
  longitude: true,
  matchIntent: true,
  owner: {
    select: {
      location: true,
      bio: true,
      latitude: true,
      longitude: true,
      user: {
        select: {
          settings: {
            select: { matchingPaused: true },
          },
        },
      },
    },
  },
} as const;

export async function getRankedPetMatches(options: {
  userId: string;
  currentPet: MatchableCurrentPet;
  ownerLocation: string | null;
  ownerBio: string | null;
  ownerCoords?: { latitude?: number | null; longitude?: number | null } | null;
  myPetIds: string[];
  limit?: number;
}): Promise<ScoredMatch[]> {
  const { where, preferences } = await getPetDiscoveryQuery(options);
  const candidates = (await db.pet.findMany({
    where,
    select: CANDIDATE_SELECT,
    orderBy: DISCOVERY_CANDIDATE_ORDER,
    take: DISCOVERY_CANDIDATE_LIMIT,
  })) as MatchableCandidatePet[];

  const ranked = rankCandidates(
    options.currentPet,
    candidates,
    preferences,
    options.ownerLocation,
    options.ownerBio,
    options.ownerCoords,
    options.limit ?? 6
  );

  if (ranked.length === 0) return [];

  const photos = await db.pet.findMany({
    where: {
      id: { in: ranked.map((pet) => pet.id) },
      isActive: true,
      owner: where.owner,
    },
    select: { id: true, images: true, thumbnailIndex: true },
  });
  const imagesByPet = new Map(photos.map((pet) => [pet.id, getPrimaryImageUrl(pet.images, pet.thumbnailIndex ?? 0)]));

  return ranked.filter((pet) => imagesByPet.has(pet.id)).map((pet) => ({ ...pet, image: imagesByPet.get(pet.id) ?? null }));
}
