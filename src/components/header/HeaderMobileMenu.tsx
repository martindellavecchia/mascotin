'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

interface HeaderMobileMenuProps {
  navLinks: Array<{ href: string; label: string; icon?: LucideIcon; tab?: 'home' | 'explore' }>;
}

export default function HeaderMobileMenu({
  navLinks,
}: HeaderMobileMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const homeTab = searchParams.get('tab');

  const isActive = (href: string, tab?: 'home' | 'explore') => {
    const path = href.split('?')[0];
    if (path === '/community/events') return pathname.startsWith('/community/events');
    if (path === '/community') return pathname === '/community';
    if (path === '/shop') return pathname.startsWith('/shop');
    if (path !== '/inicio') return pathname === path || pathname.startsWith(`${path}/`);
    if (pathname !== '/inicio') return false;
    if (tab === 'explore') return homeTab === 'explore';
    if (tab === 'home') return !homeTab || homeTab === 'home';
    return true;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-md text-muted-foreground hover:bg-primary-soft hover:text-primary lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[min(88vw,22rem)] max-w-none overflow-y-auto overscroll-contain [&>button:last-child]:hidden"
      >
        <SheetClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-11 rounded-md"
            aria-label="Cerrar menú"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </SheetClose>
        <SheetHeader className="pr-16">
          <SheetTitle>Más opciones</SheetTitle>
          <SheetDescription className="sr-only">
            Accesos secundarios a eventos, mapa, servicios, perfil y configuración.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.href, link.tab);
              const Icon = link.icon;

              return (
                <SheetClose key={`${link.label}-${link.href}`} asChild>
                  <Link
                    href={link.href}
                    className={`flex min-h-11 items-center gap-3 rounded-md border-l-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-transparent text-slate-700 hover:bg-slate-100'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {Icon && (
                      <Icon
                        className="size-5 shrink-0"
                        strokeWidth={active ? 2.4 : 2}
                        aria-hidden="true"
                      />
                    )}
                    {link.label}
                  </Link>
                </SheetClose>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
