import 'server-only';

import { db } from '@/lib/db';
import {
  MAX_FOSTER_OFFERS,
  rankFosterCandidates,
  scoreFosterCandidate,
} from '@/lib/foster';
import { createNotification } from '@/lib/notifications';
import { setCaseNeedStatus } from '@/lib/server/rescue-needs';

const OFFER_LIFETIME_MS = 24 * 60 * 60 * 1000;

function expiresAt() {
  return new Date(Date.now() + OFFER_LIFETIME_MS);
}
export async function expireFosterOffers(): Promise<number> {
  const expired = await db.fosterOffer.findMany({
    where: { status: { in: ['PENDING', 'INTERESTED'] }, expiresAt: { lt: new Date() } },
    select: { id: true, rescueCaseId: true, status: true },
  });
  if (expired.length === 0) return 0;
  const caseIds = [...new Set(expired.map((offer) => offer.rescueCaseId))];
  return db.$transaction(async (tx) => {
    const result = await tx.fosterOffer.updateMany({
      where: { id: { in: expired.map((offer) => offer.id) }, status: { in: ['PENDING', 'INTERESTED'] } },
      data: { status: 'EXPIRED' },
    });
    for (const caseId of caseIds) {
      const [remaining, placement, fosterNeed] = await Promise.all([
        tx.fosterOffer.count({ where: { rescueCaseId: caseId, status: { in: ['INTERESTED', 'SELECTED'] } } }),
        tx.fosterPlacement.count({ where: { rescueCaseId: caseId, status: { in: ['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'] } } }),
        tx.rescueNeed.findUnique({ where: { rescueCaseId_type: { rescueCaseId: caseId, type: 'FOSTER' } }, select: { status: true } }),
      ]);
      if (fosterNeed?.status === 'INTERESTED' && remaining === 0 && placement === 0) {
        await setCaseNeedStatus(tx, caseId, 'FOSTER', 'OPEN');
      }
    }
    return result.count;
  });
}

async function blockedUserIds(userId: string, candidateUserIds: string[]) {
  if (candidateUserIds.length === 0) return new Set<string>();

  const blocks = await db.blockedUser.findMany({
    where: {
      OR: [
        { blockerId: userId, blockedId: { in: candidateUserIds } },
        { blockedId: userId, blockerId: { in: candidateUserIds } },
      ],
    },
    select: { blockerId: true, blockedId: true },
  });

  return new Set(
    blocks.map((block) => block.blockerId === userId ? block.blockedId : block.blockerId)
  );
}

export async function createOffersForCase(caseId: string): Promise<number> {
  const rescueCase = await db.rescueCase.findUnique({
    where: { id: caseId },
    include: {
      offers: { select: { fosterProfileId: true } },
      needs: { where: { type: 'FOSTER' }, select: { status: true } },
      createdBy: { select: { syntheticRunId: true } },
    },
  });

  if (!rescueCase || !rescueCase.needs.some((need) => ['OPEN', 'INTERESTED'].includes(need.status))) return 0;

  const profiles = await db.fosterProfile.findMany({
    where: { status: 'ACTIVE', user: { syntheticRunId: rescueCase.createdBy.syntheticRunId } },
    take: 200,
  });
  const blocked = await blockedUserIds(
    rescueCase.createdByUserId,
    profiles.map((profile) => profile.userId)
  );
  const alreadyOffered = new Set(rescueCase.offers.map((offer) => offer.fosterProfileId));
  const ranked = rankFosterCandidates(
    rescueCase,
    profiles.filter(
      (profile) => !blocked.has(profile.userId) && !alreadyOffered.has(profile.id)
    )
  );

  if (ranked.length === 0) return 0;

  const rankedById = new Map(ranked.map((candidate) => [candidate.profileId, candidate]));
  const recipients = profiles.filter((profile) => rankedById.has(profile.id));
  const expiration = expiresAt();

  await db.$transaction([
    db.fosterOffer.createMany({
      data: ranked.map((candidate) => ({
        rescueCaseId: rescueCase.id,
        fosterProfileId: candidate.profileId,
        distanceKm: candidate.distanceKm,
        score: candidate.score,
        reasons: JSON.stringify(candidate.reasons),
        expiresAt: expiration,
      })),
      skipDuplicates: true,
    }),
    db.rescueCaseEvent.create({
      data: {
        caseId: rescueCase.id,
        actorId: rescueCase.createdByUserId,
        type: 'MATCHING_RUN',
        details: JSON.stringify({ radiusKm: rescueCase.searchRadiusKm, offers: ranked.length }),
      },
    }),
  ]);

  await Promise.allSettled(
    recipients.map((profile) =>
      createNotification({
        userId: profile.userId,
        actorId: rescueCase.createdByUserId,
        type: 'FOSTER_OFFER',
        title: 'Una mascota necesita tránsito cerca tuyo',
        body: `Caso compatible a menos de ${rescueCase.searchRadiusKm} km`,
        link: '/hogares-de-transito?view=offers',
        entityId: rescueCase.id,
      })
    )
  );

  return ranked.length;
}

export async function createOffersForProfile(profileId: string): Promise<number> {
  const profile = await db.fosterProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { syntheticRunId: true } } },
  });
  if (!profile || profile.status !== 'ACTIVE' || profile.occupiedSlots >= profile.capacity) return 0;

  const pendingCount = await db.fosterOffer.count({
    where: { fosterProfileId: profile.id, status: 'PENDING', expiresAt: { gt: new Date() } },
  });
  const availableOffers = Math.max(0, MAX_FOSTER_OFFERS - pendingCount);
  if (availableOffers === 0) return 0;

  const cases = await db.rescueCase.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'RESOLVED', 'NEEDS_ADOPTION'] },
      createdByUserId: { not: profile.userId },
      offers: { none: { fosterProfileId: profile.id } },
      needs: { some: { type: 'FOSTER', status: { in: ['OPEN', 'INTERESTED'] } } },
      createdBy: { syntheticRunId: profile.user.syntheticRunId },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const blocked = await blockedUserIds(
    profile.userId,
    cases.map((rescueCase) => rescueCase.createdByUserId)
  );
  const matches = cases
    .filter((rescueCase) => !blocked.has(rescueCase.createdByUserId))
    .map((rescueCase) => ({
      rescueCase,
      candidate: scoreFosterCandidate(rescueCase, profile),
    }))
    .filter((match): match is typeof match & { candidate: NonNullable<typeof match.candidate> } => match.candidate !== null)
    .sort((left, right) => right.candidate.score - left.candidate.score || left.candidate.distanceKm - right.candidate.distanceKm)
    .slice(0, availableOffers);

  if (matches.length === 0) return 0;

  await db.fosterOffer.createMany({
    data: matches.map(({ rescueCase, candidate }) => ({
      rescueCaseId: rescueCase.id,
      fosterProfileId: profile.id,
      distanceKm: candidate.distanceKm,
      score: candidate.score,
      reasons: JSON.stringify(candidate.reasons),
      expiresAt: expiresAt(),
    })),
    skipDuplicates: true,
  });

  await Promise.allSettled(
    matches.map(({ rescueCase }) =>
      createNotification({
        userId: profile.userId,
        actorId: rescueCase.createdByUserId,
        type: 'FOSTER_OFFER',
        title: 'Una mascota necesita tránsito cerca tuyo',
        body: `Caso compatible a menos de ${rescueCase.searchRadiusKm} km`,
        link: '/hogares-de-transito?view=offers',
        entityId: rescueCase.id,
      })
    )
  );

  return matches.length;
}
