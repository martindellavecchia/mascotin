import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { rescueInterestSchema } from '@/lib/schemas';
import { expressRescueInterest, RescueContactError } from '@/lib/server/rescue-contact';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;
  const limit = await rateLimit(`rescue-contact:${auth.session.user.id}`, RATE_LIMITS.rescueContact);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }, { status: 429 });
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = rescueInterestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Datos de contacto inválidos' }, { status: 400 });
  }
  try {
    const contact = await expressRescueInterest(id, auth.session.user.id, parsed.data);
    return NextResponse.json({ success: true, ...contact });
  } catch (error) {
    if (error instanceof RescueContactError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    console.error('Error opening rescue contact:', error);
    return NextResponse.json({ success: false, error: 'No se pudo abrir el contacto' }, { status: 500 });
  }
}
