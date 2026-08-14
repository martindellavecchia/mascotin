import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      image?: string | null;
      role?: string;
      headerImage?: string | null;
      isBusinessOwner?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string;
    headerImage?: string | null;
    isBusinessOwner?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    headerImage?: string | null;
    isBusinessOwner?: boolean;
  }
}
