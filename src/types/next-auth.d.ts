import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { AdapterUser as DefaultAdapterUser } from 'next-auth/adapters';

// @typescript-eslint/no-unused-vars
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string; // ou Role;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: string; // ou Role;
  }
}

declare module 'next-auth/jwt' {
  // @typescript-eslint/no-unused-vars
  interface JWT {
    id: string;
    role: string; // ou Role;
  }
}

declare module 'next-auth/adapters' {
  interface AdapterUser extends DefaultAdapterUser {
    role: string; // ou Role;
  }
}
