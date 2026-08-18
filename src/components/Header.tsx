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
  Search,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';

type HomeTab = 'home' | 'explore';

interface NavigationLink {
  href: string;
  label: string;
  icon: LucideIcon;
  tab?: HomeTab;
}

const PRIMARY_NAV_LINKS: NavigationLink[] = [
  { href: '/inicio', label: 'Inicio', icon: Home, tab: 'home' },
  { href: '/inicio?tab=explore', label: 'Descubrir', icon: Search, tab: 'explore' },
  { href: '/community', label: 'Comunidad', icon: Users },
  { href: '/hogares-de-transito', label: 'Hogares', icon: HeartHandshake },
  { href: '/messages', label: 'Mensajes', icon: MessageCircle },
];

const SECONDARY_NAV_LINKS: NavigationLink[] = [
  { href: '/community/events', label: 'Eventos', icon: CalendarDays },
  { href: '/map', label: 'Mapa', icon: Map },
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
        className="relative size-11 rounded-md text-muted-foreground hover:bg-primary-soft hover:text-primary"
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
        className="size-11 rounded-md text-muted-foreground hover:bg-primary-soft hover:text-primary lg:hidden"
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
      const nextTab = tab === 'explore' || tab === 'matches' ? tab : 'home';
      setHomeTab((current) => (current === nextTab ? current : nextTab));
    };

    syncTab();
    window.addEventListener('popstate', syncTab);
    window.addEventListener('huella:home-tab', syncTab);
    return () => {
      window.removeEventListener('popstate', syncTab);
      window.removeEventListener('huella:home-tab', syncTab);
    };
  }, []);

  const isActive = (path: string, tab?: 'home' | 'explore') => {
    if (pathname !== path) return false;
    if (path !== '/inicio') return true;
    return tab === 'explore' ? homeTab === 'explore' : homeTab === 'home';
  };

  const handleHomeNavigation = (
    event: MouseEvent<HTMLAnchorElement>,
    tab?: HomeTab
  ) => {
    if (pathname !== '/inicio' || !tab) return;

    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.replaceState(window.history.state, '', `/inicio?${params.toString()}`);
    setHomeTab(tab);
    window.dispatchEvent(new Event('huella:home-tab'));
  };

  const isNavActive = (href: string, tab?: HomeTab) => {
    const path = href.split('?')[0];
    if (path === '/inicio') return isActive('/inicio', tab);
    if (path === '/shop') return pathname.startsWith('/shop');
    if (path === '/community/events') return pathname.startsWith('/community/events');
    if (path === '/community') return pathname === '/community';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const renderDesktopLinks = (links: NavigationLink[]) => links.map((link) => {
    const active = isNavActive(link.href, link.tab);
    const Icon = link.icon;

    return (
      <Link
        key={link.label}
        href={link.href}
        onClick={(event) => handleHomeNavigation(event, link.tab)}
        className={`group flex min-h-11 items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-[15px] font-medium transition-colors ${
          active
            ? 'border-primary bg-primary-soft text-primary'
            : 'border-transparent text-muted-foreground hover:bg-slate-100 hover:text-foreground'
        }`}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className="size-5 shrink-0" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
        {link.label}
      </Link>
    );
  });

  return (
    <>
      <header className="sticky top-0 z-50 h-16 w-full border-b border-border bg-surface/95 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:h-svh lg:w-[252px] lg:border-b-0 lg:border-r lg:bg-surface">
        <div className="mx-auto flex h-full min-w-0 items-center justify-between gap-2 px-3 sm:px-5 lg:flex-col lg:items-stretch lg:px-5 lg:py-6">
          <Link href="/inicio" className="flex min-h-11 min-w-0 items-center" aria-label="Huella, ir al inicio">
            <BrandLogo priority className="h-9 sm:h-10 lg:h-[52px]" />
          </Link>

          <nav className="hidden min-h-0 lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto lg:pt-8" aria-label="Navegación principal">
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Principal</p>
            <div className="space-y-1">{renderDesktopLinks(PRIMARY_NAV_LINKS)}</div>
            <div className="my-5 border-t border-border" />
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Más de Huella</p>
            <div className="space-y-1">{renderDesktopLinks(SECONDARY_NAV_LINKS)}</div>
          </nav>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 lg:flex-col lg:items-stretch lg:border-t lg:border-border lg:pt-4">
            <HeaderMobileMenu navLinks={SECONDARY_NAV_LINKS} />
            <div className="flex items-center gap-0.5 sm:gap-1 lg:justify-between">
              <div className="flex shrink-0 [&>button]:size-11">
                <NotificationBell enabled={Boolean(session?.user?.id)} />
              </div>
              <HeaderUserMenu session={session} showLabel />
            </div>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navegación principal móvil"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-surface/98 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgb(39_30_39/0.06)] backdrop-blur lg:hidden"
      >
        {PRIMARY_NAV_LINKS.map((link) => {
          const active = isNavActive(link.href, link.tab);
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              onClick={(event) => handleHomeNavigation(event, link.tab)}
              className={`flex min-h-[4.25rem] min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[10px] font-semibold transition-colors min-[360px]:px-1 min-[360px]:text-[11px] ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`flex h-7 min-w-10 items-center justify-center rounded-full px-2 ${active ? 'bg-primary-soft' : ''}`}>
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              </span>
              <span className="max-w-full truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
