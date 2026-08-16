import {
  DEFAULT_FOSTER_RADIUS_KM,
  matchesFosterAlertPreferences,
  normalizeFosterRadius,
  rankFosterCandidates,
  scoreFosterCandidate,
  type FosterCandidate,
  type FosterNeed,
} from '@/lib/foster';

const now = new Date('2026-08-16T12:00:00.000Z');

const need: FosterNeed = {
  createdByUserId: 'rescuer-1',
  species: 'dog',
  size: 'medium',
  latitude: -34.6037,
  longitude: -58.3816,
  searchRadiusKm: 5,
  requestedDays: 14,
};

const candidate: FosterCandidate = {
  id: 'foster-1',
  userId: 'host-1',
  status: 'ACTIVE',
  acceptsSpecies: JSON.stringify(['dog']),
  acceptsSizes: JSON.stringify(['medium']),
  capacity: 2,
  occupiedSlots: 0,
  latitude: -34.61,
  longitude: -58.39,
  availableFrom: null,
  availableUntil: new Date('2026-09-30T12:00:00.000Z'),
  maxDurationDays: 30,
  experience: 'experienced',
};

describe('foster matching', () => {
  it('uses 5 km by default and clamps configurable values', () => {
    expect(normalizeFosterRadius(undefined)).toBe(DEFAULT_FOSTER_RADIUS_KM);
    expect(normalizeFosterRadius(0)).toBe(1);
    expect(normalizeFosterRadius(12.6)).toBe(13);
    expect(normalizeFosterRadius(100)).toBe(50);
  });

  it('returns an explainable score for a compatible nearby home', () => {
    const result = scoreFosterCandidate(need, candidate, now);

    expect(result).not.toBeNull();
    expect(result?.distanceKm).toBeLessThan(5);
    expect(result?.score).toBeGreaterThan(50);
    expect(result?.reasons).toEqual(expect.arrayContaining([expect.stringContaining('km de distancia')]));
  });

  it('excludes the rescuer, full homes and candidates outside the radius', () => {
    expect(scoreFosterCandidate(need, { ...candidate, userId: need.createdByUserId }, now)).toBeNull();
    expect(scoreFosterCandidate(need, { ...candidate, occupiedSlots: 2 }, now)).toBeNull();
    expect(
      scoreFosterCandidate(
        need,
        { ...candidate, id: 'far', latitude: -34.7, longitude: -58.5 },
        now
      )
    ).toBeNull();
  });

  it('excludes incompatible species, sizes and availability windows', () => {
    expect(
      scoreFosterCandidate(need, { ...candidate, acceptsSpecies: JSON.stringify(['cat']) }, now)
    ).toBeNull();
    expect(
      scoreFosterCandidate(need, { ...candidate, acceptsSizes: JSON.stringify(['small']) }, now)
    ).toBeNull();
    expect(
      scoreFosterCandidate(
        need,
        { ...candidate, availableUntil: new Date('2026-08-20T12:00:00.000Z') },
        now
      )
    ).toBeNull();
  });

  it('ranks by score and distance and limits the notification batch', () => {
    const candidates = Array.from({ length: 7 }, (_, index) => ({
      ...candidate,
      id: `foster-${index}`,
      userId: `host-${index}`,
      latitude: candidate.latitude + index * 0.001,
    }));

    const ranked = rankFosterCandidates(need, candidates, now);

    expect(ranked).toHaveLength(5);
    expect(ranked[0].distanceKm).toBeLessThanOrEqual(ranked[1].distanceKm);
  });

  it('applies opt-in filters and the configurable alert radius', () => {
    const settings = {
      status: 'ACTIVE' as const,
      caseAlertsEnabled: true,
      alertRadiusKm: 5,
      alertSpecies: JSON.stringify(['dog']),
      alertUrgencies: JSON.stringify(['HIGH', 'CRITICAL']),
    };

    expect(matchesFosterAlertPreferences({ species: 'dog', urgency: 'HIGH' }, settings, 4.9)).toBe(true);
    expect(matchesFosterAlertPreferences({ species: 'cat', urgency: 'HIGH' }, settings, 4)).toBe(false);
    expect(matchesFosterAlertPreferences({ species: 'dog', urgency: 'NORMAL' }, settings, 4)).toBe(false);
    expect(matchesFosterAlertPreferences({ species: 'dog', urgency: 'HIGH' }, settings, 5.1)).toBe(false);
    expect(matchesFosterAlertPreferences(
      { species: 'dog', urgency: 'HIGH' },
      { ...settings, caseAlertsEnabled: false },
      2,
    )).toBe(false);
  });
});
