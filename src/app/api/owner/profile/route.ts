import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get current user's owner profile
export async function GET(request: Request) {
  try {
    // Siempre usar sesión para obtener userId (fix IDOR)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // Get owner and user role in parallel
    const [owner, user] = await Promise.all([
      db.owner.findUnique({ where: { userId } }),
      db.user.findUnique({ where: { id: userId }, select: { role: true } }),
    ]);

    if (!owner) {
      return NextResponse.json({
        success: false,
        error: 'Owner profile not found',
        role: user?.role || 'OWNER',
      });
    }

    return NextResponse.json({
      success: true,
      owner,
      role: user?.role || 'OWNER',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch owner profile' },
      { status: 500 }
    );
  }
}

// POST - Create owner profile
export async function POST(request: Request) {
  try {
    // Siempre usar sesión para obtener userId (fix IDOR)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const body = await request.json();
    const { name, phone, location, bio, image, hasYard, hasOtherPets } = body;

    if (!name || !location) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, location' },
        { status: 400 }
      );
    }

    // Check if owner profile already exists
    const existingOwner = await db.owner.findUnique({
      where: { userId },
    });

    if (existingOwner) {
      return NextResponse.json(
        { success: false, error: 'Owner profile already exists' },
        { status: 400 }
      );
    }

    const owner = await db.owner.create({
      data: {
        userId,
        name,
        phone,
        location,
        bio,
        image,
        hasYard,
        hasOtherPets,
      },
    });

    return NextResponse.json({
      success: true,
      owner,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create owner profile' },
      { status: 500 }
    );
  }
}

// PUT - Update owner profile
export async function PUT(request: Request) {
  try {
    // Siempre usar sesión para obtener userId (fix IDOR)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const body = await request.json();
    const { name, phone, location, bio, image, hasYard, hasOtherPets } = body;

    const existingOwner = await db.owner.findUnique({
      where: { userId },
    });

    if (!existingOwner) {
      return NextResponse.json(
        { success: false, error: 'Owner profile not found' },
        { status: 404 }
      );
    }

    const owner = await db.owner.update({
      where: { userId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(location !== undefined && { location }),
        ...(bio !== undefined && { bio }),
        ...(image !== undefined && { image }),
        ...(hasYard !== undefined && { hasYard }),
        ...(hasOtherPets !== undefined && { hasOtherPets }),
      },
    });

    return NextResponse.json({
      success: true,
      owner,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update owner profile' },
      { status: 500 }
    );
  }
}
