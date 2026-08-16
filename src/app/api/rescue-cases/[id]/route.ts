import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import {
  matchesFosterAlertPreferences,
  parseFosterList,
  scoreFosterCandidate,
} from '@/lib/foster';
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
      communityPost: true,
      adoptionDraft: {
        select: {
          id: true,
          status: true,
          managedByUserId: true,
          listingId: true,
          fosterConfirmedAt: true,
          adopterConfirmedAt: true,
        },
      },
      adoptionListing: { select: { id: true, status: true } },
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
    const profile = await db.fosterProfile.findUnique({ where: { userId: auth.session.user.id } });
    const candidate = profile ? scoreFosterCandidate(rescueCase, profile) : null;
    const matchesSubscription = Boolean(
      profile && candidate && matchesFosterAlertPreferences(rescueCase, profile, candidate.distanceKm),
    );
    const blockedRelationship = matchesSubscription
      ? await db.blockedUser.findFirst({
          where: {
            OR: [
              { blockerId: rescueCase.createdByUserId, blockedId: auth.session.user.id },
              { blockerId: auth.session.user.id, blockedId: rescueCase.createdByUserId },
            ],
          },
          select: { id: true },
        })
      : null;
    const canViewFromSubscription = matchesSubscription && !blockedRelationship;
    if (!rescueCase.communityPost?.isVisible && !canViewFromSubscription) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }
    return NextResponse.json({
      success: true,
      viewerRole: 'VISITOR',
      viewerUserId: auth.session.user.id,
      case: {
        id: rescueCase.id,
        status: rescueCase.status,
        species: rescueCase.species,
        size: rescueCase.size,
        urgency: rescueCase.urgency,
        apparentCondition: 'La información detallada se comparte al coordinar.',
        description: rescueCase.communityPost?.content || 'Una mascota necesita un hogar de tránsito.',
        images: parseImageUrls(rescueCase.communityPost?.images || rescueCase.images).slice(0, 1),
        location: rescueCase.communityPost?.location || 'Cerca de tu zona',
        searchRadiusKm: rescueCase.searchRadiusKm,
        requestedDays: rescueCase.requestedDays,
        createdAt: rescueCase.createdAt,
        offers: [],
        placements: [],
        events: [],
        publication: rescueCase.communityPost ? {
          summary: rescueCase.communityPost.content,
          publicZone: rescueCase.communityPost.location,
          isVisible: rescueCase.communityPost.isVisible,
        } : null,
        adoptionDraft: null,
        adoptionListingId: rescueCase.adoptionListing?.status === 'OPEN' || rescueCase.adoptionListing?.status === 'PENDING'
          ? rescueCase.adoptionListing.id
          : null,
        canExpressInterest: Boolean(candidate && ['SEARCHING', 'INTERESTED'].includes(rescueCase.status)),
        hasFosterProfile: Boolean(profile),
      },
    });
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
      publication: rescueCase.communityPost ? {
        summary: rescueCase.communityPost.content,
        publicZone: rescueCase.communityPost.location,
        isVisible: rescueCase.communityPost.isVisible,
      } : null,
      adoptionDraft: rescueCase.adoptionDraft,
      adoptionListingId: rescueCase.adoptionListing?.id || null,
      canExpressInterest: false,
      hasFosterProfile: Boolean(viewerOffer || viewerPlacement),
    },
  });
}
