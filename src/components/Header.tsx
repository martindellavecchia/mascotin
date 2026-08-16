'use client';

import { type MouseEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CalendarDays,
  HeartHandshake,
  Home,
  Map,
  Menu,
  MessageCircle,
  PawPrint,
  Search,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type HomeTab = 'home' | 'explore';

interface NavigationLink {
  href: string;
  label: string;
  icon: LucideIcon;
  tab?: HomeTab;
}

const NAV_LINKS: NavigationLink[] = [
  { href: '/', label: 'Inicio', icon: Home, tab: 'home' },
  { href: '/?tab=explore', label: 'Descubrir', icon: Search, tab: 'explore' },
  { href: '/community', label: 'Comunidad', icon: Users },
  { href: '/community/events', label: 'Eventos', icon: CalendarDays },
  { href: '/help', label: 'Hogares de tránsito', icon: HeartHandshake },
  { href: '/map', label: 'Mapa', icon: Map },
  { href: '/messages', label: 'Mensajes', icon: MessageCircle },
];

const MOBILE_NAV_LINKS: NavigationLink[] = [
  ...NAV_LINKS,
  { href: '/shop', label: 'Servicios', icon: Store },
];

const NotificationBell = dynamic(
  () => import('@/components/notifications/NotificationBell'),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="ghost"
        size="icon"
        className="relative size-11 rounded-xl text-slate-500 hover:bg-teal-50 hover:text-teal-600"
        aria-label="Notificaciones"
      >
        <Bell className="size-5" aria-hidden="true" />
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
        className="size-11 rounded-xl text-slate-500 hover:bg-teal-50 hover:text-teal-600 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
    ),
  }
);

const HeaderUserMenu = dynamic(
  () => import('@/components/header/HeaderUserMenu'),
  {
    ssr: false,
    loading: () => (
      <Button
        variant="ghost"
        className="size-11 rounded-full p-0"
        aria-label="Cargando menú de usuario"
        disabled
      >
        <div className="size-9 animate-pulse rounded-full bg-slate-200" />
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
    event: MouseEvent<HTMLAnchorElement>,
    tab?: HomeTab
  ) => {
    if (pathname !== '/' || !tab) return;

    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.replaceState(window.history.state, '', `/?${params.toString()}`);
    setHomeTab(tab);
    window.dispatchEvent(new Event('mascotin:home-tab'));
  };

  const isNavActive = (href: string, tab?: HomeTab) => {
    const path = href.split('?')[0];
    if (path === '/') return isActive('/', tab);
    if (path === '/shop') return pathname.startsWith('/shop');
    if (path === '/community/events') return pathname.startsWith('/community/events');
    if (path === '/community') return pathname === '/community';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:h-svh lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="mx-auto flex h-full min-w-0 items-center justify-between gap-1.5 px-3 sm:gap-3 sm:px-6 lg:flex-col lg:items-stretch lg:px-5 lg:py-7">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 shrink items-center gap-2 lg:px-1"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 sm:size-10">
            <PawPrint className="size-5 text-white" aria-hidden="true" />
          </div>
          <span className="truncate text-[19px] font-bold tracking-[-0.03em] text-slate-950 sm:text-[22px]">
            MascoTin
          </span>
        </Link>

        <nav className="hidden min-h-0 lg:flex lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-y-auto lg:pt-10">
          {NAV_LINKS.map((link) => {
            const active = isNavActive(link.href, link.tab);
            const Icon = link.icon;

            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={(event) => handleHomeNavigation(event, link.tab)}
                className={`group flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-colors ${
                  active
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
          <div className="my-3 border-t border-slate-100" />
          <Link
            href="/shop"
            className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-colors ${
              pathname.startsWith('/shop')
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            }`}
            aria-current={pathname.startsWith('/shop') ? 'page' : undefined}
          >
            <Store className="size-5 shrink-0" aria-hidden="true" />
            Servicios
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 lg:flex-col lg:items-stretch lg:border-t lg:border-slate-100 lg:pt-5">
          <HeaderMobileMenu navLinks={MOBILE_NAV_LINKS} />
          <div className="flex items-center gap-0.5 sm:gap-1 lg:justify-between lg:px-1">
            <div className="flex shrink-0 [&>button]:size-11">
              <NotificationBell enabled={Boolean(session?.user?.id)} />
            </div>
            <HeaderUserMenu session={session} showLabel />
          </div>
        </div>
      </div>
    </header>
  );
}
