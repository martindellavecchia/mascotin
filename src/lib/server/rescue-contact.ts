import 'server-only';

import { Prisma, type RescueNeedType } from '@prisma/client';
import { db } from '@/lib/db';
import {
  matchesFosterAlertPreferences,
  normalizeFosterRadius,
  parseFosterList,
  scoreFosterCandidate,
} from '@/lib/foster';
import { haversineKm, toGeoPoint } from '@/lib/geo';
import { createNotification } from '@/lib/notifications';
import { RESCUE_NEED_LABELS, toGeneralZone } from '@/lib/rescue';
import type { RescueInterestData } from '@/lib/schemas';
import { setCaseNeedStatus, setRescueNeedStatus } from '@/lib/server/rescue-needs';
import {
  scoreVolunteerCandidate,
  VOLUNTEER_OFFER_LIFETIME_MS,
} from '@/lib/volunteer';

const FOSTER_OFFER_LIFETIME_MS = 24 * 60 * 60 * 1000;
const OPEN_NEED_STATUSES = ['OPEN', 'INTERESTED'] as const;

export type RescueContactKind = 'FOSTER' | 'VOLUNTEER';
export type ContactEligibilityCode =
  | 'ELIGIBLE'
  | 'PROFILE_REQUIRED'
  | 'PROFILE_UPDATE_REQUIRED'
  | 'NO_CAPACITY'
  | 'OUT_OF_RADIUS'
  | 'CASE_CLOSED'
  | 'NOT_ELIGIBLE';

export interface RescueContactOption {
  needId: string;
  needType: RescueNeedType;
  status: string;
  canContact: boolean;
  code: ContactEligibilityCode;
  existingContact: {
    kind: RescueContactKind;
    offerId: string;
    status: string;
    expiresAt: Date;
  } | null;
}

export class RescueContactError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: ContactEligibilityCode,
  ) {
    super(message);
  }
}

function eligibilityMessage(code: ContactEligibilityCode) {
  switch (code) {
    case 'PROFILE_REQUIRED':
      return 'Necesitás crear el perfil correspondiente para ayudar';
    case 'NO_CAPACITY':
      return 'Tu perfil no tiene cupo disponible en este momento';
    case 'OUT_OF_RADIUS':
      return 'El caso está fuera del radio configurado en tu perfil';
    case 'CASE_CLOSED':
      return 'Esta necesidad ya no está recibiendo ayuda';
    case 'PROFILE_UPDATE_REQUIRED':
      return 'Actualizá tu perfil, disponibilidad o tipos de ayuda para participar';
    default:
      return 'No podés participar en este caso';
  }
}

function fosterOutOfRadius(rescueCase: {
  latitude: number;
  longitude: number;
  searchRadiusKm: number;
}, profile: { latitude: number; longitude: number; radiusKm: number }) {
  const origin = toGeoPoint(rescueCase.latitude, rescueCase.longitude);
  const destination = toGeoPoint(profile.latitude, profile.longitude);
  if (!origin || !destination) return false;
  const radius = Math.min(
    normalizeFosterRadius(rescueCase.searchRadiusKm),
    normalizeFosterRadius(profile.radiusKm),
  );
  return haversineKm(origin, destination) > radius;
}

function volunteerOutOfRadius(rescueCase: {
  latitude: number;
  longitude: number;
  searchRadiusKm: number;
}, profile: { latitude: number; longitude: number; radiusKm: number }) {
  const origin = toGeoPoint(rescueCase.latitude, rescueCase.longitude);
  const destination = toGeoPoint(profile.latitude, profile.longitude);
  if (!origin || !destination) return false;
  const radius = Math.min(
    Math.max(1, Math.min(50, rescueCase.searchRadiusKm)),
    Math.max(1, Math.min(50, profile.radiusKm)),
  );
  return haversineKm(origin, destination) > radius;
}

