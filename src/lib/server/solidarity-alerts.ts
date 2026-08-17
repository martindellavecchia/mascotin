import 'server-only';

import type { SolidarityAlertType } from '@prisma/client';
import { db } from '@/lib/db';
import { createNotificationBulk } from '@/lib/notifications';
import { matchesSolidaritySubscription, toGeneralZone } from '@/lib/rescue';

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
  return new Set(blocks.map((block) => block.blockerId === userId ? block.blockedId : block.blockerId));
}

async function compatibleSubscribers(input: {
  type: SolidarityAlertType;
  actorId: string;
  syntheticRunId: string | null;
  species: string;
  size?: string | null;
  urgency?: string | null;
  latitude: number;
  longitude: number;
}) {
  const subscriptions = await db.solidaritySubscription.findMany({
    where: {
      type: input.type,
      enabled: true,
      profile: {
        userId: { not: input.actorId },
        user: { syntheticRunId: input.syntheticRunId },
      },
    },
    include: { profile: true },
    take: 1000,
  });
  const blocked = await blockedUserIds(input.actorId, subscriptions.map((subscription) => subscription.profile.userId));
  return subscriptions
    .filter((subscription) => !blocked.has(subscription.profile.userId))
    .filter((subscription) => matchesSolidaritySubscription(input, {
      type: subscription.type,
      enabled: subscription.enabled,
      radiusKm: subscription.radiusKm,
      species: subscription.species,
      sizes: subscription.sizes,
      urgencies: subscription.urgencies,
      latitude: subscription.profile.latitude,
      longitude: subscription.profile.longitude,
    }))
    .map((subscription) => subscription.profile.userId);
}

export async function notifySolidaritySubscribersForCase(caseId: string) {
  const rescueCase = await db.rescueCase.findUnique({
    where: { id: caseId },
    include: {
      needs: { select: { type: true, status: true } },
      createdBy: { select: { syntheticRunId: true } },
      communityPost: { select: { location: true, isVisible: true } },
    },
  });
  if (!rescueCase || rescueCase.status === 'CANCELLED') return 0;
  const categories: SolidarityAlertType[] = [];
  if (rescueCase.needs.some((need) => need.type === 'FOSTER' && ['OPEN', 'INTERESTED'].includes(need.status))) categories.push('FOSTER');
  if (rescueCase.needs.some((need) => need.type === 'VETERINARY' && ['OPEN', 'INTERESTED'].includes(need.status))) categories.push('VETERINARY');

  let notified = 0;
  for (const type of categories) {
    const recipients = await compatibleSubscribers({
      type,
      actorId: rescueCase.createdByUserId,
      syntheticRunId: rescueCase.createdBy.syntheticRunId,
      species: rescueCase.species,
      size: rescueCase.size,
      urgency: rescueCase.urgency,
      latitude: rescueCase.latitude,
      longitude: rescueCase.longitude,
    });
    if (recipients.length === 0) continue;
    await createNotificationBulk(
      recipients,
      rescueCase.createdByUserId,
      type === 'FOSTER' ? 'FOSTER_CASE_ALERT' : 'SOLIDARITY_VETERINARY_ALERT',
      type === 'FOSTER' ? 'Una mascota necesita tránsito cerca tuyo' : 'Hay una urgencia veterinaria cerca tuyo',
      type === 'FOSTER' ? 'Revisá el caso y ofrecé tu hogar si podés ayudar.' : 'Podés acompañar el caso sin asumir gastos ni decisiones médicas.',
      `/hogares-de-transito/casos/${rescueCase.id}`,
      rescueCase.id,
      `solidarity:${type.toLowerCase()}:${rescueCase.id}`,
      { zone: rescueCase.communityPost?.isVisible ? toGeneralZone(rescueCase.communityPost.location) : 'Cerca de tu zona' },
      false,
    );
    notified += recipients.length;
  }
  return notified;
}

export async function notifySolidaritySubscribersForAdoption(listingId: string) {
  const listing = await db.adoptionListing.findUnique({
    where: { id: listingId },
    include: {
      pet: { select: { petType: true, size: true } },
      listedBy: { select: { syntheticRunId: true } },
    },
  });
  if (!listing || listing.status !== 'OPEN' || listing.latitude === null || listing.longitude === null) return 0;
  const recipients = await compatibleSubscribers({
    type: 'ADOPTION',
    actorId: listing.listedByUserId,
    syntheticRunId: listing.listedBy.syntheticRunId,
    species: listing.pet.petType,
    size: listing.pet.size,
    latitude: listing.latitude,
    longitude: listing.longitude,
  });
  if (recipients.length === 0) return 0;
  await createNotificationBulk(
    recipients,
    listing.listedByUserId,
    'SOLIDARITY_ADOPTION_ALERT',
    'Hay una mascota en adopción cerca tuyo',
    'Conocé su ficha y postuláte si tu hogar es compatible.',
    `/adoptions/${listing.id}`,
    listing.id,
    `solidarity:adoption:${listing.id}`,
    { zone: toGeneralZone(listing.location) },
    false,
  );
  return recipients.length;
}
