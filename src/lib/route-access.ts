const AUTH_PAGE_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
] as const;

const PUBLIC_FILE_PATTERN = /\.[^/]+$/;

export function isAuthPage(pathname: string) {
  return AUTH_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

const PUBLIC_PREFIXES = ['/p/'] as const;

export function isPublicPath(pathname: string) {
  return (
    pathname === '/' ||
    isAuthPage(pathname) ||
    PUBLIC_FILE_PATTERN.test(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}
