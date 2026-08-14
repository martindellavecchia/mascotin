'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const NotificationBell = dynamic(
  () => import('@/components/notifications/NotificationBell'),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50"
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
        className="lg:hidden rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50"
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
  const [homeTab, setHomeTab] = useState<'home' | 'explore' | 'matches'>('home');

  useEffect(() => {
    const syncTab = () => {
      const tab = new URLSearchParams(window.location.search).get('tab');
      setHomeTab(tab === 'explore' || tab === 'matches' ? tab : 'home');
    };

    syncTab();
    window.addEventListener('popstate', syncTab);
    window.addEventListener('mascotin:home-tab', syncTab);
    return () => {
      window.removeEventListener('popstate', syncTab);
      window.removeEventListener('mascotin:home-tab', syncTab);
    };
  }, []);

  const isActive = (path: string, tab?: 'home' | 'explore') => {
    if (pathname !== path) return false;
    if (path !== '/') return true;
    return tab === 'explore' ? homeTab === 'explore' : homeTab === 'home';
  };

  const handleHomeNavigation = (
    event: React.MouseEvent<HTMLAnchorElement>,
    tab?: 'home' | 'explore'
  ) => {
    if (pathname !== '/' || !tab) return;

    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.replaceState(window.history.state, '', `/?${params.toString()}`);
    setHomeTab(tab);
    window.dispatchEvent(new Event('mascotin:home-tab'));
  };

  const navLinks: Array<{
    href: string;
    label: string;
    icon: string;
    tab?: 'home' | 'explore';
  }> = [
    { href: '/', label: 'Inicio', icon: 'home', tab: 'home' as const },
    { href: '/?tab=explore', label: 'Descubrir', icon: 'search', tab: 'explore' as const },
    { href: '/community', label: 'Comunidad', icon: 'groups' },
    { href: '/alerts', label: 'Alertas', icon: 'emergency' },
    { href: '/adoptions', label: 'Adopciones', icon: 'volunteer_activism' },
    { href: '/map', label: 'Mapa', icon: 'map' },
    { href: '/messages', label: 'Mensajes', icon: 'chat_bubble' },
  ];

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:h-screen lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="mx-auto flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:flex-col lg:items-stretch lg:px-5 lg:py-7">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 lg:px-1">
          <div className="flex size-10 items-center justify-center rounded-xl bg-teal-600">
            <span className="material-symbols-rounded text-white text-[22px] filled">pets</span>
          </div>
          <span className="text-[22px] font-bold tracking-[-0.03em] text-slate-950">MascoTin</span>
        </Link>

        <nav className="hidden lg:flex lg:flex-1 lg:flex-col lg:gap-2 lg:pt-12">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={(event) => handleHomeNavigation(event, link.tab)}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${
                isActive(link.href.split('?')[0], link.tab)
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <span className={`material-symbols-rounded text-[21px] ${isActive(link.href.split('?')[0], link.tab) ? 'filled' : ''}`}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          ))}
          <div className="my-3 border-t border-slate-100" />
          <Link
            href="/shop"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${
              pathname === '/shop'
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <span className="material-symbols-rounded text-[21px]">storefront</span>
            Servicios
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 lg:flex-col lg:items-stretch lg:border-t lg:border-slate-100 lg:pt-5">
          <HeaderMobileMenu navLinks={navLinks} />
          <div className="lg:flex lg:items-center lg:justify-between lg:px-1">
            <NotificationBell enabled={Boolean(session?.user?.id)} />
            <HeaderUserMenu session={session} showLabel />
          </div>
        </div>
      </div>
    </header>
  );
}
