import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { meetupSchema } from '@/lib/meetups';
import { recordProductEvent } from '@/lib/server/product-events';
import { enqueueNotificationPush } from '@/lib/server/push';
export class MeetupError extends Error {
  constructor(
    message: string,
    readonly status = 409
  ) {
    super(message);
  }
}
export async function requireActiveMatch(
  userId: string,
  matchId: string,
  tx: Prisma.TransactionClient = db
) {
  const match = await tx.match.findUnique({
    where: { id: matchId },
    include: {
      pet1: {
        include: {
          owner: { include: { user: { select: { syntheticRunId: true, isBlocked: true } } } },
        },
      },
      pet2: {
        include: {
          owner: { include: { user: { select: { syntheticRunId: true, isBlocked: true } } } },
        },
      },
    },
  });
  if (!match?.pet1?.isActive || !match.pet2?.isActive)
    throw new MeetupError('El encuentro ya no está disponible', 404);
  const owners = [match.pet1.owner.userId, match.pet2.owner.userId];
  if (
    !owners.includes(userId) ||
    match.pet1.owner.user.syntheticRunId !== match.pet2.owner.user.syntheticRunId ||
    match.pet1.owner.user.isBlocked ||
    match.pet2.owner.user.isBlocked
  )
    throw new MeetupError('No autorizado', 403);
  const otherId = owners.find((id) => id !== userId);
  if (!otherId) throw new MeetupError('No autorizado', 403);
  const blocked = await tx.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherId },
        { blockerId: otherId, blockedId: userId },
      ],
    },
  });
  if (blocked) throw new MeetupError('No se puede coordinar con este usuario', 403);
  return { otherId };
}
export async function saveMeetup(
  userId: string,
  matchId: string,
  input: {
    id?: string;
    version?: number;
    action: 'PROPOSE' | 'EDIT' | 'ACCEPT' | 'DECLINE' | 'CANCEL';
    proposal?: unknown;
  }
) {
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
    const { otherId } = await requireActiveMatch(userId, matchId, tx);
    const current = input.id
      ? await tx.meetup.findFirst({ where: { id: input.id, matchId } })
      : null;
    if (
      input.action !== 'PROPOSE' &&
      (!current ||
        current.version !== input.version ||
        !['PROPOSED', 'ACCEPTED'].includes(current.status))
    )
      throw new MeetupError('La propuesta cambió. Actualizá la conversación.');
    if (current && current.date <= new Date() && input.action !== 'CANCEL')
      throw new MeetupError('La fecha de esta propuesta ya pasó');
    let meetup;
    if (input.action === 'PROPOSE' || input.action === 'EDIT') {
      if (input.action === 'EDIT' && current?.proposedById !== userId)
        throw new MeetupError('Solo quien propuso puede editar', 403);
      const parsed = meetupSchema.safeParse(input.proposal);
      if (!parsed.success) throw new MeetupError('Revisá lugar público, fecha y duración', 400);
      const { publicPlace: _publicPlace, ...proposal } = parsed.data;
      const data = {
        place: proposal.place,
        date: new Date(proposal.date),
        durationMinutes: proposal.durationMinutes,
        status: 'PROPOSED',
      };
      if (
        !current &&
        (await tx.meetup.count({
          where: { matchId, status: { in: ['PROPOSED', 'ACCEPTED'] }, date: { gt: new Date() } },
        })) >= 5
      )
        throw new MeetupError('Ya hay cinco propuestas activas');
      meetup = current
        ? await tx.meetup.update({
            where: { id: current.id },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.meetup.create({ data: { ...data, matchId, proposedById: userId } });
    } else {
      if (!current) throw new MeetupError('Propuesta no encontrada', 404);
      if (
        input.action !== 'CANCEL' &&
        (current.proposedById === userId || current.status !== 'PROPOSED')
      )
        throw new MeetupError('Esta propuesta no admite esa respuesta', 403);
      const status = { ACCEPT: 'ACCEPTED', DECLINE: 'DECLINED', CANCEL: 'CANCELLED' }[input.action];
      meetup = await tx.meetup.update({
        where: { id: current.id },
        data: { status, version: { increment: 1 } },
      });
    }
    const settings = await tx.userSettings.findUnique({
      where: { userId: otherId },
      select: { notifyMatches: true },
    });
    const notification =
      settings?.notifyMatches === false
        ? null
        : await tx.notification.create({
            data: {
              userId: otherId,
              actorId: userId,
              type: 'MEETUP',
              title:
                input.action === 'EDIT'
                  ? 'El encuentro cambió: requiere aceptación'
                  : input.action === 'ACCEPT'
                    ? 'Encuentro aceptado'
                    : input.action === 'CANCEL'
                      ? 'Encuentro cancelado'
                      : input.action === 'DECLINE'
                        ? 'Propuesta declinada'
                        : 'Nueva propuesta de encuentro',
              body: 'Consultá los detalles en la conversación.',
              link: `/messages?matchId=${matchId}`,
              entityId: meetup.id,
              dedupeKey: `meetup:${meetup.id}:${meetup.version}`,
            },
          });
    await recordProductEvent(
      userId,
      `meetup_${input.action.toLowerCase()}`,
      `${meetup.id}:${meetup.version}`,
      tx
    );
    return { meetup, notificationId: notification?.id };
  });
  if (result.notificationId)
    await enqueueNotificationPush(result.notificationId).catch((e) =>
      console.error('meetup_push', e)
    );
  return result.meetup;
}
