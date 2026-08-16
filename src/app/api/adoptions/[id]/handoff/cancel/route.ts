import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { cancelFosterAdoptionHandoff, FosterAdoptionError } from '@/lib/server/foster-adoption';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  try {
    await cancelFosterAdoptionHandoff(id, auth.session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof FosterAdoptionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error cancelling adoption handoff:', error);
    return NextResponse.json({ success: false, error: 'No se pudo cancelar la coordinación' }, { status: 500 });
  }
}
