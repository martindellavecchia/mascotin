import 'server-only';

import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { parseMatchPreferences } from '@/lib/matching';
import { VISIBLE_PROFILE_USER_FILTER } from '@/lib/server/profile-visibility';

export const DISCOVERY_CANDIDATE_LIMIT = 50;
export const DISCOVERY_CANDIDATE_ORDER = [{ createdAt: 'desc' }, { id: 'asc' }] satisfies Prisma.PetOrderByWithRelationInput[];

export async function getPetDiscoveryQuery(options: {
  userId: string;
  currentPet: { id: string; petType: string };
  myPetIds?: string[];
  petType?: string | null;
  location?: string | null;
}) {
  const [settings, viewer, swipes, blockedRelations] = await Promise.all([
    db.userSettings.findUnique({ where: { userId: options.userId } }),
    db.user.findUnique({ where: { id: options.userId }, select: { syntheticRunId: true } }),
    db.swipe.findMany({
      where: { fromPetId: options.currentPet.id, undoneAt: null },
      select: { toPetId: true },
    }),
    db.blockedUser.findMany({
      where: { OR: [{ blockerId: options.userId }, { blockedId: options.userId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);
  const preferences = parseMatchPreferences(settings);
  const swipedIds = swipes.map((swipe) => swipe.toPetId).filter((id): id is string => Boolean(id));
  const blockedIds = blockedRelations.map((relation) =>
    relation.blockerId === options.userId ? relation.blockedId : relation.blockerId
  );
  const where: Prisma.PetWhereInput = {
    isActive: true,
    id: { notIn: [...(options.myPetIds ?? [options.currentPet.id]), ...swipedIds] },
    petType: options.petType || (preferences.matchPetTypes.length > 0
      ? { in: preferences.matchPetTypes }
      : options.currentPet.petType),
    location: options.location || undefined,
    size: preferences.matchPetSizes.length > 0 ? { in: preferences.matchPetSizes } : undefined,
    owner: {
      userId: { not: options.userId, notIn: blockedIds },
      user: { syntheticRunId: viewer?.syntheticRunId || null, ...VISIBLE_PROFILE_USER_FILTER },
    },
  };
  return { where, preferences };
}
