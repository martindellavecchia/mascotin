'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CircleAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error boundary:', error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-1 flex-col justify-center px-4 py-6">
      <EmptyState
        headingLevel="h1"
        icon={<CircleAlert className="size-11" aria-hidden="true" />}
        title="No pudimos cargar esta sección"
        description="Tuvimos un problema inesperado. Podés reintentar o volver al inicio; tus datos no se perdieron."
        action={(
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={reset}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reintentar
            </Button>
            <Button asChild variant="outline">
              <Link href="/inicio">Ir al inicio</Link>
            </Button>
          </div>
        )}
      />
    </main>
  );
}
