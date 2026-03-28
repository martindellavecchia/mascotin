import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get current user's pets
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get owner's pets
    const owner = await db.owner.findUnique({
      where: { userId: session.user.id },
    });

    if (!owner) {
      return NextResponse.json({
        success: true,
        pets: [],
      });
    }

    const pets = await db.pet.findMany({
      where: { ownerId: owner.id },
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
