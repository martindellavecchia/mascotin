import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { respondVolunteerOfferSchema } from '@/lib/schemas';
import { respondVolunteerOffer, VolunteerNetworkError } from '@/lib/server/volunteer-network';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = respondVolunteerOfferSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Respuesta inválida' }, { status: 400 });
  try {
    const offer = await respondVolunteerOffer((await params).id, auth.session.user.id, parsed.data.response);
    return NextResponse.json({ success: true, offer });
  } catch (error) {
    if (error instanceof VolunteerNetworkError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error responding volunteer offer:', error);
    return NextResponse.json({ success: false, error: 'No se pudo responder la oferta' }, { status: 500 });
  }
}
