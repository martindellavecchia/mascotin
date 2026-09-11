import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { productEnabled } from '@/lib/product-flags';
import { requireActiveMatch, saveMeetup, MeetupError } from '@/lib/server/meetups';
import { meetupCalendar } from '@/lib/meetups';
type Context = { params: Promise<{ id: string }> };
function failure(e: unknown) {
  if (e instanceof MeetupError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  console.error('meetup', e);
  return NextResponse.json({ error: 'No pudimos procesar la propuesta' }, { status: 500 });
}
export async function GET(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!productEnabled('MEETUPS')) return NextResponse.json({ enabled: false, meetups: [] });
  const { id } = await params;
  try {
    await requireActiveMatch(auth.session.user.id, id);
    const calendarId = new URL(request.url).searchParams.get('calendar');
    if (calendarId) {
      const meetup = await db.meetup.findFirst({
        where: { id: calendarId, matchId: id, status: 'ACCEPTED' },
      });
      if (!meetup) throw new MeetupError('El encuentro debe estar aceptado', 409);
      return new Response(meetupCalendar(meetup), {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="encuentro-huella.ics"',
          'Cache-Control': 'no-store',
        },
      });
    }
    return NextResponse.json({
      enabled: true,
      meetups: await db.meetup.findMany({
        where: { matchId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!productEnabled('MEETUPS'))
    return NextResponse.json({ error: 'Función no disponible' }, { status: 404 });
  const parsed = z
    .object({
      id: z.string().optional(),
      version: z.number().int().optional(),
      action: z.enum(['PROPOSE', 'EDIT', 'ACCEPT', 'DECLINE', 'CANCEL']),
      proposal: z.unknown().optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  try {
    return NextResponse.json({
      success: true,
      meetup: await saveMeetup(auth.session.user.id, (await params).id, parsed.data),
    });
  } catch (e) {
    return failure(e);
  }
}
