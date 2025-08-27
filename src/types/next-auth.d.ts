// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { AdapterUser as DefaultAdapterUser } from 'next-auth/adapters';

// Importe o tipo Role do seu schema Prisma se desejar usar o ENUM
// import { Role } from '@prisma/client';
// @typescript-eslint/no-unused-vars
declare module 'next-auth' {
  /**
   * O objeto Session retornado por `useSession`, `getSession` etc.
   */
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string; // ou Role;
    } & DefaultSession['user'];
  }

  /**
   * O objeto User como ele é retornado do callback `authorize`.
   */
  interface User extends DefaultUser {
    role: string; // ou Role;
  }
}

declare module 'next-auth/jwt' {
  /** Retornado pelo callback `jwt`. */
  // @typescript-eslint/no-unused-vars
  interface JWT {
    id: string;
    role: string; // ou Role;
  }
}

/**
 * A NOVA ADIÇÃO: Estendemos o AdapterUser
 * Isso alinha o tipo de usuário que o PrismaAdapter manipula
 * com o tipo de usuário que o NextAuth espera.
 */
declare module 'next-auth/adapters' {
  interface AdapterUser extends DefaultAdapterUser {
    role: string; // ou Role;
  }
}
