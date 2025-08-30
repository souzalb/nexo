import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcryptjs';

import { Role } from '@prisma/client';
import { db } from '@/app/_lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) {
          return null;
        }
        const isPasswordValid = await compare(
          credentials.password,
          user.password,
        );
        if (!isPasswordValid) {
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // A função jwt é chamada sempre que um JSON Web Token é criado ou atualizado.
    async jwt({ token, user, trigger }) {
      // No login inicial, adicionamos os dados do usuário ao token.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }

      // Quando a função `update` da sessão é chamada no cliente (trigger === "update"),
      // nós buscamos novamente os dados do usuário no banco para garantir que o token
      // seja atualizado com os dados mais recentes e consistentes.
      if (trigger === 'update') {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    // A função session é chamada sempre que a sessão é verificada no cliente.
    // Ela usa os dados do token para construir o objeto da sessão.
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
