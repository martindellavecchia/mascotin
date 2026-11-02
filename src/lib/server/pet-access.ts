import 'server-only';

import { db } from '@/lib/db';
import { VISIBLE_PROFILE_USER_FILTER } from '@/lib/server/profile-visibility';

export async function getBlockedRelationUserIds(userId: string) {
  const relations = await db.blockedUser.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return relations.map((relation) =>
    relation.blockerId === userId ? relation.blockedId : relation.blockerId
  );
}

export async function canViewPublicPet(viewerId: string, petId: string) {
  const viewer = await db.user.findUnique({
    where: { id: viewerId },
    select: { syntheticRunId: true },
  });
  const pet = await db.pet.findFirst({
    where: {
      id: petId,
      owner: {
        user: {
          syntheticRunId: viewer?.syntheticRunId ?? null,
          isBlocked: false,
          blockedUsers: { none: { blockedId: viewerId } },
          blockedByUsers: { none: { blockerId: viewerId } },
        },
      },
      OR: [
        { owner: { user: VISIBLE_PROFILE_USER_FILTER } },
        { adoptionListings: { some: { status: { in: ['OPEN', 'PENDING'] } } } },
      ],
    },
    select: { id: true },
  });
  return Boolean(pet);
}
