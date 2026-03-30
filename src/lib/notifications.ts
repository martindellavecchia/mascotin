import { db } from '@/lib/db';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  entityId?: string;
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
  PROVIDER_REQUEST: null, // always send
  GROUP_JOIN: 'notifyEvents',
};

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { userId, actorId, type, title, body, link, entityId } = params;

  // Don't self-notify
  if (userId === actorId) return;

  // Check user preference
  const prefField = PREF_MAP[type];
  if (prefField) {
    const settings = await db.userSettings.findUnique({
      where: { userId },
      select: { [prefField]: true },
    });
    if (settings && (settings as Record<string, boolean>)[prefField] === false) return;
  }

  await db.notification.create({
    data: { userId, actorId, type, title, body, link, entityId },
  });
}

export async function createNotificationBulk(
  recipientIds: string[],
  actorId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
  entityId?: string,
): Promise<void> {
  const filtered = recipientIds.filter(id => id !== actorId);
  if (filtered.length === 0) return;

  const prefField = PREF_MAP[type];
  let allowedIds = filtered;

  if (prefField) {
    const optedOut = await db.userSettings.findMany({
      where: { userId: { in: filtered }, [prefField]: false },
      select: { userId: true },
    });
    const blockedIds = new Set(optedOut.map(s => s.userId));
    allowedIds = filtered.filter(id => !blockedIds.has(id));
  }

  if (allowedIds.length === 0) return;

  await db.notification.createMany({
    data: allowedIds.map(uid => ({
      userId: uid,
      actorId,
      type,
      title,
      body,
      link,
      entityId,
    })),
  });
}
