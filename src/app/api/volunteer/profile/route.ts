import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { normalizeSolidarityRadius } from '@/lib/rescue';
import { parseFosterList } from '@/lib/foster';
import { resolveCoordinates } from '@/lib/pet-payload';
import { updateVolunteerProfileStatusSchema, volunteerProfileSchema } from '@/lib/schemas';
import { createVolunteerOffersForProfile } from '@/lib/server/volunteer-network';
import { VOLUNTEER_TERMS_VERSION } from '@/lib/volunteer';

function serializeProfile(profile: NonNullable<Awaited<ReturnType<typeof findProfile>>>) {
  return {
    id: profile.id,
    status: profile.status,
    roles: parseFosterList(profile.roles),
    location: profile.location,
    radiusKm: profile.radiusKm,
    availableFrom: profile.availableFrom,
    availableUntil: profile.availableUntil,
    maxConcurrentTasks: profile.maxConcurrentTasks,
    occupiedTasks: profile.occupiedTasks,
    notes: profile.notes,
    adultDeclaredAt: profile.adultDeclaredAt,
    termsAcceptedAt: profile.termsAcceptedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function findProfile(userId: string) {
  return db.volunteerProfile.findUnique({ where: { userId } });
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const profile = await findProfile(auth.session.user.id);
  return NextResponse.json({ success: true, profile: profile ? serializeProfile(profile) : null });
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = volunteerProfileSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Revisá los datos del perfil', details: parsed.error.issues }, { status: 400 });
  }
  const existing = await findProfile(auth.session.user.id);
  if (existing?.status === 'SUSPENDED') {
    return NextResponse.json({ success: false, error: 'El perfil está suspendido' }, { status: 403 });
  }
  if (existing && parsed.data.maxConcurrentTasks < existing.occupiedTasks) {
    return NextResponse.json({ success: false, error: 'El máximo no puede ser menor a tus tareas activas' }, { status: 409 });
  }
  const coordinates = await resolveCoordinates(parsed.data.location, parsed.data.latitude, parsed.data.longitude);
  if (!coordinates) {
    return NextResponse.json({ success: false, error: 'No pudimos ubicar esa zona' }, { status: 400 });
  }
  const now = new Date();
  const profile = await db.volunteerProfile.upsert({
    where: { userId: auth.session.user.id },
    update: {
      roles: JSON.stringify(parsed.data.roles),
      location: parsed.data.location,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusKm: normalizeSolidarityRadius(parsed.data.radiusKm),
      availableFrom: parsed.data.availableFrom ? new Date(`${parsed.data.availableFrom}T00:00:00.000Z`) : null,
      availableUntil: parsed.data.availableUntil ? new Date(`${parsed.data.availableUntil}T23:59:59.999Z`) : null,
      maxConcurrentTasks: parsed.data.maxConcurrentTasks,
      notes: parsed.data.notes || null,
    },
    create: {
      userId: auth.session.user.id,
      roles: JSON.stringify(parsed.data.roles),
      location: parsed.data.location,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusKm: normalizeSolidarityRadius(parsed.data.radiusKm),
      availableFrom: parsed.data.availableFrom ? new Date(`${parsed.data.availableFrom}T00:00:00.000Z`) : null,
      availableUntil: parsed.data.availableUntil ? new Date(`${parsed.data.availableUntil}T23:59:59.999Z`) : null,
      maxConcurrentTasks: parsed.data.maxConcurrentTasks,
      notes: parsed.data.notes || null,
      adultDeclaredAt: now,
      termsAcceptedAt: now,
      termsVersion: VOLUNTEER_TERMS_VERSION,
    },
  });
  const offerCount = await createVolunteerOffersForProfile(profile.id);
  return NextResponse.json({ success: true, profile: serializeProfile(profile), offerCount });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = updateVolunteerProfileStatusSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 });
  const existing = await findProfile(auth.session.user.id);
  if (!existing) return NextResponse.json({ success: false, error: 'Perfil no encontrado' }, { status: 404 });
  if (existing.status === 'SUSPENDED') return NextResponse.json({ success: false, error: 'El perfil está suspendido' }, { status: 403 });
  const profile = await db.volunteerProfile.update({ where: { id: existing.id }, data: { status: parsed.data.status } });
  if (profile.status === 'ACTIVE') await createVolunteerOffersForProfile(profile.id);
  return NextResponse.json({ success: true, profile: serializeProfile(profile) });
}