async function hasBlockedRelationship(firstUserId: string, secondUserId: string) {
  return Boolean(await db.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: firstUserId, blockedId: secondUserId },
        { blockerId: secondUserId, blockedId: firstUserId },
      ],
    },
    select: { id: true },
  }));
}

export async function getRescueContactOptions(caseId: string, userId: string): Promise<RescueContactOption[]> {
  const [rescueCase, viewer, fosterProfile, volunteerProfile] = await Promise.all([
    db.rescueCase.findUnique({
      where: { id: caseId },
      include: {
        createdBy: { select: { syntheticRunId: true } },
        offers: { select: { id: true, fosterProfileId: true, status: true, expiresAt: true } },
        needs: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          include: {
            volunteerOffers: { select: { id: true, volunteerProfileId: true, status: true, expiresAt: true } },
          },
        },
      },
    }),
    db.user.findUnique({ where: { id: userId }, select: { syntheticRunId: true } }),
    db.fosterProfile.findUnique({ where: { userId } }),
    db.volunteerProfile.findUnique({ where: { userId } }),
  ]);

  if (!rescueCase || !viewer || viewer.syntheticRunId !== rescueCase.createdBy.syntheticRunId) return [];
  const restricted = rescueCase.createdByUserId === userId
    || await hasBlockedRelationship(rescueCase.createdByUserId, userId);

  return rescueCase.needs
    .filter((need) => OPEN_NEED_STATUSES.includes(need.status as (typeof OPEN_NEED_STATUSES)[number]))
    .map((need) => {
      if (need.type === 'FOSTER') {
      const existing = fosterProfile
        ? rescueCase.offers.find((offer) => offer.fosterProfileId === fosterProfile.id)
        : null;
      if (restricted) {
        return { needId: need.id, needType: need.type, status: need.status, canContact: false, code: 'NOT_ELIGIBLE', existingContact: null };
      }
      const existingContact = existing && ['INTERESTED', 'SELECTED'].includes(existing.status)
        ? { kind: 'FOSTER' as const, offerId: existing.id, status: existing.status, expiresAt: existing.expiresAt }
        : null;
      if (existingContact) {
        return { needId: need.id, needType: need.type, status: need.status, canContact: true, code: 'ELIGIBLE', existingContact };
      }
      let code: ContactEligibilityCode = 'ELIGIBLE';
      if (!fosterProfile) code = 'PROFILE_REQUIRED';
      else if (existing?.status === 'CLOSED') code = 'CASE_CLOSED';
      else if (fosterProfile.status !== 'ACTIVE') code = 'PROFILE_UPDATE_REQUIRED';
      else if (fosterProfile.occupiedSlots >= fosterProfile.capacity) code = 'NO_CAPACITY';
      else if (fosterOutOfRadius(rescueCase, fosterProfile)) code = 'OUT_OF_RADIUS';
      else if (!scoreFosterCandidate(rescueCase, fosterProfile)) code = 'PROFILE_UPDATE_REQUIRED';
      return { needId: need.id, needType: need.type, status: need.status, canContact: code === 'ELIGIBLE', code, existingContact: null };
      }

      const existing = volunteerProfile
        ? need.volunteerOffers.find((offer) => offer.volunteerProfileId === volunteerProfile.id)
        : null;
      if (restricted) {
        return { needId: need.id, needType: need.type, status: need.status, canContact: false, code: 'NOT_ELIGIBLE', existingContact: null };
      }
      const existingContact = existing && ['INTERESTED', 'SELECTED'].includes(existing.status)
        ? { kind: 'VOLUNTEER' as const, offerId: existing.id, status: existing.status, expiresAt: existing.expiresAt }
        : null;
      if (existingContact) {
        return { needId: need.id, needType: need.type, status: need.status, canContact: true, code: 'ELIGIBLE', existingContact };
      }
      let code: ContactEligibilityCode = 'ELIGIBLE';
      if (!volunteerProfile) code = 'PROFILE_REQUIRED';
      else if (existing?.status === 'CLOSED') code = 'CASE_CLOSED';
      else if (volunteerProfile.status !== 'ACTIVE') code = 'PROFILE_UPDATE_REQUIRED';
      else if (volunteerProfile.occupiedTasks >= volunteerProfile.maxConcurrentTasks) code = 'NO_CAPACITY';
      else if (volunteerOutOfRadius(rescueCase, volunteerProfile)) code = 'OUT_OF_RADIUS';
      else if (!scoreVolunteerCandidate({
        createdByUserId: rescueCase.createdByUserId,
        type: need.type,
        latitude: rescueCase.latitude,
        longitude: rescueCase.longitude,
        searchRadiusKm: rescueCase.searchRadiusKm,
      }, volunteerProfile)) code = 'PROFILE_UPDATE_REQUIRED';
      return { needId: need.id, needType: need.type, status: need.status, canContact: code === 'ELIGIBLE', code, existingContact: null };
    });
}

