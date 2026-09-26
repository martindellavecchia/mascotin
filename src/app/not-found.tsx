import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Página no encontrada',
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen min-h-svh flex-col items-center justify-center bg-background px-4 py-16 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10">
        <PawPrint className="size-8 text-primary" aria-hidden="true" />
      </div>
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">Error 404</p>
      <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">No encontramos esta página</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Puede que el enlace esté roto, que el contenido se haya eliminado o que ya no tengas acceso.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/inicio">Ir al inicio</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/community">Ver la comunidad</Link>
        </Button>
      </div>
    </main>
  );
}
