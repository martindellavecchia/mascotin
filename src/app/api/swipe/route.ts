import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { recordSwipe, undoPass, SwipeError } from '@/lib/server/swipes';
const schema = z.object({ fromPetId: z.string().min(1), toPetId: z.string().min(1), isLike: z.boolean() });
export async function POST(request: Request) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  const limit = await rateLimit(`swipe:${auth.session.user.id}`, RATE_LIMITS.swipe);
  if (!limit.allowed) return NextResponse.json({ success: false, error: 'Esperá un momento antes de volver a deslizar' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  try { return NextResponse.json({ success: true, ...await recordSwipe(auth.session.user.id, parsed.data.fromPetId, parsed.data.toPetId, parsed.data.isLike) }); }
  catch (e) { if (e instanceof SwipeError) return NextResponse.json({ success: false, error: e.message }, { status: e.status }); console.error('swipe', e); return NextResponse.json({ success: false, error: 'No pudimos guardar la acción' }, { status: 500 }); }
}
export async function GET(request: Request) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  const petId = new URL(request.url).searchParams.get('fromPetId') || '';
  const pet = await db.pet.findFirst({ where: { id: petId, owner: { userId: auth.session.user.id } }, select: { swipeSequence: true } });
  if (!pet) return NextResponse.json({ error: 'Mascota no encontrada' }, { status: 404 });
  const last = await db.swipe.findFirst({ where: { fromPetId: petId, actionSequence: pet.swipeSequence, undoneAt: null, isLike: false }, select: { id: true } });
  return NextResponse.json({ success: true, swipeId: last?.id || null });
}
export async function DELETE(request: Request) {
  const auth = await requireAuth(); if (auth.error) return auth.error;
  const parsed = z.object({ petId: z.string().min(1), swipeId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  try { return NextResponse.json({ success: true, ...await undoPass(auth.session.user.id, parsed.data.petId, parsed.data.swipeId) }); }
  catch (e) { if (e instanceof SwipeError) return NextResponse.json({ error: e.message }, { status: e.status }); console.error('undo_pass', e); return NextResponse.json({ error: 'No pudimos deshacer el pase' }, { status: 500 }); }
}
