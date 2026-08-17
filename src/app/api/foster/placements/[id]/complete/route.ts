import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createNotification } from '@/lib/notifications';
import { completeFosterPlacementSchema } from '@/lib/schemas';
import { FosterAdoptionError, startFosterAdoption } from '@/lib/server/foster-adoption';
import { setCaseNeedStatus } from '@/lib/server/rescue-needs';

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

  if (parsed.data.outcome === 'NEEDS_ADOPTION') {
    try {
      const draft = await startFosterAdoption(id, auth.session.user.id);
      await createNotification({
        userId: placement.fosterProfile.userId,
        actorId: auth.session.user.id,
        type: 'FOSTER_ADOPTION',
        title: 'Prepará la ficha de adopción',
        body: 'El animal sigue ocupando tu cupo hasta completar la entrega definitiva.',
        link: `/hogares-de-transito/casos/${placement.rescueCaseId}`,
        entityId: draft.id,
        dedupeKey: `adoption-draft-ready:${draft.id}`,
      });
      return NextResponse.json({ success: true, caseStatus: 'NEEDS_ADOPTION', draftId: draft.id });
    } catch (error) {
      if (error instanceof FosterAdoptionError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      console.error('Error starting foster adoption:', error);
      return NextResponse.json({ success: false, error: 'No se pudo iniciar la adopción' }, { status: 500 });
    }
  }

  let nextCaseStatus = placement.rescueCase.status;
  try {
    nextCaseStatus = await db.$transaction(async (tx) => {
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
      const transition = await setCaseNeedStatus(tx, placement.rescueCaseId, 'FOSTER', 'FULFILLED');
      const caseStatus = transition?.caseStatus || placement.rescueCase.status;
      await tx.rescueCaseEvent.create({
        data: {
          caseId: placement.rescueCaseId,
          actorId: auth.session.user.id,
          type: 'PLACEMENT_COMPLETED',
          fromStatus: 'IN_FOSTER',
          toStatus: caseStatus,
          details: JSON.stringify({ outcome: parsed.data.outcome }),
        },
      });
      return caseStatus;
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
    body: nextCaseStatus === 'RESOLVED' ? 'El caso fue marcado como resuelto' : 'El tránsito terminó y las demás ayudas siguen en curso',
    link: `/hogares-de-transito/casos/${placement.rescueCaseId}`,
    entityId: placement.id,
  });

  return NextResponse.json({ success: true, caseStatus: nextCaseStatus });
}
