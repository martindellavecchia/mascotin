/**
 * Keep the session cookie name identical in the NextAuth route (Node) and
 * middleware (Edge). NextAuth's default `__Secure-` prefix is inferred from
 * NEXTAUTH_URL or the request protocol, which diverge behind reverse proxies
 * and when the URL is only available at runtime.
 */
export const SESSION_TOKEN_COOKIE_NAME = 'next-auth.session-token';

export function shouldUseSecureCookies() {
  const url = process.env.NEXTAUTH_URL || process.env.AUTH_URL || '';
  if (url) {
    return url.startsWith('https://');
  }
  return false;
}

export function getSessionTokenCookieName() {
  return SESSION_TOKEN_COOKIE_NAME;
}

export function getSessionTokenCookie() {
  return {
    name: SESSION_TOKEN_COOKIE_NAME,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: shouldUseSecureCookies(),
    },
  };
}
