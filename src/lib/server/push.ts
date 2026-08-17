import 'server-only';

import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { Prisma, type NotificationType } from '@prisma/client';
import webPush from 'web-push';
import { db } from '@/lib/db';
import { buildPrivatePushPayload, isPushEligible } from '@/lib/push';

const MAX_PUSH_ATTEMPTS = 3;
let configuredSignature: string | null = null;

export interface PushContext {
  zone?: string | null;
  helpType?: string | null;
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@mascotin.app';
  if (!publicKey || !privateKey) return false;
  const signature = `${subject}:${publicKey}:${privateKey.length}`;
  if (configuredSignature !== signature) {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    configuredSignature = signature;
  }
  return true;
}

function scheduleDispatch(deliveryIds: string[]) {
  const dispatch = async () => {
    await Promise.allSettled(deliveryIds.map((deliveryId) => dispatchPushDelivery(deliveryId)));
  };
  try {
    after(dispatch);
  } catch {
    void dispatch();
  }
}

export async function dispatchPushDelivery(deliveryId: string) {
  let result: Awaited<ReturnType<typeof sendPushDelivery>> = { sent: false, reason: 'not-pending' };
  for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS; attempt += 1) {
    result = await sendPushDelivery(deliveryId);
    if (result.sent || 'reason' in result || result.permanent) return result;
  }
  return result;
}

export function getPushConfiguration() {
  return {
    configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
  };
}

export async function enqueueNotificationPush(
  notificationId: string,
  context: PushContext = {},
) {
  const notification = await db.notification.findUnique({ where: { id: notificationId } });
  if (!notification || !isPushEligible(notification.type)) return 0;
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId: notification.userId, disabledAt: null },
    select: { id: true },
  });
  if (subscriptions.length === 0) return 0;

  const deliveries = subscriptions.map((subscription) => {
    const id = randomUUID();
    return {
      id,
      notificationId: notification.id,
      subscriptionId: subscription.id,
      payload: buildPrivatePushPayload({
        notificationType: notification.type,
        title: notification.title,
        link: notification.link,
        deliveryId: id,
        zone: context.zone,
        helpType: context.helpType,
      }) as unknown as Prisma.InputJsonValue,
    };
  });
  await db.pushDelivery.createMany({ data: deliveries, skipDuplicates: true });
  scheduleDispatch(deliveries.map((delivery) => delivery.id));
  return deliveries.length;
}

function statusCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const value = (error as { statusCode?: unknown }).statusCode;
    return typeof value === 'number' ? value : null;
  }
  return null;
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : 'Error del proveedor push';
}

export async function sendPushDelivery(deliveryId: string) {
  if (!configureWebPush()) return { sent: false, reason: 'not-configured' as const };
  const current = await db.pushDelivery.findUnique({
    where: { id: deliveryId },
    include: { subscription: true },
  });
  if (!current || current.status !== 'PENDING' || current.subscription.disabledAt) {
    return { sent: false, reason: 'not-pending' as const };
  }
  if (current.attempts >= MAX_PUSH_ATTEMPTS) {
    await db.pushDelivery.update({ where: { id: current.id }, data: { status: 'FAILED' } });
    return { sent: false, reason: 'exhausted' as const };
  }
  const claimed = await db.pushDelivery.updateMany({
    where: { id: current.id, status: 'PENDING', attempts: current.attempts },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return { sent: false, reason: 'claimed' as const };

  try {
    const response = await webPush.sendNotification({
      endpoint: current.subscription.endpoint,
      keys: { p256dh: current.subscription.p256dh, auth: current.subscription.auth },
    }, JSON.stringify(current.payload), { TTL: 24 * 60 * 60, urgency: 'high' });
    const now = new Date();
    await db.$transaction([
      db.pushDelivery.update({
        where: { id: current.id },
        data: { status: 'SENT', providerStatus: response.statusCode, sentAt: now, lastError: null },
      }),
      db.pushSubscription.update({
        where: { id: current.subscriptionId },
        data: { lastSuccessAt: now, failureCount: 0 },
      }),
    ]);
    return { sent: true, providerStatus: response.statusCode };
  } catch (error) {
    const providerStatus = statusCode(error);
    const permanent = providerStatus === 404 || providerStatus === 410;
    const attempts = current.attempts + 1;
    await db.$transaction([
      db.pushDelivery.update({
        where: { id: current.id },
        data: {
          status: permanent || attempts >= MAX_PUSH_ATTEMPTS ? 'FAILED' : 'PENDING',
          providerStatus,
          lastError: safeErrorMessage(error),
        },
      }),
      db.pushSubscription.update({
        where: { id: current.subscriptionId },
        data: {
          disabledAt: permanent ? new Date() : undefined,
          lastFailureAt: new Date(),
          failureCount: { increment: 1 },
        },
      }),
    ]);
    return { sent: false, providerStatus, permanent };
  }
}

export async function retryResidualPushDeliveries(limit = 100) {
  const deliveries = await db.pushDelivery.findMany({
    where: { status: 'PENDING', attempts: { lt: MAX_PUSH_ATTEMPTS }, subscription: { disabledAt: null } },
    orderBy: { updatedAt: 'asc' },
    take: limit,
    select: { id: true },
  });
  const results = await Promise.allSettled(deliveries.map((delivery) => sendPushDelivery(delivery.id)));
  return { attempted: deliveries.length, settled: results.length };
}

export async function recordPushReceipt(deliveryId: string, userId: string, event: 'RECEIVED' | 'CLICKED') {
  const delivery = await db.pushDelivery.findFirst({
    where: { id: deliveryId, subscription: { userId } },
    select: { id: true, status: true },
  });
  if (!delivery) return false;
  const now = new Date();
  await db.pushDelivery.update({
    where: { id: delivery.id },
    data: event === 'CLICKED'
      ? { status: 'CLICKED', clickedAt: now, receivedAt: delivery.status === 'SENT' ? now : undefined }
      : delivery.status === 'CLICKED'
        ? { receivedAt: now }
        : { status: 'RECEIVED', receivedAt: now },
  });
  return true;
}

export async function cleanupExpiredSyntheticRuns() {
  const runs = await db.syntheticRun.findMany({
    where: { expiresAt: { lt: new Date() }, status: { not: 'CLEANED' } },
    include: { users: { select: { email: true } } },
    take: 20,
  });
  let cleaned = 0;
  let skipped = 0;
  for (const run of runs) {
    if (run.users.some((user) => !user.email.endsWith('@example.invalid'))) {
      skipped += 1;
      continue;
    }
    await db.syntheticRun.delete({ where: { id: run.id } });
    cleaned += 1;
  }
  return { cleaned, skipped };
}

export function notificationSupportsPush(type: NotificationType) {
  return isPushEligible(type);
}
