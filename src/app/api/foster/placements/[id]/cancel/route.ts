import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createNotification } from '@/lib/notifications';
import { createOffersForCase } from '@/lib/server/foster';

class PlacementConflict extends Error {}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const placement = await db.fosterPlacement.findUnique({
    where: { id },
    include: { rescueCase: true, fosterProfile: true },
  });
  if (!placement) {
    return NextResponse.json({ success: false, error: 'Tránsito no encontrado' }, { status: 404 });
  }
  const isRequester = placement.rescueCase.createdByUserId === auth.session.user.id;
  const isFoster = placement.fosterProfile.userId === auth.session.user.id;
  if (!isRequester && !isFoster) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }
  if (placement.status !== 'COORDINATING') {
    return NextResponse.json(
      { success: false, error: 'Solo puede cancelarse antes de confirmar la entrega' },
      { status: 409 }
    );
  }

  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.fosterPlacement.updateMany({
        where: { id, status: 'COORDINATING' },
        data: { status: 'CANCELLED', endedAt: new Date() },
      });
      if (claimed.count !== 1) throw new PlacementConflict('La coordinación ya había cambiado');
      await tx.fosterProfile.updateMany({
        where: { id: placement.fosterProfileId, occupiedSlots: { gt: 0 } },
        data: { occupiedSlots: { decrement: 1 } },
      });
      await tx.fosterOffer.update({
        where: { id: placement.offerId },
        data: { status: 'CLOSED' },
      });
      await tx.rescueCase.updateMany({
        where: { id: placement.rescueCaseId, status: 'COORDINATING' },
        data: { status: 'SEARCHING' },
      });
      await tx.rescueCaseEvent.create({
        data: {
          caseId: placement.rescueCaseId,
          actorId: auth.session.user.id,
          type: 'COORDINATION_CANCELLED',
          fromStatus: 'COORDINATING',
          toStatus: 'SEARCHING',
        },
      });
    });
  } catch (error) {
    if (error instanceof PlacementConflict) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Error cancelling foster placement:', error);
    return NextResponse.json({ success: false, error: 'No se pudo cancelar la coordinación' }, { status: 500 });
  }

  const recipientId = isRequester
    ? placement.fosterProfile.userId
    : placement.rescueCase.createdByUserId;
  await Promise.all([
    createOffersForCase(placement.rescueCaseId),
    createNotification({
      userId: recipientId,
      actorId: auth.session.user.id,
      type: 'FOSTER_PLACEMENT',
      title: 'La coordinación fue cancelada',
      body: 'El caso volvió a buscar un hogar de tránsito',
      link: `/help/cases/${placement.rescueCaseId}`,
      entityId: placement.id,
    }),
  ]);

  return NextResponse.json({ success: true });
}
