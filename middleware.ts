// middleware.ts
export { default } from 'next-auth/middleware';

// O matcher define quais rotas serão protegidas pelo middleware.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*', // Protege a rota /dashboard e todas as suas sub-rotas
  ],
};
