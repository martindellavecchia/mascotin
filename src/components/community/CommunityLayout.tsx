'use client';

import Link from 'next/link';
import GroupsSidebar from './GroupsSidebar';
import UpcomingEventsWidget from './UpcomingEventsWidget';
import QuickActions from '@/components/widgets/QuickActions';

interface CommunityLayoutProps {
  children: React.ReactNode;
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
  return (
    <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-4">
      <div className="space-y-4 lg:col-span-1 lg:space-y-6">
        <div className="flex flex-wrap gap-2 lg:hidden">
          <Link
            href="/community/groups"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            <span className="material-symbols-rounded text-lg">groups</span>
            Ver grupos
          </Link>
          <Link
            href="/community/events"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            <span className="material-symbols-rounded text-lg">calendar_month</span>
            Eventos
          </Link>
        </div>
        <div className="hidden lg:block">
          <GroupsSidebar />
        </div>
      </div>

      <div className="lg:col-span-2">{children}</div>

      <div className="space-y-6 lg:col-span-1">
        <div className="lg:hidden">
          <QuickActions />
        </div>
        <div className="hidden space-y-6 lg:block">
          <QuickActions />
          <UpcomingEventsWidget />
        </div>
      </div>
    </div>
  );
}
