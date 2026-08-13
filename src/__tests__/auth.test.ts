import { loginSchema, registerSchema, passwordSchema } from '@/lib/schemas';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('accepts extra NextAuth credential fields', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        csrfToken: 'token',
        callbackUrl: 'http://localhost:3000',
        json: 'true',
        redirect: 'false',
      });

      expect(result.success).toBe(true);
    });

    it('trims email whitespace', () => {
      const result = loginSchema.safeParse({
        email: '  test@example.com  ',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });

      expect(result.success).toBe(false);
    });

    it('allows existing short passwords so bcrypt can verify them', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '123456',
      });

      expect(result.success).toBe(true);
    });

    it('accepts email with special characters', () => {
      const result = loginSchema.safeParse({
        email: 'user.name+tag@example.co.uk',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('passwordSchema', () => {
    it('rejects passwords shorter than 8 characters', () => {
      expect(passwordSchema.safeParse('Ab1def').success).toBe(false);
    });

    it('rejects passwords without an uppercase letter', () => {
      expect(passwordSchema.safeParse('password1').success).toBe(false);
    });

    it('rejects passwords without a lowercase letter', () => {
      expect(passwordSchema.safeParse('PASSWORD1').success).toBe(false);
    });

    it('rejects passwords without a number', () => {
      expect(passwordSchema.safeParse('Password').success).toBe(false);
    });

    it('accepts a strong password', () => {
      expect(passwordSchema.safeParse('Password1').success).toBe(true);
    });
  });

  describe('registerSchema', () => {
    it('validates correct register data', () => {
      const result = registerSchema.safeParse({
        email: 'newuser@example.com',
        password: 'Password1',
        name: 'John Doe',
      });

      expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
      const result = registerSchema.safeParse({
        email: 'newuser@example.com',
        password: 'Password1',
        name: 'J',
      });

      expect(result.success).toBe(false);
    });

    it('rejects email without @', () => {
      const result = registerSchema.safeParse({
        email: 'userexample.com',
        password: 'Password1',
        name: 'John Doe',
      });

      expect(result.success).toBe(false);
    });

    it('rejects weak password', () => {
      const result = registerSchema.safeParse({
        email: 'newuser@example.com',
        password: '123',
        name: 'John Doe',
      });

      expect(result.success).toBe(false);
    });

    it('accepts long valid name', () => {
      const result = registerSchema.safeParse({
        email: 'newuser@example.com',
        password: 'Password1',
        name: 'Juan Carlos García López',
      });

      expect(result.success).toBe(true);
    });

    it('accepts password with special chars', () => {
      const result = registerSchema.safeParse({
        email: 'newuser@example.com',
        password: 'P@ssw0rd!123',
        name: 'John Doe',
      });

      expect(result.success).toBe(true);
    });
  });
});
