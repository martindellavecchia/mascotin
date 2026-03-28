import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
});

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '12345',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const validData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(false);
    });

    it('accepts email with special characters', () => {
      const validData = {
        email: 'user.name+tag@example.co.uk',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('registerSchema', () => {
    it('validates correct register data', () => {
      const validData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'J',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects email without @', () => {
      const invalidData = {
        email: 'userexample.com',
        password: 'password123',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects weak password', () => {
      const invalidData = {
        email: 'newuser@example.com',
        password: '123',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('accepts long valid name', () => {
      const validData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'Juan Carlos García López',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('accepts password with special chars', () => {
      const validData = {
        email: 'newuser@example.com',
        password: 'P@ssw0rd!123',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
