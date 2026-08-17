import { NextResponse } from 'next/server';
import type { SolidarityAlertType } from '@prisma/client';
import { requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { parseFosterList } from '@/lib/foster';
import { resolveCoordinates } from '@/lib/pet-payload';
import { normalizeSolidarityRadius, SOLIDARITY_CONSENT_VERSION } from '@/lib/rescue';
import { solidarityAlertProfileSchema } from '@/lib/schemas';

const ALERT_TYPES: SolidarityAlertType[] = ['FOSTER', 'ADOPTION', 'VETERINARY'];

function serializeProfile(profile: Awaited<ReturnType<typeof findProfile>>) {
  if (!profile) return null;
  const byType = new Map(profile.subscriptions.map((subscription) => [subscription.type, subscription]));
  return {
    id: profile.id,
    location: profile.location,
    locationConsentAt: profile.locationConsentAt,
    subscriptions: ALERT_TYPES.map((type) => {
      const subscription = byType.get(type);
      return {
        type,
        enabled: subscription?.enabled || false,
        radiusKm: subscription?.radiusKm || 5,
        species: parseFosterList(subscription?.species),
        sizes: parseFosterList(subscription?.sizes),
        urgencies: parseFosterList(subscription?.urgencies),
      };
    }),
  };
}

function findProfile(userId: string) {
  return db.solidarityAlertProfile.findUnique({
    where: { userId },
    include: { subscriptions: true },
  });
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return NextResponse.json({ success: true, profile: serializeProfile(await findProfile(auth.session.user.id)) });
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = solidarityAlertProfileSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Revisá las preferencias de alertas', details: parsed.error.issues }, { status: 400 });
  }
  const coordinates = await resolveCoordinates(parsed.data.location, parsed.data.latitude, parsed.data.longitude);
  if (!coordinates) return NextResponse.json({ success: false, error: 'No pudimos ubicar esa zona' }, { status: 400 });

  await db.$transaction(async (tx) => {
    const profile = await tx.solidarityAlertProfile.upsert({
      where: { userId: auth.session.user.id },
      update: {
        location: parsed.data.location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        locationConsentAt: new Date(),
        consentVersion: SOLIDARITY_CONSENT_VERSION,
      },
      create: {
        userId: auth.session.user.id,
        location: parsed.data.location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        locationConsentAt: new Date(),
        consentVersion: SOLIDARITY_CONSENT_VERSION,
      },
    });
    const inputByType = new Map(parsed.data.subscriptions.map((subscription) => [subscription.type, subscription]));
    for (const type of ALERT_TYPES) {
      const input = inputByType.get(type);
      await tx.solidaritySubscription.upsert({
        where: { profileId_type: { profileId: profile.id, type } },
        update: input ? {
          enabled: input.enabled,
          radiusKm: normalizeSolidarityRadius(input.radiusKm),
          species: JSON.stringify(input.species),
          sizes: JSON.stringify(input.sizes),
          urgencies: JSON.stringify(input.urgencies),
        } : {},
        create: {
          profileId: profile.id,
          type,
          enabled: input?.enabled || false,
          radiusKm: normalizeSolidarityRadius(input?.radiusKm),
          species: JSON.stringify(input?.species || []),
          sizes: JSON.stringify(input?.sizes || []),
          urgencies: JSON.stringify(input?.urgencies || []),
        },
      });
    }
  });
  return NextResponse.json({ success: true, profile: serializeProfile(await findProfile(auth.session.user.id)) });
}
