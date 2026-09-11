import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-helpers';
import { BookingError, changeAppointment } from '@/lib/server/bookings';
import { productEnabled } from '@/lib/product-flags';
type Context = { params: Promise<{ id: string }> };
const changeSchema = z.object({ status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(), date: z.string().datetime({ offset: true }).optional(), expectedUpdatedAt: z.string().datetime().optional() }).refine(v => Boolean(v.status) !== Boolean(v.date));
async function change(request: Request, context: Context, cancel: boolean) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  const parsed = changeSchema.safeParse(cancel ? { status: 'CANCELLED' } : await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Cambio inválido' }, { status: 400 });
  if (parsed.data.date && !productEnabled('BOOKINGS')) return NextResponse.json({ error: 'Reprogramación no disponible' }, { status: 503 });
  try { return NextResponse.json({ success: true, appointment: await changeAppointment(auth.session.user.id, (await context.params).id, parsed.data) }); }
  catch (err) { if (err instanceof BookingError) return NextResponse.json({ success: false, error: err.message }, { status: err.status }); console.error('appointment_change', err); return NextResponse.json({ success: false, error: 'No pudimos actualizar el turno' }, { status: 500 }); }
}
export async function PATCH(request: Request, context: Context) { return change(request, context, false); }
export async function DELETE(request: Request, context: Context) { return change(request, context, true); }
