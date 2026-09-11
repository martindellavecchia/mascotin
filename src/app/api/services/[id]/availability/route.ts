import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { productEnabled } from '@/lib/product-flags';
import { availableSlots, scheduleSchema } from '@/lib/booking-schedule';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!productEnabled('BOOKINGS'))
    return NextResponse.json({ success: true, slots: [], configured: false });
  const service = await db.service.findUnique({
    where: { id: (await params).id },
    include: {
      provider: { include: { user: { select: { syntheticRunId: true, isBlocked: true } } } },
      store: true,
    },
  });
  const user = await db.user.findUnique({
    where: { id: auth.session.user.id },
    select: { syntheticRunId: true },
  });
  if (
    !service ||
    !user ||
    service.provider.user.isBlocked ||
    service.provider.user.syntheticRunId !== user.syntheticRunId ||
    (service.store && !service.store.isActive)
  )
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 404 });
  const blocked = await db.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: auth.session.user.id, blockedId: service.provider.userId },
        { blockerId: service.provider.userId, blockedId: auth.session.user.id },
      ],
    },
  });
  if (blocked) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 403 });
  const schedule = scheduleSchema.safeParse(service.provider.schedule);
  if (!schedule.success) return NextResponse.json({ success: true, slots: [], configured: false });
  const appointmentId = new URL(request.url).searchParams.get('appointmentId');
  if (appointmentId) {
    const current = await db.appointment.findFirst({
      where: {
        id: appointmentId,
        userId: auth.session.user.id,
        serviceId: service.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!current)
      return NextResponse.json({ error: 'El turno no puede reprogramarse' }, { status: 403 });
  }
  const appointments = await db.appointment.findMany({
    where: {
      ...(appointmentId ? { id: { not: appointmentId } } : {}),
      service: { providerId: service.providerId },
      status: { in: ['PENDING', 'CONFIRMED'] },
      date: { gte: new Date(Date.now() - 86400000), lte: new Date(Date.now() + 31 * 86400000) },
    },
    select: { date: true, durationMinutes: true, service: { select: { duration: true } } },
  });
  return NextResponse.json(
    {
      success: true,
      configured: true,
      timeZone: schedule.data.timeZone,
      duration: service.duration,
      slots: availableSlots(schedule.data, service.duration, appointments),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
