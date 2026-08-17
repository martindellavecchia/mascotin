import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseMatchPreferences, passesMatchFilters, scorePetMatch } from '@/lib/matching';
import { currentOrigin } from '@/lib/matching';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const currentPetId = searchParams.get('currentPetId');
    const petType = searchParams.get('petType');
    const location = searchParams.get('location');

    if (!currentPetId) {
      return NextResponse.json(
        { success: false, error: 'currentPetId is required' },
        { status: 400 }
      );
    }

    const currentPet = await db.pet.findUnique({
      where: { id: currentPetId },
      include: { owner: true },
    });

    if (!currentPet) {
      return NextResponse.json(
        { success: false, error: 'Current pet not found' },
        { status: 404 }
      );
    }

    if (currentPet.owner.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to fetch matches for this pet' },
        { status: 403 }
      );
    }

    const settings = await db.userSettings.findUnique({
      where: { userId: session.user.id },
    });
    const viewer = await db.user.findUnique({
      where: { id: session.user.id },
      select: { syntheticRunId: true },
    });
    const preferences = parseMatchPreferences(settings);

    const where: Prisma.PetWhereInput = {
      isActive: true,
      ownerId: { not: currentPet.ownerId },
      owner: { user: { syntheticRunId: viewer?.syntheticRunId || null } },
    };

    if (petType) {
      where.petType = petType;
    } else if (preferences.matchPetTypes.length > 0) {
      where.petType = { in: preferences.matchPetTypes };
    } else {
      where.petType = currentPet.petType;
    }

    if (location) {
      where.location = location;
    }

    if (preferences.matchPetSizes.length > 0) {
      where.size = { in: preferences.matchPetSizes };
    }

    const swipedPetIds = await db.swipe.findMany({
      where: { fromPetId: currentPetId },
      select: { toPetId: true },
    });

    const swipedIds = swipedPetIds
      .map((swipe) => swipe.toPetId)
      .filter((id): id is string => id !== null);

    where.id = swipedIds.length > 0
      ? { not: currentPetId, notIn: swipedIds }
      : { not: currentPetId };

    const blockedRelations = await db.blockedUser.findMany({
      where: {
        OR: [
          { blockerId: session.user.id },
          { blockedId: session.user.id },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedUserIds = blockedRelations.map((relation) =>
      relation.blockerId === session.user.id ? relation.blockedId : relation.blockerId
    );

    where.owner = {
      userId: blockedUserIds.length > 0 ? { notIn: blockedUserIds } : undefined,
      user: { syntheticRunId: viewer?.syntheticRunId || null },
    };

    const pets = await db.pet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
      take: 50,
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
      { success: false, error: 'Failed to fetch pets' },
      { status: 500 }
    );
  }
}
