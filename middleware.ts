import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAuthPage, isPublicPath } from '@/lib/route-access';
import { getSessionTokenCookieName } from '@/lib/auth-cookies';

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: getSessionTokenCookieName(),
  });
  const pathname = req.nextUrl.pathname;
  const isLoggedIn = Boolean(token);

  if (isLoggedIn && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL('/inicio', req.url));
  }

  if (!isPublicPath(pathname) && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
