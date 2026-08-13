import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAuthPage, isPublicPath } from '@/lib/route-access';
import { getSessionTokenCookieName } from '@/lib/auth-cookies';

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const isLoggedIn = !!req.nextauth.token;
    const authPage = isAuthPage(pathname);

    if (isLoggedIn && authPage) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        return isPublicPath(req.nextUrl.pathname) || !!token;
      },
    },
    cookies: {
      sessionToken: {
        name: getSessionTokenCookieName(),
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
