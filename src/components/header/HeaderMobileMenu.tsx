'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

interface HeaderMobileMenuProps {
  navLinks: Array<{ href: string; label: string; tab?: 'home' | 'explore' }>;
}

export default function HeaderMobileMenu({
  navLinks,
}: HeaderMobileMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const homeTab = searchParams.get('tab');

  const isActive = (href: string, tab?: 'home' | 'explore') => {
    const path = href.split('?')[0];
    if (pathname !== path) {
      if (path !== '/' && pathname.startsWith(path)) return true;
      return false;
    }
    if (path !== '/') return true;
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
          className="lg:hidden rounded-xl text-slate-500 hover:text-teal-600 hover:bg-teal-50"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-rounded">menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] max-w-sm">
        <SheetHeader>
          <SheetTitle>Navegación</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <SheetClose key={`${link.label}-${link.href}`} asChild>
                <Link
                  href={link.href}
                  className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive(link.href, link.tab)
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              </SheetClose>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
