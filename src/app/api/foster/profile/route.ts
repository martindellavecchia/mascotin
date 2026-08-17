import { after, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { FOSTER_TERMS_VERSION, parseFosterList } from '@/lib/foster';
import { resolveCoordinates } from '@/lib/pet-payload';
import { fosterProfileSchema, updateFosterProfileStatusSchema } from '@/lib/schemas';
import { createOffersForProfile } from '@/lib/server/foster';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const profile = await db.fosterProfile.findUnique({
    where: { userId: auth.session.user.id },
  });

  return NextResponse.json({
    success: true,
    profile: profile
      ? {
          ...profile,
          acceptsSpecies: parseFosterList(profile.acceptsSpecies),
          acceptsSizes: parseFosterList(profile.acceptsSizes),
        }
      : null,
    termsVersion: FOSTER_TERMS_VERSION,
  });
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const parsed = fosterProfileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Revisá los datos del hogar', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.fosterProfile.findUnique({
      where: { userId: auth.session.user.id },
    });
    if (existing && parsed.data.capacity < existing.occupiedSlots) {
      return NextResponse.json(
        { success: false, error: 'La capacidad no puede ser menor a los tránsitos activos' },
        { status: 409 }
      );
    }

    const coordinates = await resolveCoordinates(
      parsed.data.location,
      parsed.data.latitude,
      parsed.data.longitude
    );
    if (!coordinates) {
      return NextResponse.json(
        { success: false, error: 'No pudimos ubicar esa zona. Usá tu ubicación actual o ingresá una zona más precisa.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const data = {
      acceptsSpecies: JSON.stringify(parsed.data.acceptsSpecies),
      acceptsSizes: JSON.stringify(parsed.data.acceptsSizes),
      capacity: parsed.data.capacity,
      location: parsed.data.location,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusKm: parsed.data.radiusKm,
      availableFrom: parsed.data.availableFrom ? new Date(`${parsed.data.availableFrom}T00:00:00.000Z`) : null,
      availableUntil: parsed.data.availableUntil ? new Date(`${parsed.data.availableUntil}T23:59:59.999Z`) : null,
      maxDurationDays: parsed.data.maxDurationDays,
      housingType: parsed.data.housingType,
      hasYard: parsed.data.hasYard,
      hasKids: parsed.data.hasKids,
      hasOtherPets: parsed.data.hasOtherPets,
      experience: parsed.data.experience,
      notes: parsed.data.notes || null,
      adultDeclaredAt: existing?.adultDeclaredAt || now,
      termsAcceptedAt: existing?.termsVersion === FOSTER_TERMS_VERSION ? existing.termsAcceptedAt : now,
      termsVersion: FOSTER_TERMS_VERSION,
    };

    const profile = await db.fosterProfile.upsert({
      where: { userId: auth.session.user.id },
      create: {
        userId: auth.session.user.id,
        status: 'ACTIVE',
        ...data,
      },
      update: data,
    });

    if (profile.status === 'ACTIVE') {
      after(async () => {
        try {
          await createOffersForProfile(profile.id);
        } catch (error) {
          console.error('Error matching foster profile:', error);
        }
      });
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        acceptsSpecies: parsed.data.acceptsSpecies,
        acceptsSizes: parsed.data.acceptsSizes,
      },
    });
  } catch (error) {
    console.error('Error saving foster profile:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo guardar el perfil de tránsito' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const parsed = updateFosterProfileStatusSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 });
  }

  const profile = await db.fosterProfile.findUnique({
    where: { userId: auth.session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ success: false, error: 'Perfil no encontrado' }, { status: 404 });
  }
  if (profile.status === 'SUSPENDED') {
    return NextResponse.json(
      { success: false, error: 'El perfil está suspendido' },
      { status: 403 }
    );
  }

  const updated = await db.fosterProfile.update({
    where: { id: profile.id },
    data: { status: parsed.data.status },
  });

  if (updated.status === 'ACTIVE') {
    after(async () => {
      try {
        await createOffersForProfile(updated.id);
      } catch (error) {
        console.error('Error rematching foster profile:', error);
      }
    });
  }

  return NextResponse.json({ success: true, profile: updated });
}
