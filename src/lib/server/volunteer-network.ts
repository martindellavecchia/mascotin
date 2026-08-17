import 'server-only';

import { Prisma, type VolunteerOfferStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { recalculateRescueCaseStatus, setRescueNeedStatus } from '@/lib/server/rescue-needs';
import {
  MAX_VOLUNTEER_OFFERS,
  rankVolunteerCandidates,
  scoreVolunteerCandidate,
  VOLUNTEER_OFFER_LIFETIME_MS,
} from '@/lib/volunteer';

export class VolunteerNetworkError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

class VolunteerConflict extends Error {}

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

export async function expireVolunteerOffers() {
  const expired = await db.volunteerOffer.findMany({
    where: { status: { in: ['PENDING', 'INTERESTED'] }, expiresAt: { lt: new Date() } },
    select: { id: true, needId: true },
  });
  if (expired.length === 0) return { count: 0, rematched: 0 };
  const needIds = [...new Set(expired.map((offer) => offer.needId))];

  const count = await db.$transaction(async (tx) => {
    const updated = await tx.volunteerOffer.updateMany({
      where: { id: { in: expired.map((offer) => offer.id) }, status: { in: ['PENDING', 'INTERESTED'] } },
      data: { status: 'EXPIRED' },
    });
    for (const needId of needIds) {
      const [need, interestedOffers, activeAssignments] = await Promise.all([
        tx.rescueNeed.findUnique({ where: { id: needId }, include: { rescueCase: { select: { createdByUserId: true } } } }),
        tx.volunteerOffer.count({ where: { needId, status: 'INTERESTED' } }),
        tx.volunteerAssignment.count({ where: { needId, status: 'ACTIVE' } }),
      ]);
      if (!need) continue;
      if (need.status === 'INTERESTED' && interestedOffers === 0 && activeAssignments === 0) {
        await setRescueNeedStatus(tx, need.id, 'OPEN');
      }
      await tx.rescueCaseEvent.create({
        data: {
          caseId: need.rescueCaseId,
          actorId: need.rescueCase.createdByUserId,
          type: 'VOLUNTEER_OFFERS_EXPIRED',
          payload: { needId, expiredOffers: expired.filter((offer) => offer.needId === needId).length },
        },
      });
    }
    return updated.count;
  });

  let rematched = 0;
  for (const needId of needIds) rematched += await createVolunteerOffersForNeed(needId);
  return { count, rematched };
}

export async function createVolunteerOffersForNeed(needId: string): Promise<number> {
  const need = await db.rescueNeed.findUnique({
    where: { id: needId },
    include: {
      rescueCase: { include: { createdBy: { select: { syntheticRunId: true } } } },
      volunteerOffers: { select: { volunteerProfileId: true, status: true } },
    },
  });
  if (!need || !['OPEN', 'INTERESTED'].includes(need.status) || need.type === 'FOSTER') return 0;

  const profiles = await db.volunteerProfile.findMany({
    where: {
      status: 'ACTIVE',
      user: { syntheticRunId: need.rescueCase.createdBy.syntheticRunId },
    },
    include: { user: { select: { syntheticRunId: true } } },
    take: 300,
  });
  const blocked = await blockedUserIds(need.rescueCase.createdByUserId, profiles.map((profile) => profile.userId));
  const alreadyOffered = new Set(need.volunteerOffers.map((offer) => offer.volunteerProfileId));
  const activeOfferCount = need.volunteerOffers.filter((offer) => ['PENDING', 'INTERESTED'].includes(offer.status)).length;
  const availableOffers = Math.max(0, MAX_VOLUNTEER_OFFERS - activeOfferCount);
  if (availableOffers === 0) return 0;
  const ranked = rankVolunteerCandidates(
    {
      createdByUserId: need.rescueCase.createdByUserId,
      type: need.type,
      latitude: need.rescueCase.latitude,
      longitude: need.rescueCase.longitude,
      searchRadiusKm: need.rescueCase.searchRadiusKm,
    },
    profiles.filter((profile) => !blocked.has(profile.userId) && !alreadyOffered.has(profile.id)),
    new Date(),
    availableOffers,
  );
  if (ranked.length === 0) return 0;

  const expiration = new Date(Date.now() + VOLUNTEER_OFFER_LIFETIME_MS);
  await db.$transaction(async (tx) => {
    await tx.volunteerOffer.createMany({
      data: ranked.map((candidate) => ({
        needId: need.id,
        volunteerProfileId: candidate.profileId,
        role: candidate.role,
        distanceKm: candidate.distanceKm,
        score: candidate.score,
        reasons: JSON.stringify(candidate.reasons),
        expiresAt: expiration,
      })),
      skipDuplicates: true,
    });
    await tx.rescueCaseEvent.create({
      data: {
        caseId: need.rescueCaseId,
        actorId: need.rescueCase.createdByUserId,
        type: 'VOLUNTEER_MATCHING_RUN',
        payload: { needId: need.id, needType: need.type, offers: ranked.length },
      },
    });
  });

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  await Promise.allSettled(ranked.map((candidate) => {
    const profile = profileById.get(candidate.profileId);
    if (!profile) return Promise.resolve();
    return createNotification({
      userId: profile.userId,
      actorId: need.rescueCase.createdByUserId,
      type: 'VOLUNTEER_OFFER',
      title: 'Hay una tarea solidaria cerca tuyo',
      body: `Podés ayudar dentro de un radio de ${need.rescueCase.searchRadiusKm} km`,
      link: '/hogares-de-transito?view=volunteer',
      entityId: need.id,
      dedupeKey: `volunteer-offer:${need.id}:${profile.userId}`,
    });
  }));
  return ranked.length;
}

export async function createVolunteerOffersForCase(rescueCaseId: string): Promise<number> {
  const needs = await db.rescueNeed.findMany({
    where: {
      rescueCaseId,
      type: { in: ['VETERINARY', 'TRANSPORT', 'SUPPLIES', 'FIELD_SUPPORT'] },
      status: { in: ['OPEN', 'INTERESTED'] },
    },
    select: { id: true },
  });
  const counts = await Promise.all(needs.map((need) => createVolunteerOffersForNeed(need.id)));
  return counts.reduce((sum, count) => sum + count, 0);
}

export async function createVolunteerOffersForProfile(profileId: string): Promise<number> {
  const profile = await db.volunteerProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { syntheticRunId: true } } },
  });
  if (!profile || profile.status !== 'ACTIVE' || profile.occupiedTasks >= profile.maxConcurrentTasks) return 0;

  const pendingCount = await db.volunteerOffer.count({
    where: { volunteerProfileId: profile.id, status: 'PENDING', expiresAt: { gt: new Date() } },
  });
  const available = Math.max(0, MAX_VOLUNTEER_OFFERS - pendingCount);
  if (available === 0) return 0;

  const needs = await db.rescueNeed.findMany({
    where: {
      status: { in: ['OPEN', 'INTERESTED'] },
      type: { in: ['VETERINARY', 'TRANSPORT', 'SUPPLIES', 'FIELD_SUPPORT'] },
      volunteerOffers: { none: { volunteerProfileId: profile.id } },
      rescueCase: {
        createdByUserId: { not: profile.userId },
        createdBy: { syntheticRunId: profile.user.syntheticRunId },
      },
    },
    include: { rescueCase: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const blocked = await blockedUserIds(profile.userId, needs.map((need) => need.rescueCase.createdByUserId));
  const matches = needs
    .filter((need) => !blocked.has(need.rescueCase.createdByUserId))
    .map((need) => ({
      need,
      candidate: scoreVolunteerCandidate({
        createdByUserId: need.rescueCase.createdByUserId,
        type: need.type,
        latitude: need.rescueCase.latitude,
        longitude: need.rescueCase.longitude,
        searchRadiusKm: need.rescueCase.searchRadiusKm,
      }, profile),
    }))
    .filter((match): match is typeof match & { candidate: NonNullable<typeof match.candidate> } => match.candidate !== null)
    .sort((left, right) => right.candidate.score - left.candidate.score || left.candidate.distanceKm - right.candidate.distanceKm)
    .slice(0, available);
  if (matches.length === 0) return 0;

  await db.volunteerOffer.createMany({
    data: matches.map(({ need, candidate }) => ({
      needId: need.id,
      volunteerProfileId: profile.id,
      role: candidate.role,
      distanceKm: candidate.distanceKm,
      score: candidate.score,
      reasons: JSON.stringify(candidate.reasons),
      expiresAt: new Date(Date.now() + VOLUNTEER_OFFER_LIFETIME_MS),
    })),
    skipDuplicates: true,
  });
  return matches.length;
}

export async function respondVolunteerOffer(offerId: string, userId: string, response: 'INTERESTED' | 'DECLINED') {
  const offer = await db.volunteerOffer.findUnique({
    where: { id: offerId },
    include: { volunteerProfile: true, need: { include: { rescueCase: true } } },
  });
  if (!offer) throw new VolunteerNetworkError('Oferta no encontrada', 404);
  if (offer.volunteerProfile.userId !== userId) throw new VolunteerNetworkError('No autorizado', 403);
  if (offer.status !== 'PENDING') throw new VolunteerNetworkError('La oferta ya fue respondida', 409);
  if (offer.expiresAt < new Date()) {
    await db.volunteerOffer.update({ where: { id: offer.id }, data: { status: 'EXPIRED' } });
    throw new VolunteerNetworkError('La oferta venció', 409);
  }
  if (offer.volunteerProfile.status !== 'ACTIVE') throw new VolunteerNetworkError('Activá tu perfil para responder', 409);

  await db.$transaction(async (tx) => {
    await tx.volunteerOffer.update({ where: { id: offer.id }, data: { status: response, respondedAt: new Date() } });
    if (response === 'INTERESTED' && offer.need.status === 'OPEN') {
      await setRescueNeedStatus(tx, offer.needId, 'INTERESTED');
    }
    await tx.rescueCaseEvent.create({
      data: {
        caseId: offer.need.rescueCaseId,
        actorId: userId,
        type: response === 'INTERESTED' ? 'VOLUNTEER_INTERESTED' : 'VOLUNTEER_DECLINED',
        payload: { offerId: offer.id, needId: offer.needId, role: offer.role },
      },
    });
  });
  await createNotification({
    userId: offer.need.rescueCase.createdByUserId,
    actorId: userId,
    type: 'VOLUNTEER_RESPONSE',
    title: response === 'INTERESTED' ? 'Una persona quiere ayudar' : 'Respuesta de voluntariado',
    body: response === 'INTERESTED' ? 'Revisá la oferta y seleccioná a la persona responsable.' : 'La persona indicó que esta vez no puede tomar la tarea.',
    link: `/hogares-de-transito/casos/${offer.need.rescueCaseId}`,
    entityId: offer.id,
    dedupeKey: `volunteer-response:${offer.id}:${response}`,
  });
  return { id: offer.id, status: response };
}

export async function selectVolunteerOffer(offerId: string, userId: string) {
  const initial = await db.volunteerOffer.findUnique({
    where: { id: offerId },
    include: { volunteerProfile: true, need: { include: { rescueCase: true } } },
  });
  if (!initial) throw new VolunteerNetworkError('Oferta no encontrada', 404);
  if (initial.need.rescueCase.createdByUserId !== userId) throw new VolunteerNetworkError('No autorizado', 403);
  if (initial.status !== 'INTERESTED') throw new VolunteerNetworkError('La persona todavía no confirmó interés', 409);

  try {
    const assignment = await db.$transaction(async (tx) => {
      const offer = await tx.volunteerOffer.findUnique({
        where: { id: offerId },
        include: { volunteerProfile: true, need: { include: { rescueCase: true } } },
      });
      if (!offer || offer.status !== 'INTERESTED') throw new VolunteerConflict('La oferta cambió');
      const claimedNeed = await tx.rescueNeed.updateMany({
        where: { id: offer.needId, status: 'INTERESTED' },
        data: { status: 'ACTIVE' },
      });
      if (claimedNeed.count !== 1) throw new VolunteerConflict('La necesidad ya tiene responsable');
      const claimedCapacity = await tx.volunteerProfile.updateMany({
        where: {
          id: offer.volunteerProfileId,
          status: 'ACTIVE',
          occupiedTasks: { lt: offer.volunteerProfile.maxConcurrentTasks },
        },
        data: { occupiedTasks: { increment: 1 } },
      });
      if (claimedCapacity.count !== 1) throw new VolunteerConflict('La persona ya no tiene cupo');
      await tx.volunteerOffer.update({ where: { id: offer.id }, data: { status: 'SELECTED', selectedAt: new Date() } });
      await tx.volunteerOffer.updateMany({
        where: { needId: offer.needId, id: { not: offer.id }, status: { in: ['PENDING', 'INTERESTED'] } },
        data: { status: 'CLOSED' },
      });
      const created = await tx.volunteerAssignment.create({
        data: { needId: offer.needId, volunteerProfileId: offer.volunteerProfileId, offerId: offer.id },
      });
      const caseStatus = await recalculateRescueCaseStatus(tx, offer.need.rescueCaseId);
      await tx.rescueCaseEvent.create({
        data: {
          caseId: offer.need.rescueCaseId,
          actorId: userId,
          type: 'VOLUNTEER_ASSIGNED',
          toStatus: caseStatus,
          payload: { assignmentId: created.id, needId: offer.needId, role: offer.role },
        },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await createNotification({
      userId: initial.volunteerProfile.userId,
      actorId: userId,
      type: 'VOLUNTEER_ASSIGNMENT',
      title: 'Te seleccionaron para ayudar',
      body: 'La tarea quedó activa y ya pueden coordinar por el chat privado.',
      link: `/hogares-de-transito/casos/${initial.need.rescueCaseId}`,
      entityId: assignment.id,
      dedupeKey: `volunteer-assignment:${assignment.id}`,
    });
    return assignment;
  } catch (error) {
    if (error instanceof VolunteerConflict || error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw new VolunteerNetworkError(error.message || 'La selección cambió mientras la confirmabas', 409);
    }
    throw error;
  }
}

export async function completeVolunteerAssignment(assignmentId: string, userId: string) {
  const assignment = await db.volunteerAssignment.findUnique({
    where: { id: assignmentId },
    include: { volunteerProfile: true, need: { include: { rescueCase: true } } },
  });
  if (!assignment) throw new VolunteerNetworkError('Tarea no encontrada', 404);
  if (assignment.need.rescueCase.createdByUserId !== userId) throw new VolunteerNetworkError('Sólo quien creó el caso puede completar la tarea', 403);
  if (assignment.status !== 'ACTIVE') throw new VolunteerNetworkError('La tarea ya no está activa', 409);

  await db.$transaction(async (tx) => {
    const claimed = await tx.volunteerAssignment.updateMany({
      where: { id: assignment.id, status: 'ACTIVE' },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    if (claimed.count !== 1) throw new VolunteerNetworkError('La tarea ya había cambiado', 409);
    await tx.volunteerProfile.updateMany({
      where: { id: assignment.volunteerProfileId, occupiedTasks: { gt: 0 } },
      data: { occupiedTasks: { decrement: 1 } },
    });
    const { caseStatus } = await setRescueNeedStatus(tx, assignment.needId, 'FULFILLED');
    await tx.rescueCaseEvent.create({
      data: {
        caseId: assignment.need.rescueCaseId,
        actorId: userId,
        type: 'VOLUNTEER_COMPLETED',
        toStatus: caseStatus,
        payload: { assignmentId: assignment.id, needId: assignment.needId },
      },
    });
  });
  await createNotification({
    userId: assignment.volunteerProfile.userId,
    actorId: userId,
    type: 'VOLUNTEER_ASSIGNMENT',
    title: 'Tarea completada',
    body: 'La ayuda quedó registrada como completada. Gracias por participar.',
    link: `/hogares-de-transito/casos/${assignment.need.rescueCaseId}`,
    entityId: assignment.id,
    dedupeKey: `volunteer-completed:${assignment.id}`,
  });
  return { id: assignment.id, status: 'COMPLETED' as const };
}

export async function cancelVolunteerAssignment(assignmentId: string, userId: string, reason: string) {
  const assignment = await db.volunteerAssignment.findUnique({
    where: { id: assignmentId },
    include: { volunteerProfile: true, need: { include: { rescueCase: true } } },
  });
  if (!assignment) throw new VolunteerNetworkError('Tarea no encontrada', 404);
  const isRequester = assignment.need.rescueCase.createdByUserId === userId;
  const isVolunteer = assignment.volunteerProfile.userId === userId;
  if (!isRequester && !isVolunteer) throw new VolunteerNetworkError('No autorizado', 403);
  if (assignment.status !== 'ACTIVE') throw new VolunteerNetworkError('La tarea ya no está activa', 409);

  await db.$transaction(async (tx) => {
    const claimed = await tx.volunteerAssignment.updateMany({
      where: { id: assignment.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledByUserId: userId, cancellationReason: reason },
    });
    if (claimed.count !== 1) throw new VolunteerNetworkError('La tarea ya había cambiado', 409);
    await tx.volunteerProfile.updateMany({
      where: { id: assignment.volunteerProfileId, occupiedTasks: { gt: 0 } },
      data: { occupiedTasks: { decrement: 1 } },
    });
    await tx.volunteerOffer.update({ where: { id: assignment.offerId }, data: { status: 'CLOSED' } });
    const { caseStatus } = await setRescueNeedStatus(tx, assignment.needId, 'OPEN');
    await tx.rescueCaseEvent.create({
      data: {
        caseId: assignment.need.rescueCaseId,
        actorId: userId,
        type: 'VOLUNTEER_CANCELLED',
        toStatus: caseStatus,
        payload: { assignmentId: assignment.id, needId: assignment.needId, reason },
      },
    });
  });
  await createVolunteerOffersForNeed(assignment.needId);
  const recipientId = isRequester ? assignment.volunteerProfile.userId : assignment.need.rescueCase.createdByUserId;
  await createNotification({
    userId: recipientId,
    actorId: userId,
    type: 'VOLUNTEER_ASSIGNMENT',
    title: 'La tarea fue cancelada',
    body: 'La necesidad volvió a abrirse y se buscarán nuevas personas disponibles.',
    link: `/hogares-de-transito/casos/${assignment.need.rescueCaseId}`,
    entityId: assignment.id,
    dedupeKey: `volunteer-cancelled:${assignment.id}`,
  });
  return { id: assignment.id, status: 'CANCELLED' as const };
}

export function volunteerOfferStatusIsOpen(status: VolunteerOfferStatus) {
  return ['PENDING', 'INTERESTED', 'SELECTED'].includes(status);
}
