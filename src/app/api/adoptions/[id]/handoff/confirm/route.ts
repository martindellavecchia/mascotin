import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { adoptionHandoffConfirmSchema } from '@/lib/schemas';
import { confirmFosterAdoptionHandoff, FosterAdoptionError } from '@/lib/server/foster-adoption';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  const parsed = adoptionHandoffConfirmSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Revisá tus datos de responsable' }, { status: 400 });
  try {
    const result = await confirmFosterAdoptionHandoff(id, auth.session.user.id, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof FosterAdoptionError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error confirming adoption handoff:', error);
    return NextResponse.json({ success: false, error: 'No se pudo confirmar la entrega' }, { status: 500 });
  }
}
