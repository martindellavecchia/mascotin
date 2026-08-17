import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { updateRescueCaseRadiusSchema } from '@/lib/schemas';
import { createOffersForCase } from '@/lib/server/foster';
import { createVolunteerOffersForCase } from '@/lib/server/volunteer-network';
import { notifySolidaritySubscribersForCase } from '@/lib/server/solidarity-alerts';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const parsed = updateRescueCaseRadiusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'El radio debe estar entre 1 y 50 km' }, { status: 400 });
  }

  const rescueCase = await db.rescueCase.findUnique({
    where: { id },
    include: { needs: { select: { status: true } } },
  });
  if (!rescueCase) {
    return NextResponse.json({ success: false, error: 'Caso no encontrado' }, { status: 404 });
  }
  if (rescueCase.createdByUserId !== auth.session.user.id) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }
  if (!rescueCase.needs.some((need) => ['OPEN', 'INTERESTED'].includes(need.status))) {
    return NextResponse.json(
      { success: false, error: 'El radio solo puede cambiarse mientras hay ayudas abiertas' },
      { status: 409 }
    );
  }

  await db.$transaction([
    db.rescueCase.update({
      where: { id },
      data: { searchRadiusKm: parsed.data.searchRadiusKm },
    }),
    db.fosterOffer.updateMany({
      where: {
        rescueCaseId: id,
        status: 'PENDING',
        distanceKm: { gt: parsed.data.searchRadiusKm },
      },
      data: { status: 'CLOSED' },
    }),
    db.volunteerOffer.updateMany({
      where: {
        need: { rescueCaseId: id },
        status: 'PENDING',
        distanceKm: { gt: parsed.data.searchRadiusKm },
      },
      data: { status: 'CLOSED' },
    }),
    db.rescueCaseEvent.create({
      data: {
        caseId: id,
        actorId: auth.session.user.id,
        type: 'RADIUS_UPDATED',
        details: JSON.stringify({
          from: rescueCase.searchRadiusKm,
          to: parsed.data.searchRadiusKm,
        }),
      },
    }),
  ]);

  const [offerCount, volunteerOfferCount, alertCount] = await Promise.all([
    createOffersForCase(id),
    createVolunteerOffersForCase(id),
    notifySolidaritySubscribersForCase(id),
  ]);
  return NextResponse.json({
    success: true,
    searchRadiusKm: parsed.data.searchRadiusKm,
    newOfferCount: offerCount,
    newVolunteerOfferCount: volunteerOfferCount,
    alertCount,
  });
}