function contactResponse(kind: RescueContactKind, offer: { id: string; status: string; expiresAt: Date }) {
  return { kind, offerId: offer.id, status: offer.status, expiresAt: offer.expiresAt };
}

async function notifyContactOpened(input: {
  kind: RescueContactKind;
  caseId: string;
  needType: RescueNeedType;
  offerId: string;
  actorId: string;
  recipientId: string;
  location: string;
  respondedAt: Date;
}) {
  const kindParam = input.kind === 'FOSTER' ? 'foster' : 'volunteer';
  await createNotification({
    userId: input.recipientId,
    actorId: input.actorId,
    type: input.kind === 'FOSTER' ? 'FOSTER_RESPONSE' : 'VOLUNTEER_RESPONSE',
    title: input.kind === 'FOSTER' ? 'Un hogar quiere ayudar' : 'Una persona quiere ayudar',
    body: 'Revisá el perfil y conversen antes de confirmar la coordinación.',
    link: `/hogares-de-transito/casos/${input.caseId}?contact=1&kind=${kindParam}&offer=${input.offerId}`,
    entityId: input.offerId,
    dedupeKey: `wall-contact:${kindParam}:${input.offerId}:${input.respondedAt.getTime()}`,
    pushContext: { zone: toGeneralZone(input.location), helpType: RESCUE_NEED_LABELS[input.needType] },
  });
}

