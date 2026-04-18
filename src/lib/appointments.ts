export const UPCOMING_APPOINTMENT_STATUSES = ['PENDING', 'CONFIRMED'] as const;

export function getAppointmentConflictWindow(
  appointmentDate: Date,
  durationMinutes: number
) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error('durationMinutes must be a positive number');
  }

  const durationMs = durationMinutes * 60 * 1000;

  return {
    windowStart: new Date(appointmentDate.getTime() - durationMs),
    windowEnd: new Date(appointmentDate.getTime() + durationMs),
  };
}
