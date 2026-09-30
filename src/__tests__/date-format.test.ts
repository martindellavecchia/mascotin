import { getEventDateParts, eventInputToIso, toEventDateInput, getEventDayKey, getEventCalendarDate } from '@/lib/date-format';

describe('getEventDateParts', () => {
  it('muestra la hora de Argentina sin depender de la zona del servidor', () => {
    expect(getEventDateParts('2026-01-06T21:11:00.000Z')).toEqual({
      day: '6',
      month: 'ene',
      year: '2026',
      time: '18:11',
      label: '6 ene 2026',
    });
  });

  it('respeta el cambio de día según la hora de Argentina', () => {
    const parts = getEventDateParts('2026-01-16T01:30:00.000Z');
    expect(parts.day).toBe('15');
    expect(parts.time).toBe('22:30');
  });
});

describe('event form round trip', () => {
  it.each(['2026-01-06T21:11:00.000Z', '2026-01-16T01:30:29.123Z', '2026-07-01T03:00:00.000Z'])(
    'preserves the exact instant %s when the date is not edited', (instant) => {
      expect(eventInputToIso(toEventDateInput(instant), instant)).toBe(instant);
    },
  );
  it('converts Argentina wall time independently of the host time zone', () => {
    expect(eventInputToIso('2026-01-06T18:11')).toBe('2026-01-06T21:11:00.000Z');
    expect(eventInputToIso('2026-07-01T00:30')).toBe('2026-07-01T03:30:00.000Z');
    expect(getEventDayKey('2026-01-16T01:30:00.000Z')).toBe('2026-01-15');
    const calendarDay = getEventCalendarDate('2026-01-16T01:30:00.000Z');
    expect([calendarDay.getFullYear(), calendarDay.getMonth(), calendarDay.getDate()]).toEqual([2026, 0, 15]);
  });
  it.each(['2026-02-30T10:00', '2026-01-01T25:00', 'invalid', '2026-01-01', '2026-01-01T10:00Z'])(
    'rejects invalid local input %s', (input) => expect(() => eventInputToIso(input)).toThrow(),
  );
});
