import { z } from 'zod';
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const interval = z
  .object({ start: time, end: time })
  .refine((v) => v.start < v.end, 'La hora final debe ser posterior');
export const scheduleSchema = z
  .object({
    timeZone: z
      .string()
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Zona horaria inválida')
      .default('America/Argentina/Buenos_Aires'),
    weekly: z.array(interval.safeExtend({ day: z.number().int().min(0).max(6) })).max(28),
    exceptions: z
      .array(
        z.object({
          date: z.iso.date(),
          intervals: z.array(interval).max(4),
        })
      )
      .max(90)
      .default([]),
  })
  .superRefine((s, ctx) => {
    for (const day of [0, 1, 2, 3, 4, 5, 6]) {
      const rows = s.weekly
        .filter((r) => r.day === day)
        .sort((a, b) => a.start.localeCompare(b.start));
      if (rows.some((row, i) => i > 0 && row.start < rows[i - 1].end))
        ctx.addIssue({ code: 'custom', message: 'Hay intervalos superpuestos', path: ['weekly'] });
    }
    if (new Set(s.exceptions.map((e) => e.date)).size !== s.exceptions.length)
      ctx.addIssue({
        code: 'custom',
        message: 'No repitas fechas de excepción',
        path: ['exceptions'],
      });
    s.exceptions.forEach((exception, index) => {
      const rows = [...exception.intervals].sort((a, b) => a.start.localeCompare(b.start));
      if (rows.some((row, i) => i > 0 && row.start < rows[i - 1].end))
        ctx.addIssue({
          code: 'custom',
          message: 'Hay horarios especiales superpuestos',
          path: ['exceptions', index, 'intervals'],
        });
    });
  });
export type BookingSchedule = z.infer<typeof scheduleSchema>;
const formatters = new Map<string, Intl.DateTimeFormat>();
function localParts(date: Date, zone: string) {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(zone, formatter);
  }
  const p = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return { day: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
export function isScheduledSlot(
  schedule: BookingSchedule,
  date: Date,
  duration: number,
  now = new Date()
) {
  if (
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 1440 ||
    !Number.isFinite(date.getTime())
  )
    return false;
  if (
    date <= now ||
    date.getTime() > now.getTime() + 30 * 86400000 ||
    date.getUTCSeconds() !== 0 ||
    date.getUTCMilliseconds() !== 0
  )
    return false;
  const start = localParts(date, schedule.timeZone);
  if (Number(start.time.slice(3)) % 15 !== 0) return false;
  const end = localParts(new Date(date.getTime() + duration * 60000), schedule.timeZone);
  if (start.day !== end.day || end.time <= start.time) return false;
  const weekday = new Date(`${start.day}T12:00:00Z`).getUTCDay();
  const exception = schedule.exceptions.find((e) => e.date === start.day);
  const intervals = exception
    ? exception.intervals
    : schedule.weekly.filter((i) => i.day === weekday);
  return intervals.some((i) => start.time >= i.start && end.time <= i.end);
}
export function intervalsOverlap(
  start: Date,
  duration: number,
  otherStart: Date,
  otherDuration: number
) {
  return (
    start.getTime() < otherStart.getTime() + otherDuration * 60000 &&
    otherStart.getTime() < start.getTime() + duration * 60000
  );
}
export function availableSlots(
  schedule: BookingSchedule,
  duration: number,
  appointments: Array<{
    date: Date;
    durationMinutes: number | null;
    service: { duration: number };
  }>,
  now = new Date()
) {
  const slots: string[] = [];
  for (
    let millis = Math.ceil((now.getTime() + 1) / 900000) * 900000;
    millis <= now.getTime() + 30 * 86400000;
    millis += 900000
  ) {
    const date = new Date(millis);
    if (
      isScheduledSlot(schedule, date, duration, now) &&
      !appointments.some((a) =>
        intervalsOverlap(date, duration, a.date, a.durationMinutes ?? a.service.duration)
      )
    )
      slots.push(date.toISOString());
  }
  return slots;
}
export function canTransitionAppointment(
  from: string,
  to: string,
  isProvider: boolean,
  date: Date,
  duration: number,
  now = new Date()
) {
  if (!['PENDING', 'CONFIRMED'].includes(from)) return false;
  if (to === 'CANCELLED') return isProvider || date > now;
  if (!isProvider) return false;
  if (to === 'CONFIRMED') return from === 'PENDING' && date > now;
  return (
    to === 'COMPLETED' && from === 'CONFIRMED' && date.getTime() + duration * 60000 <= now.getTime()
  );
}
