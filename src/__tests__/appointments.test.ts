import {
  getAppointmentConflictWindow,
  UPCOMING_APPOINTMENT_STATUSES,
} from '@/lib/appointments';

describe('appointments helpers', () => {
  it('returns the visible upcoming statuses', () => {
    expect(UPCOMING_APPOINTMENT_STATUSES).toEqual(['PENDING', 'CONFIRMED']);
  });

  it('builds an overlap window that catches appointments starting before the new slot', () => {
    const appointmentDate = new Date('2026-04-20T10:30:00.000Z');
    const { windowStart, windowEnd } = getAppointmentConflictWindow(appointmentDate, 60);

    expect(windowStart.toISOString()).toBe('2026-04-20T09:30:00.000Z');
    expect(windowEnd.toISOString()).toBe('2026-04-20T11:30:00.000Z');
  });

  it('allows back-to-back appointments on exact boundaries', () => {
    const appointmentDate = new Date('2026-04-20T11:00:00.000Z');
    const { windowStart, windowEnd } = getAppointmentConflictWindow(appointmentDate, 60);

    expect(new Date('2026-04-20T10:00:00.000Z').getTime()).toBe(windowStart.getTime());
    expect(new Date('2026-04-20T12:00:00.000Z').getTime()).toBe(windowEnd.getTime());
  });

  it('rejects invalid durations', () => {
    expect(() => getAppointmentConflictWindow(new Date(), 0)).toThrow(
      'durationMinutes must be a positive number'
    );
  });
});
