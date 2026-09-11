import { z } from 'zod';
export const meetupSchema = z.object({
  place: z.string().trim().min(3).max(180),
  date: z
    .string()
    .datetime({ offset: true })
    .refine((v) => new Date(v) > new Date(), 'Elegí una fecha futura'),
  durationMinutes: z.number().int().min(15).max(180).default(60),
  publicPlace: z.literal(true),
});
export function meetupCalendar(input: {
  id: string;
  place: string;
  date: Date;
  durationMinutes: number;
  updatedAt: Date;
  version: number;
}) {
  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const escape = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  const fold = (s: string) => {
    let output = '',
      width = 0;
    for (const char of s) {
      const length = new TextEncoder().encode(char).length;
      if (width + length > 74) {
        output += '\r\n ';
        width = 1;
      }
      output += char;
      width += length;
    }
    return output;
  };
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Huella//Encuentros//ES',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${input.id}@huella`,
      `SEQUENCE:${input.version}`,
      `DTSTAMP:${stamp(input.updatedAt)}`,
      `DTSTART:${stamp(input.date)}`,
      `DTEND:${stamp(new Date(input.date.getTime() + input.durationMinutes * 60000))}`,
      'SUMMARY:Encuentro de mascotas',
      `LOCATION:${escape(input.place)}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Tu encuentro comienza en 30 minutos',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .map(fold)
      .join('\r\n') + '\r\n'
  );
}
