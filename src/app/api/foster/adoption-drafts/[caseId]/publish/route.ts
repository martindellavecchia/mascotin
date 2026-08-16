import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { FosterAdoptionError, publishFosterAdoption } from '@/lib/server/foster-adoption';

export async function POST(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { caseId } = await params;
  try {
    const result = await publishFosterAdoption(caseId, auth.session.user.id);
    return NextResponse.json({ success: true, listingId: result.listing.id });
  } catch (error) {
    if (error instanceof FosterAdoptionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error publishing foster adoption:', error);
    return NextResponse.json({ success: false, error: 'No se pudo publicar la adopción' }, { status: 500 });
  }
}
