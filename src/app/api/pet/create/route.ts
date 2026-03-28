import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { petSchema } from '@/lib/schemas';

// POST - Create new pet
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      ownerId,
      name,
      petType,
      breed,
      age,
      weight,
      size,
      gender,
      vaccinated,
      neutered,
      energy,
      bio,
      activities,
      location,
      images,
      thumbnailIndex,
    } = body;

    const parseStringArray = (value: unknown): string[] | null => {
      if (Array.isArray(value)) {
        const filtered = value.filter((v): v is string => typeof v === 'string' && v.length > 0);
        return filtered.length > 0 ? filtered : null;
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (!Array.isArray(parsed)) return null;
          const filtered = parsed.filter((v: unknown): v is string => typeof v === 'string' && v.length > 0);
          return filtered.length > 0 ? filtered : null;
        } catch {
          return null;
        }
      }
      return null;
    };

    const imagesArray = parseStringArray(images);
    if (!imagesArray) {
      return NextResponse.json(
        { success: false, error: 'Invalid images format' },
        { status: 400 }
      );
    }

    const activitiesArray = parseStringArray(activities);
    if (!activitiesArray) {
      return NextResponse.json(
        { success: false, error: 'Invalid activities format' },
        { status: 400 }
      );
    }

    // Validate input with Zod schema
    const validationData = {
      name,
      petType,
      breed,
      age,
      weight: weight ? parseFloat(weight) : undefined,
      size,
      gender,
      vaccinated,
      neutered,
      energy,
      bio,
      activities: activitiesArray,
      location,
      images: imagesArray,
    };

    const parsed = petSchema.safeParse(validationData);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check if owner exists
    const owner = await db.owner.findFirst({
      where: {
        userId: session.user.id,
        ...(ownerId ? { id: ownerId } : {}),
      },
    });

    if (!owner) {
      return NextResponse.json(
        { success: false, error: 'Owner not found or not authorized' },
        { status: 404 }
      );
    }

    // Check if owner already has a pet with this name
    const existingPet = await db.pet.findFirst({
      where: { ownerId: owner.id, name },
    });

    if (existingPet) {
      return NextResponse.json(
        { success: false, error: `Ya tienes una mascota llamada ${name}` },
        { status: 400 }
      );
    }

    const petData = {
      ownerId: owner.id,
      name,
      petType,
      breed,
      age,
      weight: weight ? parseFloat(weight) : null,
      size,
      gender,
      vaccinated: vaccinated ?? true,
      neutered: neutered ?? false,
      energy,
      bio,
      activities: JSON.stringify(activitiesArray),
      location,
      images: JSON.stringify(imagesArray),
      thumbnailIndex: thumbnailIndex ?? 0,
      level: 1,
      xp: 0,
      totalMatches: 0,
      isActive: true,
    };

    const pet = await db.pet.create({
      data: petData,
    });

    return NextResponse.json({
      success: true,
      pet,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create pet' },
      { status: 500 }
    );
  }
}
