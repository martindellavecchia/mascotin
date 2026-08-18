import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-full min-w-0 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-11 min-w-0 items-center" aria-label="Huella, ir al inicio">
          <BrandLogo priority className="h-9 sm:h-10" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" className="hidden min-h-11 sm:inline-flex">
            <Link href="/shop">Servicios</Link>
          </Button>
          <Button asChild variant="ghost" className="hidden min-h-11 md:inline-flex">
            <Link href="/map">Mapa</Link>
          </Button>
          <Button asChild className="min-h-11">
            <Link href="/inicio" prefetch={false}>Ir a la app</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
