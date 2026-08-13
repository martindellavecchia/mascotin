import {
  SESSION_TOKEN_COOKIE_NAME,
  getSessionTokenCookie,
  getSessionTokenCookieName,
  shouldUseSecureCookies,
} from '@/lib/auth-cookies';

describe('auth cookies', () => {
  const originalNextAuthUrl = process.env.NEXTAUTH_URL;
  const originalAuthUrl = process.env.AUTH_URL;

  afterEach(() => {
    if (originalNextAuthUrl === undefined) {
      delete process.env.NEXTAUTH_URL;
    } else {
      process.env.NEXTAUTH_URL = originalNextAuthUrl;
    }

    if (originalAuthUrl === undefined) {
      delete process.env.AUTH_URL;
    } else {
      process.env.AUTH_URL = originalAuthUrl;
    }
  });

  it('always uses the same cookie name so middleware and the API stay in sync', () => {
    process.env.NEXTAUTH_URL = 'https://mascotin.app';
    expect(getSessionTokenCookieName()).toBe(SESSION_TOKEN_COOKIE_NAME);

    process.env.NEXTAUTH_URL = 'http://berserk.local:3000';
    expect(getSessionTokenCookieName()).toBe(SESSION_TOKEN_COOKIE_NAME);
  });

  it('marks the cookie Secure only for HTTPS public URLs', () => {
    process.env.NEXTAUTH_URL = 'https://mascotin.app';
    delete process.env.AUTH_URL;
    expect(shouldUseSecureCookies()).toBe(true);
    expect(getSessionTokenCookie().options.secure).toBe(true);

    process.env.NEXTAUTH_URL = 'http://berserk.local:3000';
    expect(shouldUseSecureCookies()).toBe(false);
    expect(getSessionTokenCookie().options.secure).toBe(false);
  });

  it('does not assume HTTPS when the public URL is missing', () => {
    delete process.env.NEXTAUTH_URL;
    delete process.env.AUTH_URL;

    expect(shouldUseSecureCookies()).toBe(false);
    expect(getSessionTokenCookie().options.secure).toBe(false);
  });
});