async function expressFosterWallInterest(
  rescueCase: NonNullable<Awaited<ReturnType<typeof loadContactCase>>>,
  userId: string,
  message?: string,
) {
  const profile = await db.fosterProfile.findUnique({
    where: { userId },
    include: { user: { select: { syntheticRunId: true } } },
  });
  if (!profile) throw new RescueContactError(eligibilityMessage('PROFILE_REQUIRED'), 403, 'PROFILE_REQUIRED');
  if (profile.user.syntheticRunId !== rescueCase.createdBy.syntheticRunId) {
    throw new RescueContactError('Caso no encontrado', 404, 'NOT_ELIGIBLE');
  }
  const existing = await db.fosterOffer.findUnique({
    where: { rescueCaseId_fosterProfileId: { rescueCaseId: rescueCase.id, fosterProfileId: profile.id } },
  });
  if (existing && ['INTERESTED', 'SELECTED'].includes(existing.status)) return contactResponse('FOSTER', existing);
  if (existing?.status === 'CLOSED') throw new RescueContactError('Este contacto fue cerrado', 409, 'CASE_CLOSED');
  if (profile.status !== 'ACTIVE') throw new RescueContactError(eligibilityMessage('PROFILE_UPDATE_REQUIRED'), 409, 'PROFILE_UPDATE_REQUIRED');
  if (profile.occupiedSlots >= profile.capacity) throw new RescueContactError(eligibilityMessage('NO_CAPACITY'), 409, 'NO_CAPACITY');
  if (fosterOutOfRadius(rescueCase, profile)) throw new RescueContactError(eligibilityMessage('OUT_OF_RADIUS'), 409, 'OUT_OF_RADIUS');
  const candidate = scoreFosterCandidate(rescueCase, profile);
  if (!candidate) throw new RescueContactError(eligibilityMessage('PROFILE_UPDATE_REQUIRED'), 409, 'PROFILE_UPDATE_REQUIRED');

  const canDiscover = Boolean(
    existing
    || rescueCase.communityPost?.isVisible
    || matchesFosterAlertPreferences(rescueCase, profile, candidate.distanceKm),
  );
  if (!canDiscover) throw new RescueContactError('Este caso no está disponible para tu hogar', 403, 'NOT_ELIGIBLE');
  const now = new Date();
  try {
    const result = await db.$transaction(async (tx) => {
      let transitioned = true;
      let offer;
      if (existing) {
        const claimed = await tx.fosterOffer.updateMany({
          where: { id: existing.id, status: { in: ['PENDING', 'DECLINED', 'EXPIRED'] } },
          data: {
            status: 'INTERESTED',
            source: 'WALL',
            distanceKm: candidate.distanceKm,
            score: candidate.score,
            reasons: JSON.stringify(candidate.reasons),
            respondedAt: now,
            expiresAt: new Date(now.getTime() + FOSTER_OFFER_LIFETIME_MS),
          },
        });
        if (claimed.count === 0) transitioned = false;
        offer = await tx.fosterOffer.findUniqueOrThrow({ where: { id: existing.id } });
      } else {
        offer = await tx.fosterOffer.create({
          data: {
            rescueCaseId: rescueCase.id,
            fosterProfileId: profile.id,
            status: 'INTERESTED',
            source: 'WALL',
            distanceKm: candidate.distanceKm,
            score: candidate.score,
            reasons: JSON.stringify(candidate.reasons),
            respondedAt: now,
            expiresAt: new Date(now.getTime() + FOSTER_OFFER_LIFETIME_MS),
          },
        });
      }
      if (!transitioned) return { offer, transitioned };
      const transition = await setCaseNeedStatus(tx, rescueCase.id, 'FOSTER', 'INTERESTED');
      await tx.rescueCaseEvent.create({
        data: {
          caseId: rescueCase.id,
          actorId: userId,
          type: 'FOSTER_CONTACT_OPENED',
          fromStatus: rescueCase.status,
          toStatus: transition?.caseStatus || rescueCase.status,
          eventKey: `foster-wall-contact:${offer.id}:${now.getTime()}`,
          payload: { offerId: offer.id, distanceKm: candidate.distanceKm, source: 'WALL' },
        },
      });
      if (message) {
        await tx.message.create({
          data: { fosterOfferId: offer.id, senderId: userId, receiverId: rescueCase.createdByUserId, content: message },
        });
      }
      return { offer, transitioned };
    });

    if (result.transitioned) {
      await notifyContactOpened({
        kind: 'FOSTER',
        caseId: rescueCase.id,
        needType: 'FOSTER',
        offerId: result.offer.id,
        actorId: userId,
        recipientId: rescueCase.createdByUserId,
        location: rescueCase.location,
        respondedAt: result.offer.respondedAt || now,
      });
    }
    return contactResponse('FOSTER', result.offer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await db.fosterOffer.findUniqueOrThrow({
        where: { rescueCaseId_fosterProfileId: { rescueCaseId: rescueCase.id, fosterProfileId: profile.id } },
      });
      return contactResponse('FOSTER', concurrent);
    }
    throw error;
  }
}

