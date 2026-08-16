import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { parseFosterList, RESCUE_CONSENT_VERSION } from '@/lib/foster';
import { parseImageUrls } from '@/lib/media';
import { resolveCoordinates } from '@/lib/pet-payload';
import { createRescueCaseSchema } from '@/lib/schemas';
import { createOffersForCase, expireFosterOffers } from '@/lib/server/foster';
import { notifySubscribedFosters } from '@/lib/server/foster-network';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await expireFosterOffers();

  const profile = await db.fosterProfile.findUnique({
    where: { userId: auth.session.user.id },
    select: { id: true, status: true },
  });

  const [createdCases, offers, fosterPlacements] = await Promise.all([
    db.rescueCase.findMany({
      where: { createdByUserId: auth.session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        offers: { select: { status: true } },
        placements: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true },
        },
        communityPost: { select: { isVisible: true } },
        adoptionDraft: { select: { id: true, status: true, listingId: true } },
        adoptionListing: { select: { id: true, status: true } },
      },
      take: 50,
    }),
    profile
      ? db.fosterOffer.findMany({
          where: {
            fosterProfileId: profile.id,
            status: { in: ['PENDING', 'INTERESTED', 'SELECTED'] },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            rescueCase: {
              include: {
                createdBy: { select: { id: true, name: true } },
              },
            },
            placement: { select: { id: true, status: true } },
          },
          take: 50,
        })
      : Promise.resolve([]),
    profile
      ? db.fosterPlacement.findMany({
          where: {
            fosterProfileId: profile.id,
            status: { in: ['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'] },
          },
          include: { rescueCase: true },
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    success: true,
    createdCases: createdCases.map((rescueCase) => ({
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
      offerCount: rescueCase.offers.length,
      interestedCount: rescueCase.offers.filter((offer) => offer.status === 'INTERESTED').length,
      placement: rescueCase.placements[0] || null,
      isPublished: Boolean(rescueCase.communityPost?.isVisible),
      adoptionDraft: rescueCase.adoptionDraft,
      adoptionListing: rescueCase.adoptionListing,
    })),
    offers: offers.map((offer) => ({
      id: offer.id,
      status: offer.status,
      distanceKm: offer.distanceKm,
      score: offer.score,
      reasons: parseFosterList(offer.reasons),
      expiresAt: offer.expiresAt,
      placement: offer.placement,
      rescueCase: {
        id: offer.rescueCase.id,
        status: offer.rescueCase.status,
        species: offer.rescueCase.species,
        size: offer.rescueCase.size,
        urgency: offer.rescueCase.urgency,
        apparentCondition: offer.rescueCase.apparentCondition,
        description: offer.rescueCase.description,
        images: parseImageUrls(offer.rescueCase.images),
        location: offer.rescueCase.location,
        requestedDays: offer.rescueCase.requestedDays,
        createdAt: offer.rescueCase.createdAt,
        createdBy: offer.rescueCase.createdBy,
      },
    })),
    fosterPlacements: fosterPlacements.map((placement) => ({
      id: placement.id,
      status: placement.status,
      rescueCase: {
        id: placement.rescueCase.id,
        species: placement.rescueCase.species,
        location: placement.rescueCase.location,
        images: parseImageUrls(placement.rescueCase.images),
      },
    })),
  });
}
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const parsed = createRescueCaseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Revisá los datos del caso', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const coordinates = await resolveCoordinates(
      parsed.data.location,
      parsed.data.latitude,
      parsed.data.longitude
    );
    if (!coordinates) {
      return NextResponse.json(
        { success: false, error: 'No pudimos ubicar esa zona. Usá tu ubicación actual o ingresá una zona más precisa.' },
        { status: 400 }
      );
    }

    const rescueCase = await db.$transaction(async (tx) => {
      const created = await tx.rescueCase.create({
        data: {
          createdByUserId: auth.session.user.id,
          species: parsed.data.species,
          size: parsed.data.size,
          urgency: parsed.data.urgency,
          apparentCondition: parsed.data.apparentCondition,
          description: parsed.data.description,
          images: JSON.stringify(parsed.data.images),
          location: parsed.data.location,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          searchRadiusKm: parsed.data.searchRadiusKm,
          requestedDays: parsed.data.requestedDays,
          consentAcceptedAt: new Date(),
          consentVersion: RESCUE_CONSENT_VERSION,
        },
      });
      await tx.rescueCaseEvent.create({
        data: {
          caseId: created.id,
          actorId: auth.session.user.id,
          type: 'CASE_CREATED',
          toStatus: 'SEARCHING',
          details: JSON.stringify({ radiusKm: created.searchRadiusKm }),
        },
      });
      return created;
    });

    const offerCount = await createOffersForCase(rescueCase.id);
    await notifySubscribedFosters(rescueCase.id);

    return NextResponse.json(
      {
        success: true,
        case: {
          id: rescueCase.id,
          status: rescueCase.status,
          location: rescueCase.location,
          searchRadiusKm: rescueCase.searchRadiusKm,
          images: parsed.data.images,
        },
        offerCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating rescue case:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo crear la solicitud de ayuda' },
      { status: 500 }
    );
  }
}
