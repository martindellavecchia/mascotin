import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import {
  scheduleSchema,
  isScheduledSlot,
  intervalsOverlap,
  canTransitionAppointment,
} from '@/lib/booking-schedule';
import { recordProductEvent } from '@/lib/server/product-events';
import { enqueueNotificationPush } from '@/lib/server/push';

export class BookingError extends Error {
  constructor(
    message: string,
    readonly status = 409
  ) {
    super(message);
  }
}
async function validateSlot(
  tx: Prisma.TransactionClient,
  serviceId: string,
  date: Date,
  userId: string,
  excludeId?: string
) {
  const service = await tx.service.findUnique({
    where: { id: serviceId },
    include: {
      provider: { include: { user: { select: { syntheticRunId: true, isBlocked: true } } } },
      store: true,
    },
  });
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { syntheticRunId: true, isBlocked: true },
  });
  if (
    !service ||
    !user ||
    user.isBlocked ||
    service.provider.user.isBlocked ||
    service.provider.user.syntheticRunId !== user.syntheticRunId ||
    (service.store && !service.store.isActive)
  )
    throw new BookingError('Servicio no disponible', 404);
  const blocked = await tx.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: service.provider.userId },
        { blockerId: service.provider.userId, blockedId: userId },
      ],
    },
  });
  if (blocked) throw new BookingError('Servicio no disponible', 403);
  const schedule = scheduleSchema.safeParse(service.provider.schedule);
  if (!schedule.success || !isScheduledSlot(schedule.data, date, service.duration))
    throw new BookingError('Ese horario no está disponible. Elegí otro.');
  const existing = await tx.appointment.findMany({
    where: {
      service: { providerId: service.providerId },
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      date: { lt: new Date(date.getTime() + service.duration * 60000) },
    },
    include: { service: { select: { duration: true } } },
  });
  if (
    existing.some((a) =>
      intervalsOverlap(date, service.duration, a.date, a.durationMinutes ?? a.service.duration)
    )
  )
    throw new BookingError('Otra reserva ocupa ese horario. Elegí otro.');
  return service;
}
async function notification(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    actorId: string;
    appointmentId: string;
    title: string;
    key: string;
    provider: boolean;
  }
) {
  if (input.userId === input.actorId) return null;
  const settings = await tx.userSettings.findUnique({
    where: { userId: input.userId },
    select: { notifyHealth: true },
  });
  if (settings?.notifyHealth === false) return null;
  const row = await tx.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: 'APPOINTMENT',
      title: input.title,
      body: 'Consultá el detalle y el estado del turno.',
      entityId: input.appointmentId,
      link: input.provider ? '/provider?tab=appointments' : '/appointments',
      dedupeKey: `appointment:${input.key}`,
    },
  });
  return row.id;
}
export async function requestAppointment(
  userId: string,
  input: { serviceId: string; petId: string; date: string }
) {
  const result = await db.$transaction(
    async (tx) => {
      const s = await tx.service.findUnique({
        where: { id: input.serviceId },
        select: { providerId: true },
      });
      if (!s) throw new BookingError('Servicio no encontrado', 404);
      await tx.$queryRaw`SELECT id FROM "ProviderProfile" WHERE id = ${s.providerId} FOR UPDATE`;
      const pet = await tx.pet.findFirst({
        where: { id: input.petId, isActive: true, owner: { userId } },
        select: { id: true },
      });
      if (!pet) throw new BookingError('Elegí una mascota de tu perfil', 403);
      const date = new Date(input.date);
      const service = await validateSlot(tx, input.serviceId, date, userId);
      const appointment = await tx.appointment.create({
        data: {
          userId,
          serviceId: input.serviceId,
          petId: input.petId,
          date,
          durationMinutes: service.duration,
          status: 'PENDING',
          history: { create: { actorId: userId, status: 'PENDING', date } },
        },
      });
      const push = await notification(tx, {
        userId: service.provider.userId,
        actorId: userId,
        appointmentId: appointment.id,
        title: 'Nueva solicitud de turno',
        key: `${appointment.id}:requested`,
        provider: true,
      });
      await recordProductEvent(userId, 'appointment_requested', appointment.id, tx);
      return { appointment, push };
    },
    { timeout: 15000 }
  );
  if (result.push)
    await enqueueNotificationPush(result.push).catch((err) =>
      console.error('appointment_push_enqueue', err)
    );
  return result.appointment;
}
export async function changeAppointment(
  userId: string,
  id: string,
  input: { status?: string; date?: string; expectedUpdatedAt?: string }
) {
  const result = await db.$transaction(
    async (tx) => {
      const initial = await tx.appointment.findUnique({
        where: { id },
        select: { service: { select: { providerId: true } } },
      });
      if (!initial) throw new BookingError('Turno no encontrado', 404);
      await tx.$queryRaw`SELECT id FROM "ProviderProfile" WHERE id = ${initial.service.providerId} FOR UPDATE`;
      const current = await tx.appointment.findUniqueOrThrow({
        where: { id },
        include: { service: { include: { provider: true } } },
      });
      const isProvider = current.service.provider.userId === userId;
      if (!isProvider && current.userId !== userId) throw new BookingError('No autorizado', 403);
      if (input.expectedUpdatedAt && current.updatedAt.toISOString() !== input.expectedUpdatedAt)
        throw new BookingError('El turno cambió. Actualizá la pantalla.');
      let date = current.date;
      let duration = current.durationMinutes ?? current.service.duration;
      let status = input.status || current.status;
      if (input.date) {
        if (
          current.userId !== userId ||
          current.date <= new Date() ||
          !['PENDING', 'CONFIRMED'].includes(current.status)
        )
          throw new BookingError('Este turno ya no puede reprogramarse');
        date = new Date(input.date);
        if (date.getTime() === current.date.getTime())
          throw new BookingError('Elegí un horario diferente');
        const service = await validateSlot(tx, current.serviceId, date, userId, id);
        duration = service.duration;
        status = 'PENDING';
      } else if (
        !canTransitionAppointment(current.status, status, isProvider, current.date, duration)
      )
        throw new BookingError('El estado o la fecha del turno no permiten ese cambio');
      const appointment = await tx.appointment.update({
        where: { id },
        data: {
          date,
          status,
          durationMinutes: duration,
          history: { create: { actorId: userId, date, status } },
        },
      });
      const recipient = isProvider ? current.userId : current.service.provider.userId;
      const title = input.date
        ? 'Turno reprogramado: requiere confirmación'
        : {
            CONFIRMED: 'Tu turno fue confirmado',
            CANCELLED: 'Turno cancelado',
            COMPLETED: 'Turno completado',
          }[status] || 'Turno actualizado';
      const push = await notification(tx, {
        userId: recipient,
        actorId: userId,
        appointmentId: id,
        title,
        key: `${id}:${appointment.updatedAt.toISOString()}`,
        provider: !isProvider,
      });
      await recordProductEvent(
        current.userId,
        input.date ? 'appointment_rescheduled' : `appointment_${status.toLowerCase()}`,
        input.date ? `${id}:${appointment.updatedAt.toISOString()}` : id,
        tx
      );
      return { appointment, push };
    },
    { timeout: 15000 }
  );
  if (result.push)
    await enqueueNotificationPush(result.push).catch((err) =>
      console.error('appointment_push_enqueue', err)
    );
  return result.appointment;
}