async function expressVolunteerWallInterest(
  rescueCase: NonNullable<Awaited<ReturnType<typeof loadContactCase>>>,
  needType: Exclude<RescueNeedType, 'FOSTER'>,
  userId: string,
  message?: string,
) {
  const need = rescueCase.needs.find((item) => item.type === needType);
  if (!need || !OPEN_NEED_STATUSES.includes(need.status as (typeof OPEN_NEED_STATUSES)[number])) {
    throw new RescueContactError(eligibilityMessage('CASE_CLOSED'), 409, 'CASE_CLOSED');
  }
  const profile = await db.volunteerProfile.findUnique({
    where: { userId },
    include: { user: { select: { syntheticRunId: true } } },
  });
  if (!profile) throw new RescueContactError(eligibilityMessage('PROFILE_REQUIRED'), 403, 'PROFILE_REQUIRED');
  if (profile.user.syntheticRunId !== rescueCase.createdBy.syntheticRunId) {
    throw new RescueContactError('Caso no encontrado', 404, 'NOT_ELIGIBLE');
  }
  const existing = await db.volunteerOffer.findUnique({
    where: { needId_volunteerProfileId: { needId: need.id, volunteerProfileId: profile.id } },
  });
  if (existing && ['INTERESTED', 'SELECTED'].includes(existing.status)) return contactResponse('VOLUNTEER', existing);
  if (existing?.status === 'CLOSED') throw new RescueContactError('Este contacto fue cerrado', 409, 'CASE_CLOSED');
  if (profile.status !== 'ACTIVE') throw new RescueContactError(eligibilityMessage('PROFILE_UPDATE_REQUIRED'), 409, 'PROFILE_UPDATE_REQUIRED');
  if (profile.occupiedTasks >= profile.maxConcurrentTasks) throw new RescueContactError(eligibilityMessage('NO_CAPACITY'), 409, 'NO_CAPACITY');
  if (volunteerOutOfRadius(rescueCase, profile)) throw new RescueContactError(eligibilityMessage('OUT_OF_RADIUS'), 409, 'OUT_OF_RADIUS');
  const candidate = scoreVolunteerCandidate({
    createdByUserId: rescueCase.createdByUserId,
    type: need.type,
    latitude: rescueCase.latitude,
    longitude: rescueCase.longitude,
    searchRadiusKm: rescueCase.searchRadiusKm,
  }, profile);
  if (!candidate) throw new RescueContactError(eligibilityMessage('PROFILE_UPDATE_REQUIRED'), 409, 'PROFILE_UPDATE_REQUIRED');

  if (!existing && !rescueCase.communityPost?.isVisible) {
    throw new RescueContactError('Este caso no está disponible para tu perfil', 403, 'NOT_ELIGIBLE');
  }
  const now = new Date();
  try {
    const result = await db.$transaction(async (tx) => {
      let transitioned = true;
      let offer;
      if (existing) {
        const claimed = await tx.volunteerOffer.updateMany({
          where: { id: existing.id, status: { in: ['PENDING', 'DECLINED', 'EXPIRED'] } },
          data: {
            status: 'INTERESTED',
            source: 'WALL',
            role: candidate.role,
            distanceKm: candidate.distanceKm,
            score: candidate.score,
            reasons: JSON.stringify(candidate.reasons),
            respondedAt: now,
            expiresAt: new Date(now.getTime() + VOLUNTEER_OFFER_LIFETIME_MS),
          },
        });
        if (claimed.count === 0) transitioned = false;
        offer = await tx.volunteerOffer.findUniqueOrThrow({ where: { id: existing.id } });
      } else {
        offer = await tx.volunteerOffer.create({
          data: {
            needId: need.id,
            volunteerProfileId: profile.id,
            role: candidate.role,
            status: 'INTERESTED',
            source: 'WALL',
            distanceKm: candidate.distanceKm,
            score: candidate.score,
            reasons: JSON.stringify(candidate.reasons),
            respondedAt: now,
            expiresAt: new Date(now.getTime() + VOLUNTEER_OFFER_LIFETIME_MS),
          },
        });
      }
      if (!transitioned) return { offer, transitioned };
      const transition = await setRescueNeedStatus(tx, need.id, 'INTERESTED');
      await tx.rescueCaseEvent.create({
        data: {
          caseId: rescueCase.id,
          actorId: userId,
          type: 'VOLUNTEER_CONTACT_OPENED',
          fromStatus: rescueCase.status,
          toStatus: transition.caseStatus,
          eventKey: `volunteer-wall-contact:${offer.id}:${now.getTime()}`,
          payload: { offerId: offer.id, needId: need.id, role: candidate.role, source: 'WALL' },
        },
      });
      if (message) {
        await tx.message.create({
          data: { volunteerOfferId: offer.id, senderId: userId, receiverId: rescueCase.createdByUserId, content: message },
        });
      }
      return { offer, transitioned };
    });

    if (result.transitioned) {
      await notifyContactOpened({
        kind: 'VOLUNTEER',
        caseId: rescueCase.id,
        needType,
        offerId: result.offer.id,
        actorId: userId,
        recipientId: rescueCase.createdByUserId,
        location: rescueCase.location,
        respondedAt: result.offer.respondedAt || now,
      });
    }
    return contactResponse('VOLUNTEER', result.offer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrent = await db.volunteerOffer.findUniqueOrThrow({
        where: { needId_volunteerProfileId: { needId: need.id, volunteerProfileId: profile.id } },
      });
      return contactResponse('VOLUNTEER', concurrent);
    }
    throw error;
  }
}

