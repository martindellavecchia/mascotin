import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createNotification } from '@/lib/notifications';
import { respondFosterOfferSchema } from '@/lib/schemas';
import { setCaseNeedStatus } from '@/lib/server/rescue-needs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const parsed = respondFosterOfferSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Respuesta inválida' }, { status: 400 });
  }

  const offer = await db.fosterOffer.findUnique({
    where: { id },
    include: {
      fosterProfile: true,
      rescueCase: true,
    },
  });
  if (!offer) {
    return NextResponse.json({ success: false, error: 'Solicitud no encontrada' }, { status: 404 });
  }
  if (offer.fosterProfile.userId !== auth.session.user.id) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }
  if (offer.status !== 'PENDING') {
    return NextResponse.json({ success: false, error: 'La solicitud ya fue respondida' }, { status: 409 });
  }
  if (offer.expiresAt < new Date()) {
    await db.fosterOffer.update({ where: { id }, data: { status: 'EXPIRED' } });
    return NextResponse.json({ success: false, error: 'La solicitud venció' }, { status: 409 });
  }
  if (offer.fosterProfile.status !== 'ACTIVE') {
    return NextResponse.json({ success: false, error: 'Activá tu perfil para responder' }, { status: 409 });
  }

  const nextStatus = parsed.data.response;
  await db.$transaction(async (tx) => {
    await tx.fosterOffer.update({
      where: { id },
      data: { status: nextStatus, respondedAt: new Date() },
    });
    const transition = nextStatus === 'INTERESTED'
      ? await setCaseNeedStatus(tx, offer.rescueCaseId, 'FOSTER', 'INTERESTED')
      : null;
    await tx.rescueCaseEvent.create({
      data: {
        caseId: offer.rescueCaseId,
        actorId: auth.session.user.id,
        type: nextStatus === 'INTERESTED' ? 'FOSTER_INTERESTED' : 'FOSTER_DECLINED',
        fromStatus: offer.rescueCase.status,
        toStatus: transition?.caseStatus || offer.rescueCase.status,
      },
    });
  });

  await createNotification({
    userId: offer.rescueCase.createdByUserId,
    actorId: auth.session.user.id,
    type: 'FOSTER_RESPONSE',
    title: nextStatus === 'INTERESTED' ? 'Un hogar puede ayudar' : 'Respuesta de un hogar de tránsito',
    body: nextStatus === 'INTERESTED'
      ? `${auth.session.user.name || 'Un hogar'} quiere conversar sobre el caso`
      : 'Un hogar indicó que esta vez no puede recibir a la mascota',
    link: `/hogares-de-transito/casos/${offer.rescueCaseId}`,
    entityId: offer.id,
  });

  return NextResponse.json({ success: true, status: nextStatus });
}
