import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createNotification } from '@/lib/notifications';

class SelectionConflict extends Error {}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const offer = await db.fosterOffer.findUnique({
    where: { id },
    include: { rescueCase: true, fosterProfile: true },
  });
  if (!offer) {
    return NextResponse.json({ success: false, error: 'Solicitud no encontrada' }, { status: 404 });
  }
  if (offer.rescueCase.createdByUserId !== auth.session.user.id) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }
  if (offer.status !== 'INTERESTED') {
    return NextResponse.json(
      { success: false, error: 'El hogar todavía no confirmó que puede ayudar' },
      { status: 409 }
    );
  }

  try {
    const placement = await db.$transaction(async (tx) => {
      const currentOffer = await tx.fosterOffer.findUnique({
        where: { id: offer.id },
        include: { rescueCase: true, fosterProfile: true },
      });
      if (!currentOffer || currentOffer.status !== 'INTERESTED') {
        throw new SelectionConflict('La disponibilidad del hogar cambió');
      }

      const claimedCase = await tx.rescueCase.updateMany({
        where: {
          id: currentOffer.rescueCaseId,
          status: { in: ['SEARCHING', 'INTERESTED'] },
        },
        data: { status: 'COORDINATING' },
      });
      if (claimedCase.count !== 1) throw new SelectionConflict('El caso ya tiene un hogar seleccionado');

      const claimedCapacity = await tx.fosterProfile.updateMany({
        where: {
          id: currentOffer.fosterProfileId,
          status: 'ACTIVE',
          occupiedSlots: { lt: currentOffer.fosterProfile.capacity },
        },
        data: { occupiedSlots: { increment: 1 } },
      });
      if (claimedCapacity.count !== 1) throw new SelectionConflict('El hogar ya no tiene capacidad disponible');

      await tx.fosterOffer.update({
        where: { id: currentOffer.id },
        data: { status: 'SELECTED', selectedAt: new Date() },
      });
      await tx.fosterOffer.updateMany({
        where: {
          rescueCaseId: currentOffer.rescueCaseId,
          id: { not: currentOffer.id },
          status: { in: ['PENDING', 'INTERESTED'] },
        },
        data: { status: 'CLOSED' },
      });

      const expectedEndAt = new Date();
      expectedEndAt.setUTCDate(expectedEndAt.getUTCDate() + currentOffer.rescueCase.requestedDays);
      const created = await tx.fosterPlacement.create({
        data: {
          rescueCaseId: currentOffer.rescueCaseId,
          fosterProfileId: currentOffer.fosterProfileId,
          offerId: currentOffer.id,
          expectedEndAt,
        },
      });
      await tx.rescueCaseEvent.create({
        data: {
          caseId: currentOffer.rescueCaseId,
          actorId: auth.session.user.id,
          type: 'FOSTER_SELECTED',
          fromStatus: currentOffer.rescueCase.status,
          toStatus: 'COORDINATING',
          details: JSON.stringify({ placementId: created.id }),
        },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await createNotification({
      userId: offer.fosterProfile.userId,
      actorId: auth.session.user.id,
      type: 'FOSTER_PLACEMENT',
      title: 'Te eligieron para este tránsito',
      body: 'Ya pueden conversar y coordinar la entrega dentro de MascoTin',
      link: `/hogares-de-transito/casos/${offer.rescueCaseId}`,
      entityId: placement.id,
    });

    return NextResponse.json({ success: true, placement }, { status: 201 });
  } catch (error) {
    if (error instanceof SelectionConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')) {
      return NextResponse.json(
        { success: false, error: error.message || 'El caso cambió mientras lo estabas seleccionando' },
        { status: 409 }
      );
    }
    console.error('Error selecting foster offer:', error);
    return NextResponse.json({ success: false, error: 'No se pudo seleccionar el hogar' }, { status: 500 });
  }
}