async function loadContactCase(caseId: string) {
  return db.rescueCase.findUnique({
    where: { id: caseId },
    include: {
      communityPost: true,
      needs: true,
      createdBy: { select: { syntheticRunId: true } },
    },
  });
}

export async function expressRescueInterest(caseId: string, userId: string, input: RescueInterestData) {
  const [rescueCase, viewer] = await Promise.all([
    loadContactCase(caseId),
    db.user.findUnique({ where: { id: userId }, select: { syntheticRunId: true } }),
  ]);
  if (!rescueCase || !viewer || viewer.syntheticRunId !== rescueCase.createdBy.syntheticRunId) {
    throw new RescueContactError('Caso no encontrado', 404, 'NOT_ELIGIBLE');
  }
  if (rescueCase.createdByUserId === userId || await hasBlockedRelationship(rescueCase.createdByUserId, userId)) {
    throw new RescueContactError(eligibilityMessage('NOT_ELIGIBLE'), 403, 'NOT_ELIGIBLE');
  }
  const need = rescueCase.needs.find((item) => item.type === input.needType);
  if (!need || !OPEN_NEED_STATUSES.includes(need.status as (typeof OPEN_NEED_STATUSES)[number])) {
    throw new RescueContactError(eligibilityMessage('CASE_CLOSED'), 409, 'CASE_CLOSED');
  }
  if (input.needType === 'FOSTER') return expressFosterWallInterest(rescueCase, userId, input.message);
  return expressVolunteerWallInterest(rescueCase, input.needType, userId, input.message);
}

async function notifyContactChanged(input: {
  kind: RescueContactKind;
  caseId: string;
  offerId: string;
  actorId: string;
  recipientId: string;
  action: 'withdraw' | 'close';
}) {
  await createNotification({
    userId: input.recipientId,
    actorId: input.actorId,
    type: input.kind === 'FOSTER' ? 'FOSTER_RESPONSE' : 'VOLUNTEER_RESPONSE',
    title: input.action === 'withdraw' ? 'La ayuda ya no está disponible' : 'El contacto fue cerrado',
    body: input.action === 'withdraw'
      ? 'La persona retiró su interés y la búsqueda continúa.'
      : 'La persona responsable decidió continuar con otra alternativa.',
    link: `/hogares-de-transito/casos/${input.caseId}`,
    entityId: input.offerId,
    dedupeKey: `${input.kind.toLowerCase()}-contact-${input.action}:${input.offerId}`,
  });
}

