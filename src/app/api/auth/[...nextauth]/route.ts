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
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        // 1. Encontrar o usuário no banco de dados pelo email
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        // 2. Comparar a senha fornecida com o hash armazenado
        const isPasswordValid = await compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        // 3. Se tudo estiver correto, retornar o objeto do usuário
        // O NextAuth cuidará do resto (criar sessão, JWT, etc.)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role, // Incluir o papel do usuário no token
        };
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
