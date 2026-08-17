import 'server-only';

import { db } from '@/lib/db';
import {
  matchesFosterAlertPreferences,
  parseFosterList,
  scoreFosterCandidate,
} from '@/lib/foster';
import { parseImageUrls } from '@/lib/media';
import { createNotification, createNotificationBulk } from '@/lib/notifications';
import type { FosterAlertPreferencesData, RescueCasePublicationData } from '@/lib/schemas';
import { SOLIDARITY_CONSENT_VERSION, toGeneralZone } from '@/lib/rescue';
import { setCaseNeedStatus } from '@/lib/server/rescue-needs';

const OFFER_LIFETIME_MS = 24 * 60 * 60 * 1000;

export class FosterNetworkError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
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
  return new Set(blocks.map((block) => block.blockerId === userId ? block.blockedId : block.blockerId));
}

export async function publishRescueCase(
  caseId: string,
  userId: string,
  input: RescueCasePublicationData,
) {
  const rescueCase = await db.rescueCase.findUnique({
    where: { id: caseId },
    include: { communityPost: true },
  });
  if (!rescueCase) throw new FosterNetworkError('Caso no encontrado', 404);
  if (rescueCase.createdByUserId !== userId) throw new FosterNetworkError('No autorizado', 403);
  if (rescueCase.status === 'CANCELLED') throw new FosterNetworkError('Un caso cancelado no puede publicarse', 409);

  const caseImages = parseImageUrls(rescueCase.images);
  const selectedImage = caseImages[input.imageIndex] || caseImages[0];
  if (!selectedImage) throw new FosterNetworkError('El caso necesita al menos una foto', 409);
  const publicZone = toGeneralZone(input.publicZone);

  return db.$transaction(async (tx) => {
    const post = rescueCase.communityPost
      ? await tx.post.update({
          where: { id: rescueCase.communityPost.id },
          data: {
            content: input.summary,
            images: JSON.stringify([selectedImage]),
            location: publicZone,
            isVisible: true,
          },
        })
      : await tx.post.create({
          data: {
            authorId: userId,
            rescueCaseId: caseId,
            postType: 'foster_case',
            content: input.summary,
            images: JSON.stringify([selectedImage]),
            location: publicZone,
          },
        });

    await tx.rescueCaseEvent.create({
      data: {
        caseId,
        actorId: userId,
        type: rescueCase.communityPost ? 'COMMUNITY_PUBLICATION_UPDATED' : 'COMMUNITY_PUBLISHED',
        payload: { publicZone },
      },
    });
    return post;
  });
}

export async function unpublishRescueCase(caseId: string, userId: string) {
  const rescueCase = await db.rescueCase.findUnique({
    where: { id: caseId },
    include: { communityPost: true },
  });
  if (!rescueCase) throw new FosterNetworkError('Caso no encontrado', 404);
  if (rescueCase.createdByUserId !== userId) throw new FosterNetworkError('No autorizado', 403);
  if (!rescueCase.communityPost?.isVisible) return null;

  await db.$transaction([
    db.post.update({ where: { id: rescueCase.communityPost.id }, data: { isVisible: false } }),
    db.rescueCaseEvent.create({
      data: { caseId, actorId: userId, type: 'COMMUNITY_UNPUBLISHED' },
    }),
  ]);
  return rescueCase.communityPost.id;
}

export async function updateFosterAlertPreferences(userId: string, input: FosterAlertPreferencesData) {
  const profile = await db.fosterProfile.findUnique({ where: { userId } });
  if (!profile) throw new FosterNetworkError('Primero creá tu perfil de hogar de tránsito', 404);
  if (profile.status === 'SUSPENDED') throw new FosterNetworkError('El perfil está suspendido', 403);

  return db.$transaction(async (tx) => {
    const updated = await tx.fosterProfile.update({
      where: { id: profile.id },
      data: {
        caseAlertsEnabled: input.enabled,
        alertRadiusKm: input.radiusKm,
        alertSpecies: JSON.stringify(input.species),
        alertUrgencies: JSON.stringify(input.urgencies),
      },
    });
    const alertProfile = await tx.solidarityAlertProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        location: profile.location,
        latitude: profile.latitude,
        longitude: profile.longitude,
        locationConsentAt: profile.termsAcceptedAt,
        consentVersion: SOLIDARITY_CONSENT_VERSION,
      },
    });
    await tx.solidaritySubscription.upsert({
      where: { profileId_type: { profileId: alertProfile.id, type: 'FOSTER' } },
      update: {
        enabled: input.enabled,
        radiusKm: input.radiusKm,
        species: JSON.stringify(input.species),
        urgencies: JSON.stringify(input.urgencies),
      },
      create: {
        profileId: alertProfile.id,
        type: 'FOSTER',
        enabled: input.enabled,
        radiusKm: input.radiusKm,
        species: JSON.stringify(input.species),
        urgencies: JSON.stringify(input.urgencies),
      },
    });
    return updated;
  });
}

