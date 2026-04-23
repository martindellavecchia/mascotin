'use client';

import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const NotificationBell = dynamic(
  () => import('@/components/notifications/NotificationBell'),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full text-slate-500 hover:text-teal-600 hover:bg-teal-50"
        aria-label="Notificaciones"
      >
        <span className="material-symbols-rounded">notifications</span>
      </Button>
    ),
  }
);

const HeaderMobileMenu = dynamic(
  () => import('@/components/header/HeaderMobileMenu'),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden rounded-full text-slate-500 hover:text-teal-600 hover:bg-teal-50"
        aria-label="Abrir menú"
      >
        <span className="material-symbols-rounded">menu</span>
      </Button>
    ),
  }
);

const HeaderUserMenu = dynamic(
  () => import('@/components/header/HeaderUserMenu'),
  {
    ssr: false,
    loading: () => (
      <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
        <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
      </Button>
    ),
  }
);

interface HeaderProps {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      headerImage?: string | null;
    };
  } | null;
}

export default function Header({ session }: HeaderProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/community', label: 'Comunidad' },
    { href: '/shop', label: 'Servicios' },
    { href: '/messages', label: 'Mensajes' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center">
            <span className="material-symbols-rounded text-white text-xl filled">pets</span>
          </div>
          <span className="text-xl font-bold text-slate-800">MascoTin</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(link.href)
                ? 'text-teal-600'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block flex-1 max-w-sm">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">search</span>
            <Input
              placeholder="Buscar servicios o amigos..."
              className="pl-10 bg-slate-100 border-0 rounded-full h-10 text-sm focus-visible:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <HeaderMobileMenu navLinks={navLinks} />

          <NotificationBell enabled={Boolean(session?.user?.id)} />

          <HeaderUserMenu session={session} />
        </div>
      </div>
    </header>
  );
}
