import { haversineKm, isWithinRadius, locationsShareZone, toGeoPoint } from '@/lib/geo';
import { rankCandidates, scorePetMatch, type MatchableCandidatePet } from '@/lib/matching';
import { scoreAdoptionCompatibility } from '@/lib/adoption';

describe('geo helpers', () => {
  it('calculates haversine distance between nearby points', () => {
    const buenosAires = { latitude: -34.6037, longitude: -58.3816 };
    const nearby = { latitude: -34.61, longitude: -58.39 };
    const distance = haversineKm(buenosAires, nearby);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(5);
  });

  it('filters points by radius', () => {
    const origin = { latitude: -34.6037, longitude: -58.3816 };
    expect(isWithinRadius(origin, { latitude: -34.61, longitude: -58.39 }, 10)).toBe(true);
    expect(isWithinRadius(origin, { latitude: -31.42, longitude: -64.18 }, 10)).toBe(false);
  });

  it('matches textual zones', () => {
    expect(locationsShareZone('Buenos Aires, Argentina', 'Buenos Aires')).toBe(true);
    expect(locationsShareZone('Córdoba', 'Rosario')).toBe(false);
  });

  it('rejects invalid coordinates', () => {
    expect(toGeoPoint(91, 0)).toBeNull();
    expect(toGeoPoint(-34.6, -58.4)).toEqual({ latitude: -34.6, longitude: -58.4 });
  });
});

describe('matching score', () => {
  const current = {
    id: 'pet-1',
    petType: 'dog',
    breed: 'Labrador',
    size: 'large',
    energy: 'high',
    location: 'Buenos Aires',
    latitude: -34.6,
    longitude: -58.4,
    matchIntent: JSON.stringify(['walk', 'play']),
  };

  const candidate: MatchableCandidatePet = {
    id: 'pet-2',
    name: 'Luna',
    petType: 'dog',
    breed: 'Labrador',
    size: 'large',
    energy: 'high',
    location: 'Buenos Aires',
    latitude: -34.61,
    longitude: -58.39,
    matchIntent: JSON.stringify(['walk']),
    images: JSON.stringify(['https://example.com/luna.jpg']),
    owner: { location: 'Buenos Aires', bio: 'paseos diarios' },
  };

  it('boosts walk companions and nearby pets', () => {
    const scored = scorePetMatch(current, candidate, 'Buenos Aires', 'paseos');
    expect(scored.matchReason).toContain('Compañero de paseo');
    expect(scored.matchScore).toBeGreaterThan(10);
  });

  it('excludes paused owners and mismatched types', () => {
    const ranked = rankCandidates(
      current,
      [
        {
          ...candidate,
          owner: {
            location: 'Buenos Aires',
            bio: null,
            user: { settings: { matchingPaused: true } },
          },
        },
        { ...candidate, id: 'pet-3', petType: 'cat', name: 'Michi' },
      ],
      {
        matchingPaused: false,
        matchDistance: 50,
        matchPetTypes: ['dog'],
        matchPetSizes: ['large'],
      },
      'Buenos Aires',
      null,
      { latitude: -34.6, longitude: -58.4 }
    );

    expect(ranked).toHaveLength(0);
  });
});

describe('adoption compatibility', () => {
  it('scores experienced adopters higher for special needs pets', () => {
    const experienced = scoreAdoptionCompatibility(
      { energy: 'high', goodWithKids: 'yes', goodWithDogs: 'yes', specialNeeds: 'medicación diaria' },
      { housingType: 'house', hasYard: true, hasKids: true, hasOtherPets: true, experience: 'experienced' }
    );
    const beginner = scoreAdoptionCompatibility(
      { energy: 'high', goodWithKids: 'yes', goodWithDogs: 'yes', specialNeeds: 'medicación diaria' },
      { housingType: 'apartment', hasYard: false, hasKids: true, hasOtherPets: true, experience: 'none' }
    );

    expect(experienced).toBeGreaterThan(beginner);
  });
});
