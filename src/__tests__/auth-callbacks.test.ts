jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({})),
}));

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn((config) => config),
}));

jest.mock('@/lib/db', () => ({
  db: {},
}));

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(),
  RATE_LIMITS: {
    auth: {},
  },
}));

import { authOptions } from '@/lib/auth';

describe('auth callbacks', () => {
  it('stores role and header image in the JWT on sign-in', async () => {
    const jwt = authOptions.callbacks?.jwt;

    expect(jwt).toBeDefined();

    const token = await jwt!({
      token: {},
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'PROVIDER',
        headerImage: 'https://example.com/owner.webp',
      } as never,
      account: null,
      profile: undefined,
      trigger: 'signIn',
      isNewUser: false,
      session: undefined,
    });

    expect(token.id).toBe('user-1');
    expect(token.role).toBe('PROVIDER');
    expect(token.headerImage).toBe('https://example.com/owner.webp');
  });

  it('projects role and header image into the session payload', async () => {
    const sessionCallback = authOptions.callbacks?.session;

    expect(sessionCallback).toBeDefined();

    const session = await sessionCallback!({
      session: {
        user: {
          id: '',
          email: 'test@example.com',
        },
        expires: '2099-01-01T00:00:00.000Z',
      },
      token: {
        id: 'user-1',
        role: 'ADMIN',
        headerImage: 'https://example.com/admin.webp',
      } as never,
      user: {} as never,
      newSession: undefined,
      trigger: 'update',
    });

    expect(session.user.id).toBe('user-1');
    expect(session.user.role).toBe('ADMIN');
    expect(session.user.headerImage).toBe('https://example.com/admin.webp');
  });
});
