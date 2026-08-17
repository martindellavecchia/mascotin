import { db } from '@/lib/db';
import { NotificationType, Prisma } from '@prisma/client';
import { enqueueNotificationPush, type PushContext } from '@/lib/server/push';

export interface CreateNotificationParams {
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  entityId?: string;
  dedupeKey?: string;
  pushContext?: PushContext;
}

// Map notification type to UserSettings preference field
const PREF_MAP: Record<NotificationType, string | null> = {
  MATCH: 'notifyMatches',
  MESSAGE: 'notifyMessages',
  GROUP_MESSAGE: 'notifyMessages',
  COMMENT: 'notifyComments',
  LIKE: 'notifyComments',
  APPOINTMENT: 'notifyHealth',
  EVENT_ATTEND: 'notifyEvents',
  PROVIDER_REQUEST: null,
  GROUP_JOIN: 'notifyEvents',
  LOST_PET_ALERT: 'notifyEvents',
  SIGHTING: 'notifyEvents',
  ADOPTION_APPLICATION: 'notifyMatches',
  ADOPTION_MATCH: 'notifyMatches',
  FOSTER_OFFER: 'notifyFoster',
  FOSTER_RESPONSE: 'notifyFoster',
  FOSTER_PLACEMENT: 'notifyFoster',
  FOSTER_CASE_ALERT: 'notifyFoster',
  FOSTER_ADOPTION: 'notifyFoster',
  VOLUNTEER_OFFER: 'notifyFoster',
  VOLUNTEER_RESPONSE: 'notifyFoster',
  VOLUNTEER_ASSIGNMENT: 'notifyFoster',
  SOLIDARITY_ADOPTION_ALERT: 'notifyMatches',
  SOLIDARITY_VETERINARY_ALERT: 'notifyHealth',
  CONTENT_REPORT: null,
};

export async function createNotification(params: CreateNotificationParams) {
  const { userId, actorId, type, title, body, link, entityId, dedupeKey, pushContext } = params;

  // Don't self-notify
  if (userId === actorId) return null;

  // Check user preference
  const prefField = PREF_MAP[type];
  if (prefField) {
    const settings = await db.userSettings.findUnique({
      where: { userId },
      select: { [prefField]: true },
    });
    if (settings && (settings as Record<string, boolean>)[prefField] === false) return null;
  }

  try {
    const notification = await db.notification.create({
      data: { userId, actorId, type, title, body, link, entityId, dedupeKey },
    });
    await enqueueNotificationPush(notification.id, pushContext);
    return notification;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && dedupeKey) {
      return null;
    }
    throw error;
  }
}

export async function createNotificationBulk(
  recipientIds: string[],
  actorId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
  entityId?: string,
  dedupeKeyPrefix?: string,
  pushContext?: PushContext,
  respectPreferences = true,
): Promise<void> {
  const filtered = recipientIds.filter(id => id !== actorId);
  if (filtered.length === 0) return;

  const prefField = PREF_MAP[type];
  let allowedIds = filtered;

  if (prefField && respectPreferences) {
    const optedOut = await db.userSettings.findMany({
      where: { userId: { in: filtered }, [prefField]: false },
      select: { userId: true },
    });
    const blockedIds = new Set(optedOut.map(s => s.userId));
    allowedIds = filtered.filter(id => !blockedIds.has(id));
  }

  if (allowedIds.length === 0) return;

  const notifications = await db.notification.createManyAndReturn({
    data: allowedIds.map(uid => ({
      userId: uid,
      actorId,
      type,
      title,
      body,
      link,
      entityId,
      dedupeKey: dedupeKeyPrefix ? `${dedupeKeyPrefix}:${uid}` : undefined,
    })),
    skipDuplicates: true,
  });
  await Promise.allSettled(notifications.map((notification) => enqueueNotificationPush(notification.id, pushContext)));
}
