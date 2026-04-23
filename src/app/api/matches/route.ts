import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { withImageFields } from '@/lib/media';

const log = logger.forRoute('/api/matches', 'GET');

export async function GET(request: Request) {
  let userId: string | undefined;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const session = auth.session;
    userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const petId = searchParams.get('petId');

    // Resolve owner from session to avoid IDOR
    const owner = await db.owner.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!owner) {
      return NextResponse.json({
        success: true,
        matches: [],
      });
    }

    if (ownerId && ownerId !== owner.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to access these matches' },
        { status: 403 }
      );
    }

    // Get owner's pets first
    let petIds: string[] = [];
    if (petId) {
      const pet = await db.pet.findFirst({
        where: { id: petId, ownerId: owner.id },
        select: { id: true },
      });
      if (!pet) {
        return NextResponse.json(
          { success: false, error: 'Pet not found' },
          { status: 404 }
        );
      }
      petIds = [petId];
    } else {
      const pets = await db.pet.findMany({
        where: { ownerId: owner.id },
        select: { id: true },
      });
      petIds = pets.map(p => p.id);
    }

    if (petIds.length === 0) {
      return NextResponse.json({
        success: true,
        matches: [],
      });
    }

    // Get all matches for the pets (include both pets to avoid N+1 queries)
    const matches = await db.match.findMany({
      where: {
        OR: [
          { pet1Id: { in: petIds } },
          { pet2Id: { in: petIds } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        pet1: { include: { owner: true } },
        pet2: { include: { owner: true } },
      },
    });

    const pets = matches
      .map((match) => {
        const pet1Id = match.pet1Id || '';
        const otherPet = petIds.includes(pet1Id) ? match.pet2 : match.pet1;
        if (!otherPet) return null;
        return withImageFields({
          ...otherPet,
          matchId: match.id
        });
      })
      .filter((pet): pet is NonNullable<typeof pet> => pet !== null);

    return NextResponse.json({
      success: true,
      matches: pets
    });
  } catch (error) {
    log.error('Error fetching matches', error, userId ? { userId } : undefined);
    return NextResponse.json(
      { success: false, error: 'Error al obtener matches' },
      { status: 500 }
    );
  }
}

