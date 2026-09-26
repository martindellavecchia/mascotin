export const DEFAULT_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export const COMMON_TIME_ZONES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { value: 'America/Argentina/Cordoba', label: 'Argentina (Córdoba)' },
  { value: 'America/Argentina/Mendoza', label: 'Argentina (Mendoza)' },
  { value: 'America/Argentina/Salta', label: 'Argentina (Salta)' },
  { value: 'America/Argentina/Jujuy', label: 'Argentina (Jujuy)' },
  { value: 'America/Argentina/Tucuman', label: 'Argentina (Tucumán)' },
  { value: 'America/Argentina/Catamarca', label: 'Argentina (Catamarca)' },
  { value: 'America/Argentina/La_Rioja', label: 'Argentina (La Rioja)' },
  { value: 'America/Argentina/San_Juan', label: 'Argentina (San Juan)' },
  { value: 'America/Argentina/San_Luis', label: 'Argentina (San Luis)' },
  { value: 'America/Argentina/Rio_Gallegos', label: 'Argentina (Río Gallegos)' },
  { value: 'America/Argentina/Ushuaia', label: 'Argentina (Ushuaia)' },
  { value: 'America/Montevideo', label: 'Uruguay (Montevideo)' },
  { value: 'America/Santiago', label: 'Chile (Santiago)' },
  { value: 'America/Asuncion', label: 'Paraguay (Asunción)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (San Pablo)' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { value: 'America/Lima', label: 'Perú (Lima)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'Europe/Madrid', label: 'España (Madrid)' },
];

const FRIENDLY_LABELS: Record<string, string> = {
  'America/Montevideo': 'hora de Uruguay',
  'America/Santiago': 'hora de Chile',
  'America/Asuncion': 'hora de Paraguay',
  'America/Sao_Paulo': 'hora de Brasil (San Pablo)',
  'America/Bogota': 'hora de Colombia',
  'America/Lima': 'hora de Perú',
  'America/Mexico_City': 'hora de Ciudad de México',
  'Europe/Madrid': 'hora de España (Madrid)',
};

export function getTimeZoneLabel(timeZone?: string | null): string {
  const zone = timeZone?.trim() || DEFAULT_TIME_ZONE;
  if (zone.startsWith('America/Argentina/')) return 'hora de Argentina';
  if (FRIENDLY_LABELS[zone]) return FRIENDLY_LABELS[zone];
  const city = zone.split('/').pop()?.replaceAll('_', ' ');
  return city ? `hora de ${city}` : zone;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('es-AR', { timeZone });
    return true;
  } catch {
    return false;
  }
}
