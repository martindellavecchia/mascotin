'use client';

import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';

const SonnerToaster = dynamic(() =>
  import('@/components/ui/sonner').then((module) => module.Toaster),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
      <SonnerToaster />
    </ThemeProvider>
  );
}
