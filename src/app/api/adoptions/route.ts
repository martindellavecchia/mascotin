import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createAdoptionListingSchema } from '@/lib/schemas';
import { resolveCoordinates } from '@/lib/pet-payload';
import { withImageFields } from '@/lib/media';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'OPEN';

  const listings = await db.adoptionListing.findMany({
    where: status === '_all' ? {} : { status },
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
          goodWithKids: true,
          goodWithDogs: true,
          specialNeeds: true,
          location: true,
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
      ...listing,
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

    const coords = await resolveCoordinates(parsed.data.location || pet.location, pet.latitude, pet.longitude);
    const listing = await db.adoptionListing.create({
      data: {
        petId: pet.id,
        listedByUserId: auth.session.user.id,
        character: parsed.data.character,
        specialNeeds: parsed.data.specialNeeds,
        requirements: parsed.data.requirements,
        location: parsed.data.location || pet.location,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      },
    });

    return NextResponse.json({ success: true, listing }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo crear la ficha' }, { status: 500 });
  }
}
