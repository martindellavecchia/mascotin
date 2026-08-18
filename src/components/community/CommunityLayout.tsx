'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CommunityLayoutProps {
  children: React.ReactNode;
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  const pathname = usePathname();
  const links = [
    { href: '/community', label: 'Actividad' },
    { href: '/community/groups', label: 'Grupos' },
    { href: '/community/events', label: 'Eventos' },
  ];

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <nav aria-label="Secciones de comunidad" className="mb-7 overflow-x-auto border-b border-border">
        <div className="flex min-w-max gap-6">
          {links.map((link) => {
            const active = link.href === '/community'
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                  active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}
