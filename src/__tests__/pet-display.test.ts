import {
  formatMissingFields,
  formatPetAge,
  formatPetWeight,
  getMissingPetProfileFields,
  getPetAgeLabel,
  parsePetActivities,
} from '@/lib/pet-display';

describe('pet display helpers', () => {
  it.each([
    [0, 'Menos de 1 año'],
    [0.5, 'Menos de 1 año'],
    [1, '1 año'],
    [4, '4 años'],
  ])('formats age %p as %p', (age, expected) => {
    expect(formatPetAge(age)).toBe(expected);
  });

  it.each([null, undefined, -1, Number.NaN])('treats %p as an unset age', (age) => {
    expect(formatPetAge(age)).toBeNull();
  });

  it('hides the placeholder age of pets created through the short wizard', () => {
    expect(getPetAgeLabel({ age: 0, gender: '' })).toBeNull();
    expect(getPetAgeLabel({ age: 0, gender: 'female' })).toBe('Menos de 1 año');
    expect(getPetAgeLabel({ age: 3, gender: '' })).toBe('3 años');
  });

  it('formats weight with Argentine decimals', () => {
    expect(formatPetWeight(5.5)).toBe('5,5 kg');
    expect(formatPetWeight(12)).toBe('12 kg');
    expect(formatPetWeight(null)).toBeNull();
    expect(formatPetWeight(0)).toBeNull();
  });

  it('keeps only known activities', () => {
    expect(parsePetActivities('["walk","unknown","swim"]')).toEqual(['walk', 'swim']);
    expect(parsePetActivities(['play'])).toEqual(['play']);
    expect(parsePetActivities(null)).toEqual([]);
  });

  it('lists the key fields missing from a wizard-created pet', () => {
    const missing = getMissingPetProfileFields({ age: 0, gender: '', size: '', energy: '', images: '[]' });
    expect(missing).toEqual(['foto', 'edad', 'sexo', 'tamaño', 'energía']);
    expect(formatMissingFields(missing)).toBe('foto, edad, sexo, tamaño y energía');
  });

  it('reports nothing missing for a complete pet', () => {
    expect(getMissingPetProfileFields({
      age: 2,
      gender: 'male',
      size: 'medium',
      energy: 'high',
      images: JSON.stringify(['/pet.jpg']),
      thumbnailIndex: 0,
    })).toEqual([]);
  });
});
