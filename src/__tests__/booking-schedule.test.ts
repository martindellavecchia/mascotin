import {
  availableSlots,
  canTransitionAppointment,
  intervalsOverlap,
  isScheduledSlot,
  scheduleSchema,
} from '@/lib/booking-schedule';
const schedule = scheduleSchema.parse({
  timeZone: 'America/Argentina/Buenos_Aires',
  weekly: [{ day: 1, start: '09:00', end: '12:00' }],
  exceptions: [],
});
const now = new Date('2026-09-13T12:00:00Z');
describe('disponibilidad de reservas', () => {
  it('rechaza fechas inexistentes y excepciones con intervalos superpuestos', () => {
    expect(
      scheduleSchema.safeParse({ ...schedule, exceptions: [{ date: '2026-02-30', intervals: [] }] })
        .success
    ).toBe(false);
    expect(
      scheduleSchema.safeParse({
        ...schedule,
        exceptions: [
          {
            date: '2026-09-14',
            intervals: [
              { start: '09:00', end: '11:00' },
              { start: '10:00', end: '12:00' },
            ],
          },
        ],
      }).success
    ).toBe(false);
  });
  it('respeta zona horaria, duración completa, anticipación y grilla de 15 minutos', () => {
    expect(isScheduledSlot(schedule, new Date('2026-09-14T12:00:00Z'), 60, now)).toBe(true);
    expect(isScheduledSlot(schedule, new Date('2026-09-14T11:45:00Z'), 60, now)).toBe(false);
    expect(isScheduledSlot(schedule, new Date('2026-09-14T14:30:00Z'), 60, now)).toBe(false);
    expect(isScheduledSlot(schedule, new Date('2026-09-14T12:01:00Z'), 60, now)).toBe(false);
    expect(isScheduledSlot(schedule, new Date('2026-10-19T12:00:00Z'), 60, now)).toBe(false);
  });
  it('un cierre por fecha reemplaza la semana y una excepción abre otro día', () => {
    const amended = {
      ...schedule,
      exceptions: [
        { date: '2026-09-14', intervals: [] },
        { date: '2026-09-15', intervals: [{ start: '10:00', end: '11:00' }] },
      ],
    };
    expect(isScheduledSlot(amended, new Date('2026-09-14T12:00:00Z'), 60, now)).toBe(false);
    expect(isScheduledSlot(amended, new Date('2026-09-15T13:00:00Z'), 60, now)).toBe(true);
  });
  it('detecta duraciones desiguales y permite turnos consecutivos', () => {
    expect(
      intervalsOverlap(new Date('2026-09-14T13:00:00Z'), 30, new Date('2026-09-14T12:00:00Z'), 90)
    ).toBe(true);
    expect(
      intervalsOverlap(new Date('2026-09-14T13:30:00Z'), 30, new Date('2026-09-14T12:00:00Z'), 90)
    ).toBe(false);
    const slots = availableSlots(
      schedule,
      60,
      [{ date: new Date('2026-09-14T12:00:00Z'), durationMinutes: 90, service: { duration: 15 } }],
      now
    );
    expect(slots).not.toContain('2026-09-14T13:00:00.000Z');
    expect(slots).toContain('2026-09-14T13:30:00.000Z');
  });
  it('resuelve horario de verano con la zona del prestador', () => {
    const ny = scheduleSchema.parse({
      timeZone: 'America/New_York',
      weekly: [{ day: 1, start: '09:00', end: '10:00' }],
      exceptions: [],
    });
    expect(
      isScheduledSlot(ny, new Date('2026-11-02T14:00:00Z'), 60, new Date('2026-10-30T12:00:00Z'))
    ).toBe(true);
    expect(
      isScheduledSlot(ny, new Date('2026-11-02T13:00:00Z'), 60, new Date('2026-10-30T12:00:00Z'))
    ).toBe(false);
  });
  it('solo completa confirmados después de su finalización', () => {
    const start = new Date('2026-09-14T12:00:00Z');
    expect(
      canTransitionAppointment(
        'CONFIRMED',
        'COMPLETED',
        true,
        start,
        60,
        new Date('2026-09-14T13:00:00Z')
      )
    ).toBe(true);
    expect(
      canTransitionAppointment(
        'PENDING',
        'COMPLETED',
        true,
        start,
        60,
        new Date('2026-09-14T13:00:00Z')
      )
    ).toBe(false);
    expect(canTransitionAppointment('CANCELLED', 'CONFIRMED', true, start, 60, now)).toBe(false);
  });
});
