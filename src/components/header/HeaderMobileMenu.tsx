'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

interface HeaderMobileMenuProps {
  navLinks: Array<{ href: string; label: string }>;
}

export default function HeaderMobileMenu({
  navLinks,
}: HeaderMobileMenuProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-full text-slate-500 hover:text-teal-600 hover:bg-teal-50"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-rounded">menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85%] max-w-sm">
        <SheetHeader>
          <SheetTitle>Navegación</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4 space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">
              search
            </span>
            <Input
              placeholder="Buscar..."
              className="pl-10 bg-slate-100 border-0 rounded-full h-10 text-sm"
            />
          </div>
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <SheetClose key={link.href} asChild>
                <Link
                  href={link.href}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
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
