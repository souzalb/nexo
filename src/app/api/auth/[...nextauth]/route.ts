// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/app/_lib/prisma';
import { PrismaAdapter } from '@next-auth/prisma-adapter';

export const authOptions: NextAuthOptions = {
  // Usar o Prisma Adapter para conectar o NextAuth ao seu banco de dados
  //@typescript-eslint/ban-ts-comment
  adapter: PrismaAdapter(db),
  // Definir a estratégia de sessão

  session: {
    strategy: 'jwt',
  },
  // Chave secreta para assinar os JWTs
  secret: process.env.NEXTAUTH_SECRET,
  // Configurar os provedores de autenticação
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'seu@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      // A lógica de autorização
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials.password) {
            console.log('Credenciais ausentes.');
            return null;
          }

          const user = await db.user.findUnique({
            where: { email: credentials.email },
          });

          console.log('Usuário encontrado no banco!');

          // Adicionamos uma verificação extra aqui
          if (!user || !user.password) {
            console.log('Usuário não encontrado ou não possui senha no banco.');
            return null;
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password,
          );

          console.log('A senha é válida?', isPasswordValid);
          console.log('---[AUTHORIZE END]---');

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('ERRO DENTRO DO AUTHORIZE:', error);
          return null; // Retorna null em caso de qualquer erro inesperado
        }
      },
    }),
  ],
  // Callbacks para customizar o comportamento
  callbacks: {
    // Incluir dados adicionais (como role e id) no token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @typescript-eslint/ban-ts-comment
        token.role = user.role;
      }
      return token;
    },
    // Incluir dados adicionais na sessão do cliente (acessível no frontend)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
      }
      return session;
    },
  },
  // Opcional: customizar páginas de login/erro se necessário
  pages: {
    signIn: '/login', // Vamos criar essa página no frontend depois
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
