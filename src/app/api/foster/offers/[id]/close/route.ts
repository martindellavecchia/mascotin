import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { changeRescueContact, RescueContactError } from '@/lib/server/rescue-contact';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const contact = await changeRescueContact('FOSTER', (await params).id, auth.session.user.id, 'close');
    return NextResponse.json({ success: true, contact });
  } catch (error) {
    if (error instanceof RescueContactError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    console.error('Error closing foster contact:', error);
    return NextResponse.json({ success: false, error: 'No se pudo cerrar el contacto' }, { status: 500 });
  }
}
