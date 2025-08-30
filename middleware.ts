// middleware.ts
export { default } from 'next-auth/middleware';

// O matcher define quais rotas serão protegidas pelo middleware.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/rooms/:path*',
    '/users/:path*',
  ],
};
