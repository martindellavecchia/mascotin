import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Verificar autenticación
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

    // Get current pet to know its type
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

    // Build where clause
    const where: Prisma.PetWhereInput = {
      isActive: true,
      ownerId: { not: currentPet.ownerId }, // Avoid self-matching
    };

    // Filter by pet type (same type matches)
    if (petType) {
      where.petType = petType;
    } else {
      // Default to same type as current pet
      where.petType = currentPet.petType;
    }

    // Filter by location (optional)
    if (location) {
      where.location = location;
    }

    // Get pets that haven't been swiped on by current pet
    const swipedPetIds = await db.swipe.findMany({
      where: { fromPetId: currentPetId },
      select: { toPetId: true },
    });

    // Usar notIn en lugar de not (bug fix: not no acepta arrays)
    const swipedIds = swipedPetIds
      .map(s => s.toPetId)
      .filter((id): id is string => id !== null);

    where.id = swipedIds.length > 0
      ? { not: currentPetId, notIn: swipedIds }
      : { not: currentPetId };

    // Exclude pets from blocked users (both directions)
    const blockedRelations = await db.blockedUser.findMany({
      where: {
        OR: [
          { blockerId: session.user.id },
          { blockedId: session.user.id },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedUserIds = blockedRelations.map(b =>
      b.blockerId === session.user.id ? b.blockedId : b.blockerId
    );

    if (blockedUserIds.length > 0) {
      where.owner = {
        userId: { notIn: blockedUserIds },
      };
    }

    const pets = await db.pet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      pets,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pets' },
      { status: 500 }
    );
  }
}


