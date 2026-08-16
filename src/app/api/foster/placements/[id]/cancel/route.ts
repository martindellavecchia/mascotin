import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createNotification } from '@/lib/notifications';
import { createOffersForCase } from '@/lib/server/foster';
import { notifySubscribedFosters } from '@/lib/server/foster-network';

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
    include: { rescueCase: true, fosterProfile: true, adoptionDraft: true },
  });
  if (!placement) {
    return NextResponse.json({ success: false, error: 'Tránsito no encontrado' }, { status: 404 });
  }
  const isRequester = placement.rescueCase.createdByUserId === auth.session.user.id;
  const isFoster = placement.fosterProfile.userId === auth.session.user.id;
  if (!isRequester && !isFoster) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }
  const awaitingAdoption = placement.status === 'AWAITING_ADOPTION';
  if (!['COORDINATING', 'AWAITING_ADOPTION'].includes(placement.status)) {
    return NextResponse.json(
      { success: false, error: 'Este tránsito ya no puede cancelarse' },
      { status: 409 }
    );
  }
  if (awaitingAdoption && !isFoster) {
    return NextResponse.json({ success: false, error: 'Sólo el hogar puede indicar que ya no puede continuar' }, { status: 403 });
  }
  if (awaitingAdoption && placement.adoptionDraft?.status === 'MATCHED') {
    return NextResponse.json({ success: false, error: 'Cancelá primero la coordinación de adopción' }, { status: 409 });
  }

  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.fosterPlacement.updateMany({
        where: { id, status: placement.status },
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
        where: { id: placement.rescueCaseId, status: awaitingAdoption ? 'NEEDS_ADOPTION' : 'COORDINATING' },
        data: { status: 'SEARCHING' },
      });
      if (awaitingAdoption && placement.adoptionDraft) {
        await tx.fosterAdoptionDraft.update({ where: { id: placement.adoptionDraft.id }, data: { status: 'PAUSED' } });
        if (placement.adoptionDraft.listingId) {
          await tx.adoptionListing.update({ where: { id: placement.adoptionDraft.listingId }, data: { status: 'CLOSED' } });
        }
      }
      await tx.rescueCaseEvent.create({
        data: {
          caseId: placement.rescueCaseId,
          actorId: auth.session.user.id,
          type: awaitingAdoption ? 'ADOPTION_FOSTER_CANCELLED' : 'COORDINATION_CANCELLED',
          fromStatus: awaitingAdoption ? 'NEEDS_ADOPTION' : 'COORDINATING',
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
      title: awaitingAdoption ? 'El hogar ya no puede continuar' : 'La coordinación fue cancelada',
      body: 'El caso volvió a buscar un hogar de tránsito',
      link: `/hogares-de-transito/casos/${placement.rescueCaseId}`,
      entityId: placement.id,
    }),
  ]);
  await notifySubscribedFosters(placement.rescueCaseId);

  return NextResponse.json({ success: true });
}
