'use client';

import Link from 'next/link';
import { CalendarDays, Users } from 'lucide-react';
import GroupsSidebar from './GroupsSidebar';
import UpcomingEventsWidget from './UpcomingEventsWidget';
import QuickActions from '@/components/widgets/QuickActions';

interface CommunityLayoutProps {
  children: React.ReactNode;
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  return (
    <div className="container mx-auto grid min-w-0 grid-cols-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 xl:grid-cols-[minmax(200px,240px)_minmax(0,1fr)_minmax(220px,260px)] xl:items-start xl:gap-6 2xl:grid-cols-[240px_minmax(0,1fr)_280px] 2xl:gap-8">
      <div className="min-w-0 space-y-4 xl:space-y-6">
        <nav aria-label="Secciones de comunidad" className="flex flex-wrap gap-2 xl:hidden">
          <Link
            href="/community/groups"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 sm:flex-none"
          >
            <Users className="size-5" aria-hidden="true" />
            Ver grupos
          </Link>
          <Link
            href="/community/events"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 sm:flex-none"
          >
            <CalendarDays className="size-5" aria-hidden="true" />
            Eventos
          </Link>
        </nav>
        <div className="hidden xl:block">
          <GroupsSidebar />
        </div>
      </div>

      <div className="min-w-0">{children}</div>

      <aside className="min-w-0 space-y-6">
        <div className="xl:hidden">
          <QuickActions />
        </div>
        <div className="hidden space-y-6 xl:block">
          <QuickActions />
          <UpcomingEventsWidget />
        </div>
      </aside>
    </div>
  );
}
