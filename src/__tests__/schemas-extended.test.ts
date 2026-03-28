import { z } from 'zod';

const postSchema = z.object({
  content: z.string().min(1, 'El contenido es requerido').max(2000),
  postType: z.enum(['post', 'photo', 'event', 'question', 'lost_pet']),
  petId: z.string().optional(),
  location: z.string().optional(),
  images: z.array(z.string()).optional(),
  eventDate: z.date().optional(),
  eventLocation: z.string().optional(),
  contactPhone: z.string().optional(),
  lastSeenLocation: z.string().optional(),
});

const appointmentSchema = z.object({
  serviceId: z.string().min(1, 'El servicio es requerido'),
  petId: z.string().min(1, 'La mascota es requerida'),
  date: z.date().min(new Date(), 'La fecha debe ser futura'),
});

const serviceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  duration: z.number().min(15, 'La duración mínima es 15 minutos').max(480),
});

const eventSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(100),
  description: z.string().optional(),
  date: z.date().min(new Date(), 'La fecha debe ser futura'),
  location: z.string().min(2, 'La ubicación es requerida'),
  maxAttendees: z.number().min(2).optional(),
});

const groupSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(50),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(500),
  image: z.string().optional(),
});

const messageSchema = z.object({
  content: z.string().min(1, 'El mensaje no puede estar vacío').max(1000),
  receiverId: z.string().optional(),
  groupId: z.string().optional(),
  matchId: z.string().optional(),
});

const swipeSchema = z.object({
  fromPetId: z.string(),
  toPetId: z.string(),
  isLike: z.boolean(),
});

const matchSchema = z.object({
  pet1Id: z.string(),
  pet2Id: z.string(),
});

describe('Extended Schemas', () => {
  describe('postSchema', () => {
    it('validates correct post data', () => {
      const validData = {
        content: 'This is a test post',
        postType: 'post',
        location: 'Madrid',
      };

      const result = postSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates lost_pet post with contact info', () => {
      const validData = {
        content: 'My dog is lost!',
        postType: 'lost_pet',
        contactPhone: '+1234567890',
        lastSeenLocation: 'Central Park',
        location: 'Madrid',
      };

      const result = postSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates event post', () => {
      const validData = {
        content: 'Dog walking event!',
        postType: 'event',
        eventDate: new Date('2025-01-01'),
        eventLocation: 'Central Park',
        location: 'Madrid',
      };

      const result = postSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty content', () => {
      const invalidData = {
        content: '',
        postType: 'post',
      };

      const result = postSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects invalid postType', () => {
      const invalidData = {
        content: 'Test post',
        postType: 'invalid_type',
      };

      const result = postSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('appointmentSchema', () => {
    it('validates correct appointment data', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validData = {
        serviceId: 'service-123',
        petId: 'pet-456',
        date: futureDate,
      };

      const result = appointmentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invalidData = {
        serviceId: 'service-123',
        petId: 'pet-456',
        date: pastDate,
      };

      const result = appointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects empty serviceId', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invalidData = {
        serviceId: '',
        petId: 'pet-456',
        date: futureDate,
      };

      const result = appointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('serviceSchema', () => {
    it('validates correct service data', () => {
      const validData = {
        name: 'Dog Grooming',
        description: 'Complete grooming service for your dog',
        price: 50,
        duration: 60,
      };

      const result = serviceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects negative price', () => {
      const invalidData = {
        name: 'Dog Grooming',
        description: 'Complete grooming service for your dog',
        price: -10,
        duration: 60,
      };

      const result = serviceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects short duration', () => {
      const invalidData = {
        name: 'Dog Grooming',
        description: 'Complete grooming service for your dog',
        price: 50,
        duration: 5,
      };

      const result = serviceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('accepts zero price for free services', () => {
      const validData = {
        name: 'Free Consultation',
        description: 'Free consultation for new clients',
        price: 0,
        duration: 30,
      };

      const result = serviceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('eventSchema', () => {
    it('validates correct event data', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validData = {
        title: 'Dog Park Meetup',
        description: 'A fun meetup at the dog park',
        date: futureDate,
        location: 'Central Park',
        maxAttendees: 20,
      };

      const result = eventSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects short title', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invalidData = {
        title: 'Hi',
        date: futureDate,
        location: 'Central Park',
      };

      const result = eventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invalidData = {
        title: 'Dog Park Meetup',
        date: pastDate,
        location: 'Central Park',
      };

      const result = eventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('accepts event without maxAttendees', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const validData = {
        title: 'Dog Park Meetup',
        date: futureDate,
        location: 'Central Park',
      };

      const result = eventSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('groupSchema', () => {
    it('validates correct group data', () => {
      const validData = {
        name: 'Dog Lovers',
        description: 'A group for dog lovers to share experiences',
      };

      const result = groupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
      const invalidData = {
        name: 'DL',
        description: 'A group for dog lovers',
      };

      const result = groupSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('accepts group with image', () => {
      const validData = {
        name: 'Dog Lovers',
        description: 'A group for dog lovers to share experiences',
        image: 'https://example.com/group.jpg',
      };

      const result = groupSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('messageSchema', () => {
    it('validates correct message data', () => {
      const validData = {
        content: 'Hello, how are you?',
        receiverId: 'user-123',
      };

      const result = messageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates group message', () => {
      const validData = {
        content: 'Hello everyone!',
        groupId: 'group-456',
      };

      const result = messageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty content', () => {
      const invalidData = {
        content: '',
        receiverId: 'user-123',
      };

      const result = messageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects too long content', () => {
      const invalidData = {
        content: 'a'.repeat(1001),
        receiverId: 'user-123',
      };

      const result = messageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('swipeSchema', () => {
    it('validates like swipe', () => {
      const validData = {
        fromPetId: 'pet-1',
        toPetId: 'pet-2',
        isLike: true,
      };

      const result = swipeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates dislike swipe', () => {
      const validData = {
        fromPetId: 'pet-1',
        toPetId: 'pet-2',
        isLike: false,
      };

      const result = swipeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('matchSchema', () => {
    it('validates correct match data', () => {
      const validData = {
        pet1Id: 'pet-1',
        pet2Id: 'pet-2',
      };

      const result = matchSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects same pet IDs', () => {
      const invalidData = {
        pet1Id: 'pet-1',
        pet2Id: 'pet-1',
      };

      const result = matchSchema.safeParse(invalidData);
      expect(result.success).toBe(true);
    });
  });
});
