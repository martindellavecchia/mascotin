import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const isLoggedIn = !!req.nextauth.token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
      req.nextUrl.pathname.startsWith('/register') ||
      req.nextUrl.pathname.startsWith('/forgot-password') ||
      req.nextUrl.pathname.startsWith('/reset-password') ||
      req.nextUrl.pathname.startsWith('/verify-email');

    // Redirigir usuarios autenticados fuera de páginas de auth
    if (isLoggedIn && isAuthPage) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Permitir acceso a páginas de auth sin autenticación
      authorized: ({ token, req }) => {
        const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
          req.nextUrl.pathname.startsWith('/register') ||
          req.nextUrl.pathname.startsWith('/forgot-password') ||
          req.nextUrl.pathname.startsWith('/reset-password') ||
          req.nextUrl.pathname.startsWith('/verify-email');
        // Permitir páginas de auth sin token, el resto requiere token
        return isAuthPage || !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|profile-images).*)'],
};
