import { getToken } from 'next-auth/jwt';
import { config, middleware } from '@/middleware';

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    next: () => ({
      status: 200,
      headers: { get: () => null },
    }),
    redirect: (url: URL | string) => ({
      status: 307,
      headers: {
        get: (name: string) => (String(name).toLowerCase() === 'location' ? String(url) : null),
      },
    }),
  },
}));

const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;

function request(path: string) {
  const url = new URL(path, 'http://localhost:3000');
  return {
    url: url.toString(),
    nextUrl: url,
  } as Parameters<typeof middleware>[0];
}

function locationOf(response: { headers: { get: (name: string) => string | null } }) {
  return response.headers.get('location');
}

function shouldInvokeMiddleware(pathname: string) {
  const relative = pathname.replace(/^\//, '');
  if (relative.startsWith('api')) return false;
  if (relative.startsWith('_next/static')) return false;
  if (relative.startsWith('_next/image')) return false;
  if (/\.[^/]+$/.test(pathname)) return false;
  return true;
}

describe('auth middleware', () => {
  beforeEach(() => {
    mockedGetToken.mockReset();
  });

  it('allows anonymous access to public routes', async () => {
    mockedGetToken.mockResolvedValue(null);

    for (const path of ['/', '/shop', '/shop/paw-spa', '/p/abc123']) {
      const response = await middleware(request(path));
      expect(response.status).toBe(200);
      expect(locationOf(response)).toBeNull();
    }
  });

  it('redirects anonymous users from private routes before rendering', async () => {
    mockedGetToken.mockResolvedValue(null);

    const cases = [
      ['/inicio', '/login?callbackUrl=%2Finicio'],
      ['/adoptions', '/login?callbackUrl=%2Fadoptions'],
      ['/community', '/login?callbackUrl=%2Fcommunity'],
      ['/hogares-de-transito', '/login?callbackUrl=%2Fhogares-de-transito'],
    ] as const;

    for (const [path, expected] of cases) {
      const response = await middleware(request(path));
      expect(response.status).toBe(307);
      expect(locationOf(response)).toBe(`http://localhost:3000${expected}`);
    }
  });

  it('preserves path and query in callbackUrl', async () => {
    mockedGetToken.mockResolvedValue(null);
    const response = await middleware(request('/adoptions?pet=1&tab=open'));

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe(
      'http://localhost:3000/login?callbackUrl=%2Fadoptions%3Fpet%3D1%26tab%3Dopen'
    );
  });

  it('redirects authenticated users away from login and register', async () => {
    mockedGetToken.mockResolvedValue({ sub: 'user-1' } as never);

    for (const path of ['/login', '/register']) {
      const response = await middleware(request(path));
      expect(response.status).toBe(307);
      expect(locationOf(response)).toBe('http://localhost:3000/inicio');
    }
  });

  it('lets authenticated users through private routes', async () => {
    mockedGetToken.mockResolvedValue({ sub: 'user-1' } as never);

    for (const path of ['/inicio', '/adoptions', '/community', '/hogares-de-transito']) {
      const response = await middleware(request(path));
      expect(response.status).toBe(200);
      expect(locationOf(response)).toBeNull();
    }
  });

  it('keeps APIs, Next assets and files with extensions outside the matcher', () => {
    expect(config.matcher).toEqual(['/((?!api|_next/static|_next/image|.*\\..*).*)']);
    expect(shouldInvokeMiddleware('/api/stores')).toBe(false);
    expect(shouldInvokeMiddleware('/api/auth/session')).toBe(false);
    expect(shouldInvokeMiddleware('/_next/static/chunks/main.js')).toBe(false);
    expect(shouldInvokeMiddleware('/_next/image')).toBe(false);
    expect(shouldInvokeMiddleware('/favicon.ico')).toBe(false);
    expect(shouldInvokeMiddleware('/inicio')).toBe(true);
    expect(shouldInvokeMiddleware('/shop')).toBe(true);
  });
});
