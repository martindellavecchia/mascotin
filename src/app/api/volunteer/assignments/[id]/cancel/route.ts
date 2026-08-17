import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { cancelVolunteerAssignmentSchema } from '@/lib/schemas';
import { cancelVolunteerAssignment, VolunteerNetworkError } from '@/lib/server/volunteer-network';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = cancelVolunteerAssignmentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Indicá el motivo de cancelación' }, { status: 400 });
  try {
    const assignment = await cancelVolunteerAssignment((await params).id, auth.session.user.id, parsed.data.reason);
    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    if (error instanceof VolunteerNetworkError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error cancelling volunteer assignment:', error);
    return NextResponse.json({ success: false, error: 'No se pudo cancelar la tarea' }, { status: 500 });
  }
}
