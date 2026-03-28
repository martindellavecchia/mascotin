import { ReactNode } from 'react';

interface DashboardLayoutProps {
    children: ReactNode;
    leftSidebar?: ReactNode;
    rightSidebar?: ReactNode;
}

export default function DashboardLayout({
    children,
    leftSidebar,
    rightSidebar
}: DashboardLayoutProps) {
    return (
        <div className="container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-80px)]">
            {/* Left Sidebar - Pet Profile & Navigation */}
            <aside className="w-full lg:w-[280px] hidden lg:block shrink-0 space-y-6">
                <div className="sticky top-24 space-y-6">
                    {leftSidebar}
                </div>
            </aside>

            {/* Main Content - Feed */}
            <main className="flex-1 min-w-0">
                {children}
            </main>

            {/* Right Sidebar - Widgets & Actions */}
            <aside className="w-full xl:w-[320px] hidden xl:block shrink-0 space-y-6">
                <div className="sticky top-24 space-y-6">
                    {rightSidebar}
                </div>
            </aside>
        </div>
    );
}
