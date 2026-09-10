'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, LogIn, Menu, Store, UserRoundPlus } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PUBLIC_NAV_LINKS = [
  { href: '/', label: 'Inicio', icon: House },
  { href: '/shop', label: 'Servicios', icon: Store },
  { href: '/login', label: 'Ingresar', icon: LogIn },
  { href: '/register', label: 'Crear cuenta', icon: UserRoundPlus },
];

const PublicMobileMenu = dynamic(() => import('@/components/header/HeaderMobileMenu'), {
  ssr: false,
  loading: () => (
    <Button variant="ghost" size="icon" className="size-11 sm:hidden" aria-label="Cargando menú" disabled>
      <Menu className="size-5" aria-hidden="true" />
    </Button>
  ),
});

export default function PublicHeader() {
  const pathname = usePathname();
  const isServicesActive = pathname === '/shop' || pathname.startsWith('/shop/');

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-full min-w-0 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-h-11 min-w-0 items-center" aria-label="Huella, ir al inicio">
          <BrandLogo priority className="h-9 sm:h-10" />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Navegación pública">
          <Button
            asChild
            variant="ghost"
            className={cn('hidden min-h-11 sm:inline-flex', isServicesActive && 'bg-primary-soft text-primary')}
          >
            <Link href="/shop" aria-current={isServicesActive ? 'page' : undefined}>Servicios</Link>
          </Button>
          <Button asChild variant="ghost" className="hidden min-h-11 sm:inline-flex">
            <Link href="/login" prefetch={false}>Ingresar</Link>
          </Button>
          <Button asChild className="min-h-11 shrink-0">
            <Link href="/register" prefetch={false}>Crear cuenta</Link>
          </Button>
          <PublicMobileMenu
            navLinks={PUBLIC_NAV_LINKS}
            title="Explorar Huella"
            description="Inicio, servicios y acceso a tu cuenta."
            triggerClassName="sm:hidden"
          />
        </nav>
      </div>
    </header>
  );
}
