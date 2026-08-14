import 'server-only';

import { db } from '@/lib/db';
import {
  parseMatchPreferences,
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
  images: true,
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
  const settings = await db.userSettings.findUnique({
    where: { userId: options.userId },
  });
  const preferences = parseMatchPreferences(settings);

  const [swipedPets, blockedRelations] = await Promise.all([
    db.swipe.findMany({
      where: { fromPetId: options.currentPet.id },
      select: { toPetId: true },
      take: 500,
    }),
    db.blockedUser.findMany({
      where: {
        OR: [{ blockerId: options.userId }, { blockedId: options.userId }],
      },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  const swipedPetIds = swipedPets
    .map((swipe) => swipe.toPetId)
    .filter((id): id is string => Boolean(id));
  const blockedUserIds = blockedRelations.map((relation) =>
    relation.blockerId === options.userId ? relation.blockedId : relation.blockerId
  );

  const candidates = (await db.pet.findMany({
    where: {
      isActive: true,
      id: { notIn: [...options.myPetIds, ...swipedPetIds] },
      ...(blockedUserIds.length > 0
        ? { owner: { userId: { notIn: blockedUserIds } } }
        : {}),
    },
    select: CANDIDATE_SELECT,
    take: 80,
  })) as MatchableCandidatePet[];

  return rankCandidates(
    options.currentPet,
    candidates,
    preferences,
    options.ownerLocation,
    options.ownerBio,
    options.ownerCoords,
    options.limit ?? 6
  );
}
