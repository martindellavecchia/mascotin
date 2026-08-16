import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { parseFosterList } from '@/lib/foster';
import { parseImageUrls } from '@/lib/media';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const rescueCase = await db.rescueCase.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      offers: {
        orderBy: [{ status: 'asc' }, { score: 'desc' }],
        include: {
          fosterProfile: {
            include: { user: { select: { id: true, name: true, image: true } } },
          },
        },
      },
      placements: {
        orderBy: { createdAt: 'desc' },
        include: {
          fosterProfile: {
            include: { user: { select: { id: true, name: true, image: true } } },
          },
        },
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });
  if (!rescueCase) {
    return NextResponse.json({ success: false, error: 'Caso no encontrado' }, { status: 404 });
  }

  const isCreator = rescueCase.createdByUserId === auth.session.user.id;
  const viewerOffer = rescueCase.offers.find(
    (offer) => offer.fosterProfile.userId === auth.session.user.id
  );
  const viewerPlacement = rescueCase.placements.find(
    (placement) => placement.fosterProfile.userId === auth.session.user.id
  );
  if (!isCreator && !viewerOffer && !viewerPlacement) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }

  const visibleOffers = isCreator
    ? rescueCase.offers.map((offer) => ({
        id: offer.id,
        status: offer.status,
        score: offer.score,
        distanceKm: offer.distanceKm,
        reasons: parseFosterList(offer.reasons),
        expiresAt: offer.expiresAt,
        fosterProfile: {
          id: offer.fosterProfile.id,
          status: offer.fosterProfile.status,
          acceptsSpecies: parseFosterList(offer.fosterProfile.acceptsSpecies),
          acceptsSizes: parseFosterList(offer.fosterProfile.acceptsSizes),
          capacity: offer.fosterProfile.capacity,
          occupiedSlots: offer.fosterProfile.occupiedSlots,
          location: offer.fosterProfile.location,
          maxDurationDays: offer.fosterProfile.maxDurationDays,
          housingType: offer.fosterProfile.housingType,
          hasYard: offer.fosterProfile.hasYard,
          hasKids: offer.fosterProfile.hasKids,
          hasOtherPets: offer.fosterProfile.hasOtherPets,
          experience: offer.fosterProfile.experience,
          notes: offer.fosterProfile.notes,
          user: offer.fosterProfile.user,
        },
      }))
    : viewerOffer
      ? [{
          id: viewerOffer.id,
          status: viewerOffer.status,
          score: viewerOffer.score,
          distanceKm: viewerOffer.distanceKm,
          reasons: parseFosterList(viewerOffer.reasons),
          expiresAt: viewerOffer.expiresAt,
        }]
      : [];

  const placements = rescueCase.placements
    .filter((placement) => isCreator || placement.fosterProfile.userId === auth.session.user.id)
    .map((placement) => ({
      id: placement.id,
      status: placement.status,
      requesterConfirmedAt: placement.requesterConfirmedAt,
      fosterConfirmedAt: placement.fosterConfirmedAt,
      startedAt: placement.startedAt,
      expectedEndAt: placement.expectedEndAt,
      endedAt: placement.endedAt,
      outcome: placement.outcome,
      foster: placement.fosterProfile.user,
    }));

  return NextResponse.json({
    success: true,
    viewerRole: isCreator ? 'CREATOR' : 'FOSTER',
    viewerUserId: auth.session.user.id,
    case: {
      id: rescueCase.id,
      status: rescueCase.status,
      species: rescueCase.species,
      size: rescueCase.size,
      urgency: rescueCase.urgency,
      apparentCondition: rescueCase.apparentCondition,
      description: rescueCase.description,
      images: parseImageUrls(rescueCase.images),
      location: rescueCase.location,
      searchRadiusKm: rescueCase.searchRadiusKm,
      requestedDays: rescueCase.requestedDays,
      createdAt: rescueCase.createdAt,
      updatedAt: rescueCase.updatedAt,
      createdBy: rescueCase.createdBy,
      offers: visibleOffers,
      placements,
      events: rescueCase.events,
    },
  });
}