export async function notifySubscribedFosters(caseId: string) {
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
    where: {
      status: 'ACTIVE',
      caseAlertsEnabled: true,
      userId: { not: rescueCase.createdByUserId },
      user: { syntheticRunId: rescueCase.createdBy.syntheticRunId },
    },
    take: 500,
  });
  const blocked = await blockedUserIds(rescueCase.createdByUserId, profiles.map((profile) => profile.userId));
  const offered = new Set(rescueCase.offers.map((offer) => offer.fosterProfileId));

  const eligible = profiles.flatMap((profile) => {
    if (blocked.has(profile.userId) || offered.has(profile.id)) return [];
    const candidate = scoreFosterCandidate(rescueCase, profile);
    if (!candidate || !matchesFosterAlertPreferences(rescueCase, profile, candidate.distanceKm)) return [];
    return [{ profile, candidate }];
  });

  if (eligible.length === 0) return 0;
  const recipientIds = eligible.map(({ profile }) => profile.userId);
  await createNotificationBulk(
    recipientIds,
    rescueCase.createdByUserId,
    'FOSTER_CASE_ALERT',
    'Nuevo caso cerca de tu hogar',
    `${rescueCase.species === 'dog' ? 'Perro' : rescueCase.species === 'cat' ? 'Gato' : 'Animal'} ${rescueCase.urgency === 'CRITICAL' ? 'en situación crítica' : 'necesita tránsito'}`,
    `/hogares-de-transito/casos/${rescueCase.id}`,
    rescueCase.id,
    `foster-case-alert:${rescueCase.id}`,
  );
  return eligible.length;
}

export async function expressFosterInterest(caseId: string, userId: string) {
  const [rescueCase, profile] = await Promise.all([
    db.rescueCase.findUnique({
      where: { id: caseId },
      include: {
        communityPost: true,
        needs: { where: { type: 'FOSTER' }, select: { status: true } },
        createdBy: { select: { syntheticRunId: true } },
      },
    }),
    db.fosterProfile.findUnique({ where: { userId }, include: { user: { select: { syntheticRunId: true } } } }),
  ]);
  if (!rescueCase) throw new FosterNetworkError('Caso no encontrado', 404);
  if (profile && profile.user.syntheticRunId !== rescueCase.createdBy.syntheticRunId) {
    throw new FosterNetworkError('Caso no encontrado', 404);
  }
  if (!rescueCase.needs.some((need) => ['OPEN', 'INTERESTED'].includes(need.status))) {
    throw new FosterNetworkError('El caso ya no está recibiendo hogares', 409);
  }
  if (!profile || profile.status !== 'ACTIVE') {
    throw new FosterNetworkError('Necesitás un perfil de hogar activo', 403);
  }

  const blocked = await blockedUserIds(rescueCase.createdByUserId, [userId]);
  if (blocked.has(userId)) throw new FosterNetworkError('No podés participar en este caso', 403);
  const candidate = scoreFosterCandidate(rescueCase, profile);
  if (!candidate) throw new FosterNetworkError('Tu perfil no es compatible con este caso o está fuera del radio', 409);

  const existing = await db.fosterOffer.findUnique({
    where: { rescueCaseId_fosterProfileId: { rescueCaseId: caseId, fosterProfileId: profile.id } },
  });
  const canDiscover = Boolean(
    existing
    || rescueCase.communityPost?.isVisible
    || matchesFosterAlertPreferences(rescueCase, profile, candidate.distanceKm),
  );
  if (!canDiscover) throw new FosterNetworkError('Este caso no está disponible para tu hogar', 403);
  if (existing?.status === 'SELECTED') return existing;
  if (existing?.status === 'CLOSED') throw new FosterNetworkError('Esta oferta ya fue cerrada', 409);

  const offer = await db.$transaction(async (tx) => {
    const saved = existing
      ? await tx.fosterOffer.update({
          where: { id: existing.id },
          data: {
            status: 'INTERESTED',
            distanceKm: candidate.distanceKm,
            score: candidate.score,
            reasons: JSON.stringify(candidate.reasons),
            respondedAt: new Date(),
            expiresAt: new Date(Date.now() + OFFER_LIFETIME_MS),
          },
        })
      : await tx.fosterOffer.create({
          data: {
            rescueCaseId: caseId,
            fosterProfileId: profile.id,
            status: 'INTERESTED',
            distanceKm: candidate.distanceKm,
            score: candidate.score,
            reasons: JSON.stringify(candidate.reasons),
            respondedAt: new Date(),
            expiresAt: new Date(Date.now() + OFFER_LIFETIME_MS),
          },
        });
    const transition = await setCaseNeedStatus(tx, caseId, 'FOSTER', 'INTERESTED');
    await tx.rescueCaseEvent.upsert({
      where: { eventKey: `foster-interest:${caseId}:${profile.id}` },
      update: {},
      create: {
        caseId,
        actorId: userId,
        type: 'FOSTER_INTERESTED',
        fromStatus: rescueCase.status,
        toStatus: transition?.caseStatus || rescueCase.status,
        eventKey: `foster-interest:${caseId}:${profile.id}`,
        payload: { distanceKm: candidate.distanceKm, score: candidate.score },
      },
    });
    return saved;
  });

  await createNotification({
    userId: rescueCase.createdByUserId,
    actorId: userId,
    type: 'FOSTER_RESPONSE',
    title: 'Un hogar puede ayudar',
    body: 'Revisá el perfil y elegí si querés coordinar la entrega.',
    link: `/hogares-de-transito/casos/${caseId}`,
    entityId: offer.id,
    dedupeKey: `foster-interest:${offer.id}`,
  });
  return offer;
}

export function serializeAlertPreferences(profile: {
  caseAlertsEnabled: boolean;
  alertRadiusKm: number;
  alertSpecies: string;
  alertUrgencies: string;
}) {
  return {
    enabled: profile.caseAlertsEnabled,
    radiusKm: profile.alertRadiusKm,
    species: parseFosterList(profile.alertSpecies),
    urgencies: parseFosterList(profile.alertUrgencies),
  };
}
