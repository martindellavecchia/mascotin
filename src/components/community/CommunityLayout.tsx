'use client';

import GroupsSidebar from './GroupsSidebar';
import UpcomingEventsWidget from './UpcomingEventsWidget';
import QuickActions from '@/components/widgets/QuickActions';

interface CommunityLayoutProps {
    children: React.ReactNode;
}

export default function CommunityLayout({ children }: CommunityLayoutProps) {
    return (
        <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar: Navigation & Groups */}
            <div className="lg:col-span-1 hidden lg:block space-y-6">
                <GroupsSidebar />
            </div>

            {/* Main Content: Feed */}
            <div className="lg:col-span-2">
                {children}
            </div>

            {/* Right Sidebar: Quick Actions & Upcoming Events */}
            <div className="lg:col-span-1 hidden lg:block space-y-6">
                <QuickActions />
                <UpcomingEventsWidget />
            </div>
        </div>
    );
}

