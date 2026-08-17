import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { selectVolunteerOffer, VolunteerNetworkError } from '@/lib/server/volunteer-network';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const assignment = await selectVolunteerOffer((await params).id, auth.session.user.id);
    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof VolunteerNetworkError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error selecting volunteer offer:', error);
    return NextResponse.json({ success: false, error: 'No se pudo asignar la tarea' }, { status: 500 });
  }
}
