import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { pushSubscriptionSchema } from '@/lib/schemas';
import { getPushConfiguration } from '@/lib/server/push';

const endpointSchema = z.object({ endpoint: z.string().url().max(2048) });

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const [configuration, subscriptions] = await Promise.all([
    Promise.resolve(getPushConfiguration()),
    db.pushSubscription.count({ where: { userId: auth.session.user.id, disabledAt: null } }),
  ]);
  return NextResponse.json({
    success: true,
    configured: configuration.configured,
    publicKey: configuration.publicKey,
    subscribed: subscriptions > 0,
    deviceCount: subscriptions,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const configuration = getPushConfiguration();
  if (!configuration.configured) {
    return NextResponse.json({ success: false, error: 'Las notificaciones push todavía no están configuradas' }, { status: 503 });
  }
  const parsed = pushSubscriptionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Suscripción inválida' }, { status: 400 });
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null;
  const subscription = await db.$transaction(async (tx) => {
    const existing = await tx.pushSubscription.findUnique({ where: { endpoint: parsed.data.endpoint } });
    if (existing && existing.userId !== auth.session.user.id) {
      await tx.pushSubscription.delete({ where: { id: existing.id } });
    }
    return tx.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      update: {
        userId: auth.session.user.id,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
        disabledAt: null,
        failureCount: 0,
      },
      create: {
        userId: auth.session.user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
      },
    });
  });
  return NextResponse.json({ success: true, subscription: { id: subscription.id } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const parsed = endpointSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Endpoint inválido' }, { status: 400 });
  await db.pushSubscription.updateMany({
    where: { endpoint: parsed.data.endpoint, userId: auth.session.user.id },
    data: { disabledAt: new Date() },
  });
  return NextResponse.json({ success: true });
}
