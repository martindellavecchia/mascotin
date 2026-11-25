'use client';

import dynamic from 'next/dynamic';

const SonnerToaster = dynamic(() =>
  import('@/components/ui/sonner').then((module) => module.Toaster),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SonnerToaster />
    </>
  );
}
