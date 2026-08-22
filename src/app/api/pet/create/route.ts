import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { createPetSchema } from '@/lib/schemas';
import { normalizePetImageSelection } from '@/lib/media';
import { createEmergencyToken, createPublicSlug } from '@/lib/passport';
import { extractPassportFields, resolveCoordinates } from '@/lib/pet-payload';

function parseOptionalStringArray(value: unknown): string[] | null {
  if (value === undefined || value === null || value === '') return [];

  if (Array.isArray(value)) {
    return value.every((item) => typeof item === 'string') ? value : null;
  }

  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function hasImagePayload(value: unknown) {
  if (value === undefined || value === null || value === '' || value === '[]') return false;
  return !Array.isArray(value) || value.length > 0;
}

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  return Number(value);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Iniciá sesión para registrar una mascota' },
        { status: 401 }
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const activities = parseOptionalStringArray(body.activities);

    if (activities === null) {
      return NextResponse.json(
        { success: false, error: 'El formato de actividades no es válido' },
        { status: 400 }
      );
    }

    const includesImages = hasImagePayload(body.images);
    const imageSelection = includesImages
      ? normalizePetImageSelection(
          body.images as string | string[] | null | undefined,
          body.thumbnailIndex
        )
      : { images: [], thumbnailIndex: 0 };

    if (!imageSelection) {
      return NextResponse.json(
        { success: false, error: 'El formato de las imágenes no es válido' },
        { status: 400 }
      );
    }

    const parsed = createPetSchema.safeParse({
      ...body,
      age: optionalNumber(body.age),
      weight: optionalNumber(body.weight),
      activities: body.activities === undefined ? undefined : activities,
      images: includesImages ? imageSelection.images : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Revisá los campos marcados',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const ownerName =
      session.user.name?.trim() ||
      session.user.email?.split('@')[0]?.trim() ||
      'Persona de Huella';
    const owner = await db.owner.upsert({
      where: { userId: session.user.id },
      update: {},
      create: {
        userId: session.user.id,
        name: ownerName,
        location: '',
      },
    });

    const existingPet = await db.pet.findFirst({
      where: { ownerId: owner.id, name: parsed.data.name },
      select: { id: true },
    });

    if (existingPet) {
      return NextResponse.json(
        { success: false, error: `Ya tenés una mascota llamada ${parsed.data.name}` },
        { status: 409 }
      );
    }

    const location = parsed.data.location?.trim() || owner.location.trim();
    const coordinates = await resolveCoordinates(location);
    const temporaryId = crypto.randomUUID();
    const pet = await db.pet.create({
      data: {
        ownerId: owner.id,
        name: parsed.data.name,
        petType: parsed.data.petType,
        breed: parsed.data.breed?.trim() || null,
        age: parsed.data.age ?? 0,
        weight: parsed.data.weight ?? null,
        size: parsed.data.size ?? '',
        gender: parsed.data.gender ?? '',
        vaccinated: typeof body.vaccinated === 'boolean' ? body.vaccinated : null,
        neutered: typeof body.neutered === 'boolean' ? body.neutered : null,
        energy: parsed.data.energy ?? '',
        bio: parsed.data.bio?.trim() || '',
        activities: JSON.stringify(parsed.data.activities || []),
        location,
        images: JSON.stringify(imageSelection.images),
        thumbnailIndex: imageSelection.thumbnailIndex,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        publicSlug: createPublicSlug(parsed.data.name, temporaryId),
        emergencyToken: createEmergencyToken(),
        ...extractPassportFields(body),
        level: 1,
        xp: 0,
        totalMatches: 0,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, pet }, { status: 201 });
  } catch (error) {
    console.error('Error creating pet:', error);
    return NextResponse.json(
      { success: false, error: 'No pudimos crear la mascota. Intentá de nuevo.' },
      { status: 500 }
    );
  }
}
