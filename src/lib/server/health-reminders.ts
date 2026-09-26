import { db } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

const REMINDER_WINDOW_DAYS = 3;
const MAX_REMINDERS_PER_RUN = 500;

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function describeDueDate(dueDate: Date, today: Date) {
  const days = Math.round((startOfUtcDay(dueDate).getTime() - today.getTime()) / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'mañana';
  return `el ${dueDate.toLocaleDateString('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'long' })}`;
}

export async function sendHealthReminders(now = new Date()) {
  const today = startOfUtcDay(now);
  const windowEnd = new Date(today.getTime() + (REMINDER_WINDOW_DAYS + 1) * 86_400_000);

  const records = await db.petHealthRecord.findMany({
    where: {
      completedAt: null,
      dueDate: { gte: today, lt: windowEnd },
    },
    select: {
      id: true,
      name: true,
      dueDate: true,
      pet: { select: { id: true, name: true, owner: { select: { userId: true } } } },
    },
    orderBy: { dueDate: 'asc' },
    take: MAX_REMINDERS_PER_RUN,
  });

  let sent = 0;
  for (const record of records) {
    if (!record.dueDate) continue;
    try {
      const notification = await createNotification({
        userId: record.pet.owner.userId,
        actorId: null,
        type: 'APPOINTMENT',
        title: `Recordatorio de salud de ${record.pet.name}`,
        body: `${record.name} vence ${describeDueDate(record.dueDate, today)}.`,
        link: `/pets/${record.pet.id}`,
        entityId: record.id,
        dedupeKey: `health-reminder:${record.id}:${record.dueDate.toISOString().slice(0, 10)}`,
      });
      if (notification) sent += 1;
    } catch (error) {
      console.error('health_reminder_failed', { recordId: record.id, error });
    }
  }

  return { candidates: records.length, sent };
}
