import 'server-only';

import type { RescueNeedType } from '@prisma/client';
import { db } from '@/lib/db';
import { buildMessagePage } from '@/lib/messages';
import { createNotification } from '@/lib/notifications';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { RESCUE_NEED_LABELS, toGeneralZone } from '@/lib/rescue';
import type { RescueContactKind } from '@/lib/server/rescue-contact';

interface ContactMessageContext {
  kind: RescueContactKind;
  offerId: string;
  caseId: string;
  needType: RescueNeedType;
  location: string;
  creatorUserId: string;
  helperUserId: string;
  status: string;
  canWrite: boolean;
  legacyId: string | null;
}

export class RescueContactMessageError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function contactContext(kind: RescueContactKind, offerId: string, userId: string): Promise<ContactMessageContext> {
  if (kind === 'FOSTER') {
    const offer = await db.fosterOffer.findUnique({
      where: { id: offerId },
      include: { rescueCase: true, fosterProfile: true, placement: true },
    });
    if (!offer) throw new RescueContactMessageError('Conversación no encontrada', 404);
    const authorized = offer.rescueCase.createdByUserId === userId || offer.fosterProfile.userId === userId;
    if (!authorized) throw new RescueContactMessageError('No autorizado', 403);
    if (offer.status === 'PENDING') throw new RescueContactMessageError('La conversación todavía no está habilitada', 409);
    const selectedActive = offer.status === 'SELECTED'
      && Boolean(offer.placement && ['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'].includes(offer.placement.status));
    return {
      kind,
      offerId: offer.id,
      caseId: offer.rescueCaseId,
      needType: 'FOSTER',
      location: offer.rescueCase.location,
      creatorUserId: offer.rescueCase.createdByUserId,
      helperUserId: offer.fosterProfile.userId,
      status: offer.status,
      canWrite: offer.status === 'INTERESTED' || selectedActive,
      legacyId: offer.placement?.id || null,
    };
  }

  const offer = await db.volunteerOffer.findUnique({
    where: { id: offerId },
    include: { volunteerProfile: true, assignment: true, need: { include: { rescueCase: true } } },
  });
  if (!offer) throw new RescueContactMessageError('Conversación no encontrada', 404);
  const authorized = offer.need.rescueCase.createdByUserId === userId || offer.volunteerProfile.userId === userId;
  if (!authorized) throw new RescueContactMessageError('No autorizado', 403);
  if (offer.status === 'PENDING') throw new RescueContactMessageError('La conversación todavía no está habilitada', 409);
  const selectedActive = offer.status === 'SELECTED' && offer.assignment?.status === 'ACTIVE';
  return {
    kind,
    offerId: offer.id,
    caseId: offer.need.rescueCaseId,
    needType: offer.need.type,
    location: offer.need.rescueCase.location,
    creatorUserId: offer.need.rescueCase.createdByUserId,
    helperUserId: offer.volunteerProfile.userId,
    status: offer.status,
    canWrite: offer.status === 'INTERESTED' || selectedActive,
    legacyId: offer.assignment?.id || null,
  };
}

function messageWhere(context: ContactMessageContext, after?: Date | null) {
  const conversation = context.kind === 'FOSTER'
    ? [
        { fosterOfferId: context.offerId },
        ...(context.legacyId ? [{ fosterPlacementId: context.legacyId }] : []),
      ]
    : [
        { volunteerOfferId: context.offerId },
        ...(context.legacyId ? [{ volunteerAssignmentId: context.legacyId }] : []),
      ];
  return {
    OR: conversation,
    ...(after ? { createdAt: { gt: after } } : {}),
  };
}

export async function getRescueContactMessages(input: {
  kind: RescueContactKind;
  offerId: string;
  userId: string;
  after?: Date | null;
  limit: number;
}) {
  const context = await contactContext(input.kind, input.offerId, input.userId);
  const messages = await db.message.findMany({
    where: messageWhere(context, input.after),
    orderBy: { createdAt: input.after ? 'asc' : 'desc' },
    take: input.after ? input.limit : input.limit + 1,
  });
  await db.message.updateMany({
    where: {
      ...messageWhere(context),
      receiverId: input.userId,
      read: false,
    },
    data: { read: true },
  });
  return {
    ...buildMessagePage(messages, { limit: input.limit, incremental: Boolean(input.after) }),
    conversation: { status: context.status, canWrite: context.canWrite },
  };
}

export async function sendRescueContactMessage(input: {
  kind: RescueContactKind;
  offerId: string;
  userId: string;
  userName?: string | null;
  content: string;
}) {
  const limit = await rateLimit(`rescue-message:${input.userId}`, RATE_LIMITS.rescueMessage);
  if (!limit.allowed) throw new RescueContactMessageError('Estás enviando mensajes demasiado rápido', 429);
  const context = await contactContext(input.kind, input.offerId, input.userId);
  if (!context.canWrite) throw new RescueContactMessageError('La conversación está cerrada', 409);
  const otherUserId = context.creatorUserId === input.userId ? context.helperUserId : context.creatorUserId;
  const blocked = await db.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: input.userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: input.userId },
      ],
    },
    select: { id: true },
  });
  if (blocked) throw new RescueContactMessageError('No autorizado', 403);

  const message = await db.message.create({
    data: {
      ...(context.kind === 'FOSTER'
        ? { fosterOfferId: context.offerId }
        : { volunteerOfferId: context.offerId }),
      senderId: input.userId,
      receiverId: otherUserId,
      content: input.content,
    },
  });
  const kindParam = context.kind === 'FOSTER' ? 'foster' : 'volunteer';
  await createNotification({
    userId: otherUserId,
    actorId: input.userId,
    type: 'MESSAGE',
    title: context.kind === 'FOSTER' ? 'Nuevo mensaje sobre un tránsito' : 'Nuevo mensaje de voluntariado',
    body: `${input.userName || 'Alguien'} te envió un mensaje`,
    link: `/hogares-de-transito/casos/${context.caseId}?contact=1&kind=${kindParam}&offer=${context.offerId}`,
    entityId: message.id,
    dedupeKey: `rescue-contact-message:${message.id}`,
    pushContext: { zone: toGeneralZone(context.location), helpType: RESCUE_NEED_LABELS[context.needType] },
  });
  return message;
}

export async function fosterOfferIdForPlacement(placementId: string, userId: string) {
  const placement = await db.fosterPlacement.findUnique({
    where: { id: placementId },
    include: { rescueCase: true, fosterProfile: true },
  });
  if (!placement) throw new RescueContactMessageError('Conversación no encontrada', 404);
  if (placement.rescueCase.createdByUserId !== userId && placement.fosterProfile.userId !== userId) {
    throw new RescueContactMessageError('No autorizado', 403);
  }
  return placement.offerId;
}

export async function volunteerOfferIdForAssignment(assignmentId: string, userId: string) {
  const assignment = await db.volunteerAssignment.findUnique({
    where: { id: assignmentId },
    include: { volunteerProfile: true, need: { include: { rescueCase: true } } },
  });
  if (!assignment) throw new RescueContactMessageError('Conversación no encontrada', 404);
  if (assignment.need.rescueCase.createdByUserId !== userId && assignment.volunteerProfile.userId !== userId) {
    throw new RescueContactMessageError('No autorizado', 403);
  }
  return assignment.offerId;
}
