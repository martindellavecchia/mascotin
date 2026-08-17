import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const rescueCase = await db.rescueCase.findUnique({
    where: { id },
    include: {
      placements: { where: { status: { in: ['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'] } }, select: { id: true } },
      needs: { include: { volunteerAssignments: { where: { status: 'ACTIVE' }, select: { id: true } } } },
    },
  });
  if (!rescueCase) {
    return NextResponse.json({ success: false, error: 'Caso no encontrado' }, { status: 404 });
  }
  if (rescueCase.createdByUserId !== auth.session.user.id) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }
  if (rescueCase.placements.length > 0 || rescueCase.needs.some((need) => need.volunteerAssignments.length > 0)) {
    return NextResponse.json(
      { success: false, error: 'Cancelá primero las ayudas activas del caso' },
      { status: 409 }
    );
  }

  await db.$transaction([
    db.rescueCase.update({ where: { id }, data: { status: 'CANCELLED' } }),
    db.fosterOffer.updateMany({
      where: { rescueCaseId: id, status: { in: ['PENDING', 'INTERESTED'] } },
      data: { status: 'CLOSED' },
    }),
    db.volunteerOffer.updateMany({
      where: { need: { rescueCaseId: id }, status: { in: ['PENDING', 'INTERESTED'] } },
      data: { status: 'CLOSED' },
    }),
    db.rescueNeed.updateMany({ where: { rescueCaseId: id }, data: { status: 'CANCELLED' } }),
    db.rescueCaseEvent.create({
      data: {
        caseId: id,
        actorId: auth.session.user.id,
        type: 'CASE_CANCELLED',
        fromStatus: rescueCase.status,
        toStatus: 'CANCELLED',
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
