import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { passesMatchFilters, scorePetMatch } from '@/lib/matching';
import { currentOrigin } from '@/lib/matching';
import { DISCOVERY_CANDIDATE_LIMIT, DISCOVERY_CANDIDATE_ORDER, getPetDiscoveryQuery } from '@/lib/server/pet-discovery';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Iniciá sesión para continuar' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const currentPetId = searchParams.get('currentPetId');
    const petType = searchParams.get('petType');
    const location = searchParams.get('location');

    if (!currentPetId) {
      return NextResponse.json(
        { success: false, error: 'Elegí una de tus mascotas para buscar' },
        { status: 400 }
      );
    }

    const currentPet = await db.pet.findUnique({
      where: { id: currentPetId },
      include: { owner: true },
    });

    if (!currentPet) {
      return NextResponse.json(
        { success: false, error: 'No encontramos tu mascota' },
        { status: 404 }
      );
    }

    if (currentPet.owner.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No podés buscar compañeros para esta mascota' },
        { status: 403 }
      );
    }

    const { where, preferences } = await getPetDiscoveryQuery({
      userId: session.user.id, currentPet, petType, location,
    });

    const pets = await db.pet.findMany({
      where,
      orderBy: DISCOVERY_CANDIDATE_ORDER,
      include: {
        owner: {
          select: {
            name: true,
            location: true,
            image: true,
            bio: true,
            latitude: true,
            longitude: true,
            user: {
              select: {
                settings: {
                  select: { matchingPaused: true },
                },
              },
            },
          },
        },
      },
      take: DISCOVERY_CANDIDATE_LIMIT,
    });

    const origin = currentOrigin(currentPet, currentPet.owner);
    const filtered = pets
      .filter((pet) =>
        passesMatchFilters(
          {
            ...pet,
            owner: {
              location: pet.owner.location,
              bio: pet.owner.bio,
              latitude: pet.owner.latitude,
              longitude: pet.owner.longitude,
              user: pet.owner.user,
            },
          },
          preferences,
          origin
        )
      )
      .map((pet) => {
        const scored = scorePetMatch(
          currentPet,
          {
            ...pet,
            owner: {
              location: pet.owner.location,
              bio: pet.owner.bio,
              latitude: pet.owner.latitude,
              longitude: pet.owner.longitude,
              user: pet.owner.user,
            },
          },
          currentPet.owner.location,
          currentPet.owner.bio
        );
        return { ...pet, matchScore: scored.matchScore, matchReason: scored.matchReason };
      })
      .sort((left, right) => right.matchScore - left.matchScore);

    return NextResponse.json({
      success: true,
      pets: filtered,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'No pudimos cargar las mascotas. Intentá de nuevo.' },
      { status: 500 }
    );
  }
}
