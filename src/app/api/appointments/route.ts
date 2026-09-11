import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createAppointmentSchema } from '@/lib/schemas';
import { productEnabled } from '@/lib/product-flags';
import { BookingError, requestAppointment } from '@/lib/server/bookings';
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const params = new URL(request.url).searchParams;
  const all = params.get('all') === 'true';
  const page = Number(params.get('page') || 1);
  if (!Number.isSafeInteger(page) || page < 1)
    return NextResponse.json({ success: false, error: 'Página inválida' }, { status: 400 });
  const size = all ? 50 : 5;
  const appointments = await db.appointment.findMany({
    where: {
      userId: auth.session.user.id,
      ...(!all ? { status: { in: ['PENDING', 'CONFIRMED'] }, date: { gte: new Date() } } : {}),
    },
    orderBy: [{ date: all ? 'desc' : 'asc' }, { id: 'asc' }],
    take: size + 1,
    skip: all ? (page - 1) * size : 0,
    include: {
      service: { include: { provider: true } },
      pet: { select: { id: true, name: true, images: true, thumbnailIndex: true } },
      history: { orderBy: { createdAt: 'asc' } },
    },
  });
  return NextResponse.json({
    success: true,
    appointments: appointments.slice(0, size),
    hasMore: appointments.length > size,
  });
}
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!productEnabled('BOOKINGS'))
    return NextResponse.json(
      { success: false, error: 'Las reservas todavía no están habilitadas' },
      { status: 503 }
    );
  const parsed = createAppointmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { success: false, error: 'Revisá mascota, servicio y fecha' },
      { status: 400 }
    );
  try {
    return NextResponse.json(
      { success: true, appointment: await requestAppointment(auth.session.user.id, parsed.data) },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof BookingError)
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    console.error('appointment_create', err);
    return NextResponse.json(
      { success: false, error: 'No pudimos solicitar el turno' },
      { status: 500 }
    );
  }
}
