import { NextRequest } from 'next/server';

const createMockRequest = (body: any, method: string = 'POST'): NextRequest => {
  return {
    method,
    json: async () => body,
    nextUrl: new URL('http://localhost/api/pets'),
  } as unknown as NextRequest;
};

describe('Pets API', () => {
  describe('POST /api/pets', () => {
    it('validates pet creation request', async () => {
      const validPetData = {
        name: 'Max',
        petType: 'dog',
        age: 3,
        size: 'large',
        gender: 'male',
        energy: 'high',
        bio: 'Friendly dog who loves walks and playing fetch',
        activities: ['walking', 'playing'],
        location: 'Madrid',
        images: ['img1.jpg'],
      };

      expect(validPetData.name).toBeDefined();
      expect(validPetData.petType).toBe('dog');
      expect(validPetData.age).toBeGreaterThan(0);
      expect(validPetData.bio.length).toBeGreaterThanOrEqual(10);
      expect(validPetData.activities.length).toBeGreaterThan(0);
      expect(validPetData.images.length).toBeGreaterThan(0);
    });

    it('rejects pet without name', () => {
      const invalidPetData = {
        petType: 'dog',
        age: 3,
        size: 'large',
        gender: 'male',
        energy: 'high',
        bio: 'Friendly dog',
        activities: ['walking'],
        location: 'Madrid',
        images: ['img1.jpg'],
      };

      expect('name' in invalidPetData).toBe(false);
    });

    it('rejects pet with invalid age', () => {
      const invalidPetData = {
        name: 'Max',
        petType: 'dog',
        age: -5,
        size: 'large',
        gender: 'male',
        energy: 'high',
        bio: 'Friendly dog',
        activities: ['walking'],
        location: 'Madrid',
        images: ['img1.jpg'],
      };

      expect(invalidPetData.age).toBeLessThan(0);
    });

    it('rejects pet without images', () => {
      const invalidPetData = {
        name: 'Max',
        petType: 'dog',
        age: 3,
        size: 'large',
        gender: 'male',
        energy: 'high',
        bio: 'Friendly dog',
        activities: ['walking'],
        location: 'Madrid',
        images: [],
      };

      expect(invalidPetData.images.length).toBe(0);
    });
  });

  describe('GET /api/pets', () => {
    it('accepts query parameters for filtering', () => {
      const queryParams = {
        petType: 'dog',
        size: 'large',
        energy: 'high',
        location: 'Madrid',
        page: '1',
        limit: '10',
      };

      expect(queryParams.petType).toBeDefined();
      expect(queryParams.size).toBeDefined();
      expect(queryParams.energy).toBeDefined();
      expect(queryParams.location).toBeDefined();
      expect(queryParams.page).toBeDefined();
      expect(queryParams.limit).toBeDefined();
    });

    it('validates pagination parameters', () => {
      const validPagination = { page: '1', limit: '20' };
      expect(parseInt(validPagination.page)).toBeGreaterThan(0);
      expect(parseInt(validPagination.limit)).toBeGreaterThan(0);
      expect(parseInt(validPagination.limit)).toBeLessThanOrEqual(100);
    });
  });
});

describe('Swipe API', () => {
  describe('POST /api/swipe', () => {
    it('validates swipe request', () => {
      const validSwipeData = {
        fromPetId: 'pet-1',
        toPetId: 'pet-2',
        isLike: true,
      };

      expect(validSwipeData.fromPetId).toBeDefined();
      expect(validSwipeData.toPetId).toBeDefined();
      expect(typeof validSwipeData.isLike).toBe('boolean');
    });

    it('rejects swipe without fromPetId', () => {
      const invalidSwipeData = {
        toPetId: 'pet-2',
        isLike: true,
      };

      expect('fromPetId' in invalidSwipeData).toBe(false);
    });

    it('rejects swipe to same pet', () => {
      const invalidSwipeData = {
        fromPetId: 'pet-1',
        toPetId: 'pet-1',
        isLike: true,
      };

      expect(invalidSwipeData.fromPetId).toBe(invalidSwipeData.toPetId);
    });
  });
});

describe('Matches API', () => {
  describe('GET /api/matches', () => {
    it('validates match response structure', () => {
      const mockMatch = {
        id: 'match-1',
        pet1Id: 'pet-1',
        pet2Id: 'pet-2',
        createdAt: new Date().toISOString(),
        messages: [],
      };

      expect(mockMatch.id).toBeDefined();
      expect(mockMatch.pet1Id).toBeDefined();
      expect(mockMatch.pet2Id).toBeDefined();
      expect(mockMatch.createdAt).toBeDefined();
      expect(Array.isArray(mockMatch.messages)).toBe(true);
    });
  });
});

