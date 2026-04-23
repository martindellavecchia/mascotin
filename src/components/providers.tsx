'use client';

import { SessionProvider } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';

const SonnerToaster = dynamic(() =>
  import('@/components/ui/sonner').then((module) => module.Toaster),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true} disableTransitionOnChange={false}>
        {children}
        <SonnerToaster />
      </ThemeProvider>
    </SessionProvider>
  );
}
