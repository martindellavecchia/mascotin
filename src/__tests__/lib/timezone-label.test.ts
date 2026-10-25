import {
  COMMON_TIME_ZONES,
  DEFAULT_TIME_ZONE,
  getTimeZoneLabel,
  isArgentineTimeZone,
  isValidTimeZone,
} from '@/lib/timezone-label';

describe('isArgentineTimeZone', () => {
  it('recognizes current and legacy Argentine zones', () => {
    expect(isArgentineTimeZone('America/Argentina/Buenos_Aires')).toBe(true);
    expect(isArgentineTimeZone('America/Argentina/Ushuaia')).toBe(true);
    expect(isArgentineTimeZone('America/Buenos_Aires')).toBe(true);
    expect(isArgentineTimeZone('America/Cordoba')).toBe(true);
  });

  it('rejects other or missing zones', () => {
    expect(isArgentineTimeZone('America/Montevideo')).toBe(false);
    expect(isArgentineTimeZone('UTC')).toBe(false);
    expect(isArgentineTimeZone(undefined)).toBe(false);
  });
});

describe('getTimeZoneLabel', () => {
  it('labels every Argentine zone as hora de Argentina', () => {
    expect(getTimeZoneLabel('America/Argentina/Buenos_Aires')).toBe('hora de Argentina');
    expect(getTimeZoneLabel('America/Argentina/Cordoba')).toBe('hora de Argentina');
    expect(getTimeZoneLabel('America/Argentina/Ushuaia')).toBe('hora de Argentina');
  });

  it('falls back to Argentina when the zone is missing', () => {
    expect(getTimeZoneLabel(undefined)).toBe('hora de Argentina');
    expect(getTimeZoneLabel(null)).toBe('hora de Argentina');
    expect(getTimeZoneLabel('  ')).toBe('hora de Argentina');
  });

  it('uses friendly country labels for common zones', () => {
    expect(getTimeZoneLabel('America/Montevideo')).toBe('hora de Uruguay');
    expect(getTimeZoneLabel('America/Santiago')).toBe('hora de Chile');
    expect(getTimeZoneLabel('Europe/Madrid')).toBe('hora de España (Madrid)');
  });

  it('falls back to the city name with spaces for other zones', () => {
    expect(getTimeZoneLabel('America/New_York')).toBe('hora de New York');
    expect(getTimeZoneLabel('Asia/Ho_Chi_Minh')).toBe('hora de Ho Chi Minh');
  });
});

describe('time zone options', () => {
  it('defaults to Buenos Aires and only lists valid IANA zones', () => {
    expect(COMMON_TIME_ZONES[0].value).toBe(DEFAULT_TIME_ZONE);
    for (const zone of COMMON_TIME_ZONES) {
      expect(isValidTimeZone(zone.value)).toBe(true);
    }
  });

  it('rejects unknown zones', () => {
    expect(isValidTimeZone('Marte/Olympus_Mons')).toBe(false);
  });
});
