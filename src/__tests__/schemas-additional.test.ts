import { z } from 'zod';

const statsSchema = z.object({
  totalPets: z.number().min(0),
  totalMatches: z.number().min(0),
  totalSwipes: z.number().min(0),
  likesReceived: z.number().min(0),
});

const appointmentSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  petId: z.string(),
  date: z.string(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
});

const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  services: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().min(0),
  })),
});

describe('Additional Schemas', () => {
  describe('statsSchema', () => {
    it('validates correct stats', () => {
      const validStats = {
        totalPets: 5,
        totalMatches: 3,
        totalSwipes: 20,
        likesReceived: 150,
      };

      const result = statsSchema.safeParse(validStats);
      expect(result.success).toBe(true);
    });

    it('rejects negative pets', () => {
      const invalidStats = {
        totalPets: -1,
        totalMatches: 3,
        totalSwipes: 20,
        likesReceived: 150,
      };

      const result = statsSchema.safeParse(invalidStats);
      expect(result.success).toBe(false);
    });

    it('rejects negative matches', () => {
      const invalidStats = {
        totalPets: 5,
        totalMatches: -1,
        totalSwipes: 20,
        likesReceived: 150,
      };

      const result = statsSchema.safeParse(invalidStats);
      expect(result.success).toBe(false);
    });

    it('accepts zero values', () => {
      const validStats = {
        totalPets: 0,
        totalMatches: 0,
        totalSwipes: 0,
        likesReceived: 0,
      };

      const result = statsSchema.safeParse(validStats);
      expect(result.success).toBe(true);
    });
  });

  describe('appointmentSchema', () => {
    it('validates correct appointment', () => {
      const validAppointment = {
        id: 'apt-1',
        serviceId: 'svc-1',
        petId: 'pet-1',
        date: '2025-01-20T10:00:00Z',
        status: 'pending',
      };

      const result = appointmentSchema.safeParse(validAppointment);
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const invalidAppointment = {
        id: 'apt-1',
        serviceId: 'svc-1',
        petId: 'pet-1',
        date: '2025-01-20T10:00:00Z',
        status: 'invalid_status',
      };

      const result = appointmentSchema.safeParse(invalidAppointment);
      expect(result.success).toBe(false);
    });

    it('accepts all valid statuses', () => {
      const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];

      statuses.forEach(status => {
        const appointment = {
          id: 'apt-1',
          serviceId: 'svc-1',
          petId: 'pet-1',
          date: '2025-01-20T10:00:00Z',
          status,
        };

        const result = appointmentSchema.safeParse(appointment);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('providerSchema', () => {
    it('validates correct provider', () => {
      const validProvider = {
        id: 'prov-1',
        name: 'Vet Clinic',
        email: 'vet@example.com',
        services: [
          { id: 'svc-1', name: 'Grooming', price: 50 },
          { id: 'svc-2', name: 'Checkup', price: 30 },
        ],
      };

      const result = providerSchema.safeParse(validProvider);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const invalidProvider = {
        id: 'prov-1',
        name: 'Vet Clinic',
        email: 'invalid-email',
        services: [],
      };

      const result = providerSchema.safeParse(invalidProvider);
      expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
      const invalidProvider = {
        id: 'prov-1',
        name: 'Vet Clinic',
        email: 'vet@example.com',
        services: [
          { id: 'svc-1', name: 'Grooming', price: -50 },
        ],
      };

      const result = providerSchema.safeParse(invalidProvider);
      expect(result.success).toBe(false);
    });

    it('accepts empty services array', () => {
      const validProvider = {
        id: 'prov-1',
        name: 'Vet Clinic',
        email: 'vet@example.com',
        services: [],
      };

      const result = providerSchema.safeParse(validProvider);
      expect(result.success).toBe(true);
    });
  });
});
