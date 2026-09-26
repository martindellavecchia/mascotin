'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CircleAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root error boundary:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen min-h-svh flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Tuvimos un problema inesperado. Probá de nuevo en unos segundos.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Ir a la portada</Link>
        </Button>
      </div>
    </main>
  );
}
