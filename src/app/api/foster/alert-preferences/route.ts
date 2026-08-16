import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { fosterAlertPreferencesSchema } from '@/lib/schemas';
import { FosterNetworkError, serializeAlertPreferences, updateFosterAlertPreferences } from '@/lib/server/foster-network';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const profile = await db.fosterProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ success: true, preferences: null });
  return NextResponse.json({ success: true, preferences: serializeAlertPreferences(profile) });
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = fosterAlertPreferencesSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Revisá las preferencias', details: parsed.error.issues }, { status: 400 });
  }
  try {
    const profile = await updateFosterAlertPreferences(auth.session.user.id, parsed.data);
    return NextResponse.json({ success: true, preferences: serializeAlertPreferences(profile) });
  } catch (error) {
    if (error instanceof FosterNetworkError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error updating foster alerts:', error);
    return NextResponse.json({ success: false, error: 'No se pudieron guardar las alertas' }, { status: 500 });
  }
}
