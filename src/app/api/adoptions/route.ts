import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createAdoptionListingSchema } from '@/lib/schemas';
import { resolveCoordinates } from '@/lib/pet-payload';
import { withImageFields } from '@/lib/media';
import { toGeneralZone } from '@/lib/rescue';
import { notifySolidaritySubscribersForAdoption } from '@/lib/server/solidarity-alerts';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'OPEN';
  const viewer = await db.user.findUnique({
    where: { id: auth.session.user.id },
    select: { syntheticRunId: true },
  });

  const listings = await db.adoptionListing.findMany({
    where: {
      ...(status === '_all' ? {} : { status }),
      listedBy: { syntheticRunId: viewer?.syntheticRunId || null },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          petType: true,
          breed: true,
          age: true,
          size: true,
          energy: true,
          images: true,
          thumbnailIndex: true,
          goodWithKids: true,
          goodWithDogs: true,
          specialNeeds: true,
        },
      },
      listedBy: { select: { id: true, name: true } },
      _count: { select: { applications: true } },
    },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    listings: listings.map((listing) => ({
      id: listing.id,
      petId: listing.petId,
      listedByUserId: listing.listedByUserId,
      sourceRescueCaseId: listing.sourceRescueCaseId,
      status: listing.status,
      character: listing.character,
      specialNeeds: listing.specialNeeds,
      requirements: listing.requirements,
      location: listing.location,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      listedBy: listing.listedBy,
      _count: listing._count,
      pet: withImageFields(listing.pet),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const parsed = createAdoptionListingSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: parsed.error.issues }, { status: 400 });
    }

    const pet = await db.pet.findUnique({
      where: { id: parsed.data.petId },
      include: { owner: true },
    });
    if (!pet || pet.owner.userId !== auth.session.user.id) {
      return NextResponse.json({ success: false, error: 'Solo el dueño puede publicar esta ficha' }, { status: 403 });
    }

    const existing = await db.adoptionListing.findFirst({
      where: { petId: pet.id, status: { in: ['OPEN', 'PENDING'] } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Esta mascota ya tiene una ficha activa' }, { status: 409 });
    }

    const requestedLocation = parsed.data.location?.trim();
    const listingLocation = requestedLocation || pet.location;
    const reusesPetLocation = !requestedLocation || requestedLocation === pet.location?.trim();
    const coords = await resolveCoordinates(
      listingLocation,
      reusesPetLocation ? pet.latitude : undefined,
      reusesPetLocation ? pet.longitude : undefined,
    );
    if (!coords) {
      return NextResponse.json(
        { success: false, error: 'No pudimos ubicar la zona. Actualizá la ubicación antes de publicar.' },
        { status: 400 },
      );
    }
    const publicListingLocation = toGeneralZone(listingLocation);
    const listing = await db.adoptionListing.create({
      data: {
        petId: pet.id,
        listedByUserId: auth.session.user.id,
        character: parsed.data.character,
        specialNeeds: parsed.data.specialNeeds,
        requirements: parsed.data.requirements,
        location: publicListingLocation,
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    });
    await notifySolidaritySubscribersForAdoption(listing.id);

    return NextResponse.json({
      success: true,
      listing: {
        id: listing.id,
        petId: listing.petId,
        status: listing.status,
        character: listing.character,
        specialNeeds: listing.specialNeeds,
        requirements: listing.requirements,
        location: listing.location,
        createdAt: listing.createdAt,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo crear la ficha' }, { status: 500 });
  }
}
