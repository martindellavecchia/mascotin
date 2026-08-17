import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { parseFosterList } from '@/lib/foster';
import { expireVolunteerOffers } from '@/lib/server/volunteer-network';
import { toGeneralZone } from '@/lib/rescue';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  await expireVolunteerOffers();
  const profile = await db.volunteerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ success: true, offers: [] });
  const offers = await db.volunteerOffer.findMany({
    where: { volunteerProfileId: profile.id, status: { in: ['PENDING', 'INTERESTED', 'SELECTED'] } },
    include: {
      need: {
        include: {
          rescueCase: { select: { id: true, species: true, size: true, urgency: true, location: true, images: true, status: true } },
        },
      },
      assignment: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json({
    success: true,
    offers: offers.map((offer) => ({
      id: offer.id,
      status: offer.status,
      role: offer.role,
      distanceKm: offer.distanceKm,
      score: offer.score,
      reasons: parseFosterList(offer.reasons),
      expiresAt: offer.expiresAt,
      assignment: offer.assignment,
      need: {
        id: offer.need.id,
        type: offer.need.type,
        details: offer.need.details,
        status: offer.need.status,
      },
      rescueCase: {
        ...offer.need.rescueCase,
        location: toGeneralZone(offer.need.rescueCase.location),
        images: parseFosterList(offer.need.rescueCase.images),
      },
    })),
  });
}
