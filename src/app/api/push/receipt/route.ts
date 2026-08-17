import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { pushReceiptSchema } from '@/lib/schemas';
import { recordPushReceipt } from '@/lib/server/push';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = pushReceiptSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Recibo inválido' }, { status: 400 });
  const recorded = await recordPushReceipt(parsed.data.deliveryId, auth.session.user.id, parsed.data.event);
  if (!recorded) return NextResponse.json({ success: false, error: 'Entrega no encontrada' }, { status: 404 });
  return NextResponse.json({ success: true });
}
