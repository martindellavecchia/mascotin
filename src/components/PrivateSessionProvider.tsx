'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

export default function PrivateSessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </SessionProvider>
  );
}
