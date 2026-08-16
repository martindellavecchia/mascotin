import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { expressFosterInterest, FosterNetworkError } from '@/lib/server/foster-network';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  try {
    const offer = await expressFosterInterest(id, auth.session.user.id);
    return NextResponse.json({ success: true, offer: { id: offer.id, status: offer.status } });
  } catch (error) {
    if (error instanceof FosterNetworkError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error expressing foster interest:', error);
    return NextResponse.json({ success: false, error: 'No se pudo registrar tu interés' }, { status: 500 });
  }
}
