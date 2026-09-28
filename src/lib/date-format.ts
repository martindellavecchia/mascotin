export const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const eventPartsFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: APP_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export interface EventDateParts {
  day: string;
  month: string;
  year: string;
  time: string;
  label: string;
}

/** Formats in a fixed time zone so server and browser render identical text. */
export function getEventDateParts(value: string | Date): EventDateParts {
  const parts = Object.fromEntries(
    eventPartsFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value])
  );
  const month = (parts.month ?? '').replace('.', '');
  const time = `${parts.hour}:${parts.minute}`;
  return {
    day: parts.day ?? '',
    month,
    year: parts.year ?? '',
    time,
    label: `${parts.day} ${month} ${parts.year}`,
  };
}
