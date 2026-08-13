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
        <div className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-[1500px] grid-cols-1 gap-7 px-4 py-6 sm:px-6 lg:min-h-screen lg:px-8 lg:py-8 xl:grid-cols-[minmax(0,1fr)_270px] 2xl:gap-10 2xl:px-10">
            {leftSidebar && <div className="sr-only">{leftSidebar}</div>}
            <main className="min-w-0">
                {children}
            </main>

            <aside className="hidden min-w-0 xl:block">
                <div className="sticky top-8 space-y-6">
                    {rightSidebar}
                </div>
            </aside>
        </div>
    );
}
