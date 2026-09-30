export const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const EVENT_TIME_ZONE_LABEL = 'hora de Argentina';

const inputFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function inputParts(value: string | Date) {
  return Object.fromEntries(inputFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
}

export function getEventDayKey(value: string | Date) {
  const parts = inputParts(value);
  return parts.year + '-' + parts.month + '-' + parts.day;
}

export function toEventDateInput(value: string | Date) {
  const parts = inputParts(value);
  return getEventDayKey(value) + 'T' + parts.hour + ':' + parts.minute;
}

export function eventInputToIso(value: string, original?: string | Date | null) {
  if (original && value === toEventDateInput(original)) return new Date(original).toISOString();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('La fecha y hora no son válidas');
  const target = new Date(value + ':00.000Z');
  if (!Number.isFinite(target.getTime()) || target.toISOString().slice(0, 16) !== value) throw new Error('La fecha y hora no son válidas');
  let instant = target.getTime();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = inputParts(new Date(instant));
    const local = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const next = target.getTime() - (local - instant);
    if (next === instant) break;
    instant = next;
  }
  const result = new Date(instant).toISOString();
  if (toEventDateInput(result) !== value) throw new Error('La fecha y hora no existen en la zona del evento');
  return result;
}

export function getEventCalendarDate(value: string | Date) {
  return new Date(getEventDayKey(value) + 'T12:00:00');
}

export function formatEventDate(value: string | Date) {
  const parts = getEventDateParts(value);
  return parts.label + ' · ' + parts.time + ' (' + EVENT_TIME_ZONE_LABEL + ')';
}

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
