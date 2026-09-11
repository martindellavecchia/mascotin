import { meetupCalendar } from '@/lib/meetups';
it('exporta UTC, versión, alarma y texto escapado sin inyectar propiedades', () => {
  const calendar = meetupCalendar({
    id: 'test',
    place: 'Parque, centro;\nSTATUS:CANCELLED',
    date: new Date('2026-10-01T15:00:00Z'),
    durationMinutes: 60,
    version: 3,
    updatedAt: new Date('2026-09-11T12:00:00Z'),
  });
  expect(calendar).toContain('DTSTART:20261001T150000Z\r\n');
  expect(calendar).toContain('DTEND:20261001T160000Z\r\n');
  expect(calendar).toContain('TRIGGER:-PT30M');
  expect(calendar).toContain('SEQUENCE:3');
  expect(calendar).not.toContain('\r\nSTATUS:CANCELLED');
});
