import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { clampMessageLimit, parseMessageCursor } from '@/lib/messages';
import { fosterMessageSchema } from '@/lib/schemas';
import {
  getRescueContactMessages,
  RescueContactMessageError,
  sendRescueContactMessage,
} from '@/lib/server/rescue-contact-messages';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const rawAfter = new URL(request.url).searchParams.get('after');
  const after = parseMessageCursor(rawAfter);
  if (rawAfter && !after) return NextResponse.json({ success: false, error: 'Cursor inválido' }, { status: 400 });
  try {
    const result = await getRescueContactMessages({
      kind: 'FOSTER',
      offerId: (await params).id,
      userId: auth.session.user.id,
      after,
      limit: clampMessageLimit(new URL(request.url).searchParams.get('limit')),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof RescueContactMessageError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error loading foster contact messages:', error);
    return NextResponse.json({ success: false, error: 'No se pudo cargar la conversación' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = fosterMessageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Mensaje inválido' }, { status: 400 });
  try {
    const message = await sendRescueContactMessage({
      kind: 'FOSTER',
      offerId: (await params).id,
      userId: auth.session.user.id,
      userName: auth.session.user.name,
      content: parsed.data.content,
    });
    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof RescueContactMessageError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Error sending foster contact message:', error);
    return NextResponse.json({ success: false, error: 'No se pudo enviar el mensaje' }, { status: 500 });
  }
}
