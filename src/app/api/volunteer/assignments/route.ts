import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { parseImageUrls } from '@/lib/media';
import { toGeneralZone } from '@/lib/rescue';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const userId = auth.session.user.id;
  const assignments = await db.volunteerAssignment.findMany({
    where: {
      OR: [
        { volunteerProfile: { userId } },
        { need: { rescueCase: { createdByUserId: userId } } },
      ],
    },
    include: {
      volunteerProfile: { include: { user: { select: { id: true, name: true, image: true } } } },
      need: { include: { rescueCase: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({
    success: true,
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      status: assignment.status,
      startedAt: assignment.startedAt,
      completedAt: assignment.completedAt,
      cancelledAt: assignment.cancelledAt,
      isRequester: assignment.need.rescueCase.createdByUserId === userId,
      volunteer: assignment.volunteerProfile.user,
      need: {
        id: assignment.need.id,
        type: assignment.need.type,
        details: assignment.need.details,
        status: assignment.need.status,
      },
      rescueCase: {
        id: assignment.need.rescueCase.id,
        species: assignment.need.rescueCase.species,
        size: assignment.need.rescueCase.size,
        urgency: assignment.need.rescueCase.urgency,
        location: toGeneralZone(assignment.need.rescueCase.location),
        images: parseImageUrls(assignment.need.rescueCase.images),
      },
    })),
  });
}
