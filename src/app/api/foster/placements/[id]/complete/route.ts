import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createNotification } from '@/lib/notifications';
import { completeFosterPlacementSchema } from '@/lib/schemas';

class PlacementConflict extends Error {}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  const parsed = completeFosterPlacementSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Resultado inválido' }, { status: 400 });
  }

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
  if (placement.status !== 'ACTIVE') {
    return NextResponse.json({ success: false, error: 'El tránsito no está activo' }, { status: 409 });
  }

  const nextCaseStatus = parsed.data.outcome;
  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.fosterPlacement.updateMany({
        where: { id, status: 'ACTIVE' },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
          outcome: parsed.data.outcome,
        },
      });
      if (claimed.count !== 1) throw new PlacementConflict('El tránsito ya había cambiado');
      await tx.fosterProfile.updateMany({
        where: { id: placement.fosterProfileId, occupiedSlots: { gt: 0 } },
        data: { occupiedSlots: { decrement: 1 } },
      });
      await tx.rescueCase.updateMany({
        where: { id: placement.rescueCaseId, status: 'IN_FOSTER' },
        data: { status: nextCaseStatus },
      });
      await tx.rescueCaseEvent.create({
        data: {
          caseId: placement.rescueCaseId,
          actorId: auth.session.user.id,
          type: 'PLACEMENT_COMPLETED',
          fromStatus: 'IN_FOSTER',
          toStatus: nextCaseStatus,
          details: JSON.stringify({ outcome: parsed.data.outcome }),
        },
      });
    });
  } catch (error) {
    if (error instanceof PlacementConflict) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Error completing foster placement:', error);
    return NextResponse.json({ success: false, error: 'No se pudo finalizar el tránsito' }, { status: 500 });
  }

  const recipientId = isRequester
    ? placement.fosterProfile.userId
    : placement.rescueCase.createdByUserId;
  await createNotification({
    userId: recipientId,
    actorId: auth.session.user.id,
    type: 'FOSTER_PLACEMENT',
    title: 'Tránsito finalizado',
    body: nextCaseStatus === 'NEEDS_ADOPTION'
      ? 'El caso continúa buscando una familia definitiva'
      : 'El caso fue marcado como resuelto',
    link: `/help/cases/${placement.rescueCaseId}`,
    entityId: placement.id,
  });

  return NextResponse.json({ success: true, caseStatus: nextCaseStatus });
}
