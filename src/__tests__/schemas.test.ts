import { petSchema, ownerSchema } from '../lib/schemas';

describe('schemas', () => {
  describe('petSchema', () => {
    it('validates correct pet data', () => {
      const validData = {
        name: 'Max',
        petType: 'dog',
        breed: 'Golden Retriever',
        age: 3,
        size: 'large',
        gender: 'male',
        vaccinated: true,
        neutered: false,
        energy: 'high',
        bio: 'Friendly dog who loves walks',
        activities: ['walk', 'play'],
        location: 'Madrid',
        images: ['img1.jpg', 'img2.png'],
      };

      const result = petSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid age', () => {
      const invalidData = {
        name: 'Max',
        petType: 'dog',
        age: -1,
        size: 'large',
        gender: 'male',
        energy: 'high',
        bio: 'Bio',
        activities: ['walk'],
        location: 'Madrid',
        images: ['img1.jpg'],
      };

      const result = petSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects empty activities', () => {
      const invalidData = {
        name: 'Max',
        petType: 'dog',
        age: 3,
        size: 'large',
        gender: 'male',
        energy: 'high',
        bio: 'Bio',
        activities: [],
        location: 'Madrid',
        images: ['img1.jpg'],
      };

      const result = petSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects short bio', () => {
      const invalidData = {
        name: 'Max',
        petType: 'dog',
        age: 3,
        size: 'large',
        gender: 'male',
        energy: 'high',
        bio: 'Hi',
        activities: ['walk'],
        location: 'Madrid',
        images: ['img1.jpg'],
      };

      const result = petSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('ownerSchema', () => {
    it('validates correct owner data', () => {
      const validData = {
        name: 'John Doe',
        location: 'Madrid',
      };

      const result = ownerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
      const invalidData = {
        name: 'A',
        location: 'Madrid',
      };

      const result = ownerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('accepts optional phone', () => {
      const validData = {
        name: 'John Doe',
        phone: '+123456789',
        location: 'Madrid',
        bio: 'Pet owner',
        hasYard: true,
        hasOtherPets: false,
      };

      const result = ownerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});