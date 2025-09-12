import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    if (req.nextauth.token?.role === 'ADMIN') {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/calendar', req.url));
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    '/',
    '/users/:path*',
    '/rooms/:path*',
    '/resources/:path*',
    '/profile/:path*',
    '/reports/:path*',
  ],
};
