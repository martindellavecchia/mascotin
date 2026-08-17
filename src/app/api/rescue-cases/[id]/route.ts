import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import {
  matchesFosterAlertPreferences,
  parseFosterList,
  scoreFosterCandidate,
} from '@/lib/foster';
import { parseImageUrls } from '@/lib/media';
import { matchesSolidaritySubscription, toGeneralZone } from '@/lib/rescue';
import { serializeRescueNeeds } from '@/lib/server/rescue-needs';

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
      createdBy: { select: { id: true, name: true, image: true, syntheticRunId: true } },
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
      needs: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        include: {
          volunteerOffers: {
            orderBy: [{ status: 'asc' }, { score: 'desc' }],
            include: { volunteerProfile: { include: { user: { select: { id: true, name: true, image: true } } } } },
          },
          volunteerAssignments: {
            orderBy: { createdAt: 'desc' },
            include: { volunteerProfile: { include: { user: { select: { id: true, name: true, image: true } } } } },
          },
        },
      },
    },
  });
  if (!rescueCase) {
    return NextResponse.json({ success: false, error: 'Caso no encontrado' }, { status: 404 });
  }

  const viewer = await db.user.findUnique({ where: { id: auth.session.user.id }, select: { syntheticRunId: true } });
  if (rescueCase.createdBy.syntheticRunId !== (viewer?.syntheticRunId || null)) {
    return NextResponse.json({ success: false, error: 'Caso no encontrado' }, { status: 404 });
  }
  const isCreator = rescueCase.createdByUserId === auth.session.user.id;
  const viewerOffer = rescueCase.offers.find(
    (offer) => offer.fosterProfile.userId === auth.session.user.id
  );
  const viewerPlacement = rescueCase.placements.find(
    (placement) => placement.fosterProfile.userId === auth.session.user.id
  );
  const viewerVolunteerOffer = rescueCase.needs.flatMap((need) => need.volunteerOffers)
    .find((offer) => offer.volunteerProfile.userId === auth.session.user.id);
  const viewerVolunteerAssignment = rescueCase.needs.flatMap((need) => need.volunteerAssignments)
    .find((assignment) => assignment.volunteerProfile.userId === auth.session.user.id);
  if (!isCreator && !viewerOffer && !viewerPlacement && !viewerVolunteerOffer && !viewerVolunteerAssignment) {
    const profile = await db.fosterProfile.findUnique({ where: { userId: auth.session.user.id } });
    const fosterNeedOpen = rescueCase.needs.some((need) => need.type === 'FOSTER' && ['OPEN', 'INTERESTED'].includes(need.status));
    const candidate = profile && fosterNeedOpen ? scoreFosterCandidate(rescueCase, profile) : null;
    const matchesSubscription = Boolean(
      profile && candidate && matchesFosterAlertPreferences(rescueCase, profile, candidate.distanceKm),
    );
    const solidarityProfile = await db.solidarityAlertProfile.findUnique({
      where: { userId: auth.session.user.id },
      include: { subscriptions: { where: { enabled: true } } },
    });
    const matchesSolidarity = Boolean(solidarityProfile && solidarityProfile.subscriptions.some((subscription) => {
      const relevant = subscription.type === 'FOSTER'
        ? fosterNeedOpen
        : subscription.type === 'VETERINARY' && rescueCase.needs.some((need) => need.type === 'VETERINARY' && ['OPEN', 'INTERESTED'].includes(need.status));
      return relevant && matchesSolidaritySubscription({
        type: subscription.type,
        species: rescueCase.species,
        size: rescueCase.size,
        urgency: rescueCase.urgency,
        latitude: rescueCase.latitude,
        longitude: rescueCase.longitude,
      }, {
        type: subscription.type,
        enabled: subscription.enabled,
        radiusKm: subscription.radiusKm,
        species: subscription.species,
        sizes: subscription.sizes,
        urgencies: subscription.urgencies,
        latitude: solidarityProfile.latitude,
        longitude: solidarityProfile.longitude,
      });
    }));
    const blockedRelationship = matchesSubscription || matchesSolidarity
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
    const canViewFromSubscription = (matchesSubscription || matchesSolidarity) && !blockedRelationship;
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
        needs: serializeRescueNeeds(rescueCase.needs).map((need) => ({ ...need, details: null })),
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
        canExpressInterest: Boolean(candidate && fosterNeedOpen),
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
          location: toGeneralZone(offer.fosterProfile.location),
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
    viewerRole: isCreator ? 'CREATOR' : viewerOffer || viewerPlacement ? 'FOSTER' : 'VOLUNTEER',
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
      location: isCreator ? rescueCase.location : toGeneralZone(rescueCase.location),
      searchRadiusKm: rescueCase.searchRadiusKm,
      requestedDays: rescueCase.requestedDays,
      createdAt: rescueCase.createdAt,
      updatedAt: rescueCase.updatedAt,
      createdBy: { id: rescueCase.createdBy.id, name: rescueCase.createdBy.name, image: rescueCase.createdBy.image },
      needs: serializeRescueNeeds(rescueCase.needs),
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
      volunteerOffers: isCreator
        ? rescueCase.needs.flatMap((need) => need.volunteerOffers.map((offer) => ({
            id: offer.id,
            needId: need.id,
            needType: need.type,
            role: offer.role,
            status: offer.status,
            distanceKm: offer.distanceKm,
            score: offer.score,
            reasons: parseFosterList(offer.reasons),
            expiresAt: offer.expiresAt,
            volunteer: offer.volunteerProfile.user,
          })))
        : viewerVolunteerOffer ? [{
            id: viewerVolunteerOffer.id,
            role: viewerVolunteerOffer.role,
            status: viewerVolunteerOffer.status,
            distanceKm: viewerVolunteerOffer.distanceKm,
            score: viewerVolunteerOffer.score,
            reasons: parseFosterList(viewerVolunteerOffer.reasons),
            expiresAt: viewerVolunteerOffer.expiresAt,
          }] : [],
      volunteerAssignments: rescueCase.needs.flatMap((need) => need.volunteerAssignments
        .filter((assignment) => isCreator || assignment.volunteerProfile.userId === auth.session.user.id)
        .map((assignment) => ({
          id: assignment.id,
          needId: need.id,
          needType: need.type,
          status: assignment.status,
          startedAt: assignment.startedAt,
          completedAt: assignment.completedAt,
          cancelledAt: assignment.cancelledAt,
          volunteer: assignment.volunteerProfile.user,
        }))),
    },
  });
}
