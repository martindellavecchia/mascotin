import { getEventDateParts } from '@/lib/date-format';

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
