import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isAuthPage, isPublicPath } from '@/lib/route-access';

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const isLoggedIn = !!req.nextauth.token;
    const authPage = isAuthPage(pathname);

    // Redirigir usuarios autenticados fuera de páginas de auth
    if (isLoggedIn && authPage) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Mantener la home pública y dejar pasar assets públicos fuera del middleware.
      authorized: ({ token, req }) => {
        return isPublicPath(req.nextUrl.pathname) || !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};