export async function changeRescueContact(
  kind: RescueContactKind,
  offerId: string,
  userId: string,
  action: 'withdraw' | 'close',
) {
  if (kind === 'FOSTER') {
    const offer = await db.fosterOffer.findUnique({
      where: { id: offerId },
      include: { fosterProfile: true, rescueCase: true },
    });
    if (!offer) throw new RescueContactError('Contacto no encontrado', 404, 'NOT_ELIGIBLE');
    const authorized = action === 'withdraw'
      ? offer.fosterProfile.userId === userId
      : offer.rescueCase.createdByUserId === userId;
    if (!authorized) throw new RescueContactError('No autorizado', 403, 'NOT_ELIGIBLE');
    if (offer.status !== 'INTERESTED') throw new RescueContactError('El contacto ya no está abierto', 409, 'CASE_CLOSED');
    const status = action === 'withdraw' ? 'DECLINED' : 'CLOSED';
    await db.$transaction(async (tx) => {
      const claimed = await tx.fosterOffer.updateMany({ where: { id: offer.id, status: 'INTERESTED' }, data: { status } });
      if (claimed.count !== 1) throw new RescueContactError('El contacto cambió', 409, 'CASE_CLOSED');
      const [remaining, activePlacement] = await Promise.all([
        tx.fosterOffer.count({ where: { rescueCaseId: offer.rescueCaseId, status: { in: ['INTERESTED', 'SELECTED'] } } }),
        tx.fosterPlacement.count({ where: { rescueCaseId: offer.rescueCaseId, status: { in: ['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'] } } }),
      ]);
      if (remaining === 0 && activePlacement === 0) await setCaseNeedStatus(tx, offer.rescueCaseId, 'FOSTER', 'OPEN');
      await tx.rescueCaseEvent.create({
        data: {
          caseId: offer.rescueCaseId,
          actorId: userId,
          type: action === 'withdraw' ? 'FOSTER_CONTACT_WITHDRAWN' : 'FOSTER_CONTACT_CLOSED',
          payload: { offerId: offer.id },
        },
      });
    });
    await notifyContactChanged({
      kind,
      caseId: offer.rescueCaseId,
      offerId,
      actorId: userId,
      recipientId: action === 'withdraw' ? offer.rescueCase.createdByUserId : offer.fosterProfile.userId,
      action,
    });
    return { id: offer.id, status };
  }

  const offer = await db.volunteerOffer.findUnique({
    where: { id: offerId },
    include: { volunteerProfile: true, need: { include: { rescueCase: true } } },
  });
  if (!offer) throw new RescueContactError('Contacto no encontrado', 404, 'NOT_ELIGIBLE');
  const authorized = action === 'withdraw'
    ? offer.volunteerProfile.userId === userId
    : offer.need.rescueCase.createdByUserId === userId;
  if (!authorized) throw new RescueContactError('No autorizado', 403, 'NOT_ELIGIBLE');
  if (offer.status !== 'INTERESTED') throw new RescueContactError('El contacto ya no está abierto', 409, 'CASE_CLOSED');
  const status = action === 'withdraw' ? 'DECLINED' : 'CLOSED';
  await db.$transaction(async (tx) => {
    const claimed = await tx.volunteerOffer.updateMany({ where: { id: offer.id, status: 'INTERESTED' }, data: { status } });
    if (claimed.count !== 1) throw new RescueContactError('El contacto cambió', 409, 'CASE_CLOSED');
    const [remaining, activeAssignment] = await Promise.all([
      tx.volunteerOffer.count({ where: { needId: offer.needId, status: { in: ['INTERESTED', 'SELECTED'] } } }),
      tx.volunteerAssignment.count({ where: { needId: offer.needId, status: 'ACTIVE' } }),
    ]);
    if (remaining === 0 && activeAssignment === 0) await setRescueNeedStatus(tx, offer.needId, 'OPEN');
    await tx.rescueCaseEvent.create({
      data: {
        caseId: offer.need.rescueCaseId,
        actorId: userId,
        type: action === 'withdraw' ? 'VOLUNTEER_CONTACT_WITHDRAWN' : 'VOLUNTEER_CONTACT_CLOSED',
        payload: { offerId: offer.id, needId: offer.needId },
      },
    });
  });
  await notifyContactChanged({
    kind,
    caseId: offer.need.rescueCaseId,
    offerId,
    actorId: userId,
    recipientId: action === 'withdraw' ? offer.need.rescueCase.createdByUserId : offer.volunteerProfile.userId,
    action,
  });
  return { id: offer.id, status };
}
