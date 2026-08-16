import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createNotification } from '@/lib/notifications';

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
  if (placement.status === 'ACTIVE') {
    return NextResponse.json({ success: true, placement });
  }
  if (placement.status !== 'COORDINATING') {
    return NextResponse.json({ success: false, error: 'El tránsito ya no está coordinándose' }, { status: 409 });
  }

  const now = new Date();
  let updated;
  try {
    updated = await db.$transaction(async (tx) => {
      const confirmation = await tx.fosterPlacement.updateMany({
        where: { id, status: 'COORDINATING' },
        data: isRequester
          ? { requesterConfirmedAt: placement.requesterConfirmedAt || now }
          : { fosterConfirmedAt: placement.fosterConfirmedAt || now },
      });
      if (confirmation.count !== 1) {
        const current = await tx.fosterPlacement.findUnique({ where: { id } });
        if (current?.status === 'ACTIVE') return current;
        throw new PlacementConflict('El tránsito cambió mientras confirmabas la entrega');
      }

      const saved = await tx.fosterPlacement.findUnique({ where: { id } });
      if (!saved) throw new PlacementConflict('El tránsito ya no está disponible');

      if (saved.requesterConfirmedAt && saved.fosterConfirmedAt) {
        const activated = await tx.fosterPlacement.updateMany({
          where: { id, status: 'COORDINATING' },
          data: { status: 'ACTIVE', startedAt: now },
        });
        if (activated.count === 1) {
          await tx.rescueCase.updateMany({
            where: { id: placement.rescueCaseId, status: 'COORDINATING' },
            data: { status: 'IN_FOSTER' },
          });
          await tx.rescueCaseEvent.create({
            data: {
              caseId: placement.rescueCaseId,
              actorId: auth.session.user.id,
              type: 'HANDOFF_CONFIRMED',
              fromStatus: 'COORDINATING',
              toStatus: 'IN_FOSTER',
              details: JSON.stringify({ placementId: placement.id }),
            },
          });
        }
        const current = await tx.fosterPlacement.findUnique({ where: { id } });
        if (!current) throw new PlacementConflict('El tránsito ya no está disponible');
        return current;
      }

      return saved;
    });
  } catch (error) {
    if (error instanceof PlacementConflict) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Error confirming foster placement:', error);
    return NextResponse.json({ success: false, error: 'No se pudo confirmar la entrega' }, { status: 500 });
  }

  const recipientId = isRequester
    ? placement.fosterProfile.userId
    : placement.rescueCase.createdByUserId;
  await createNotification({
    userId: recipientId,
    actorId: auth.session.user.id,
    type: 'FOSTER_PLACEMENT',
    title: updated.status === 'ACTIVE' ? 'El tránsito comenzó' : 'Confirmación de entrega',
    body: updated.status === 'ACTIVE'
      ? 'Ambas partes confirmaron que la mascota ya está en el hogar'
      : 'La otra parte confirmó la entrega. Falta tu confirmación.',
    link: `/help/cases/${placement.rescueCaseId}`,
    entityId: placement.id,
  });

  return NextResponse.json({ success: true, placement: updated });
}
