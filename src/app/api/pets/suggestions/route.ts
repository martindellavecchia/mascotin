import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSuggestionsForPet } from '@/lib/server/home';

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
    const currentPetId = searchParams.get('petId');

    const owner = await db.owner.findUnique({
      where: { userId: session.user.id },
      select: {
        location: true,
        bio: true,
        pets: {
          select: { id: true, petType: true, breed: true },
        },
      },
    });

    if (!owner || owner.pets.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    const currentPet = currentPetId
      ? owner.pets.find((p) => p.id === currentPetId) || owner.pets[0]
      : owner.pets[0];
    const myPetIds = owner.pets.map((p) => p.id);

    const suggestions = await getSuggestionsForPet(
      session.user.id,
      currentPet,
      owner.location,
      owner.bio,
      myPetIds,
      5
    );

    return NextResponse.json(
      {
        success: true,
        suggestions,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=120',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
