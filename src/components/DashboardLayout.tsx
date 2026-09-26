import { ReactNode } from 'react';

interface DashboardLayoutProps {
    children: ReactNode;
    rightSidebar?: ReactNode;
}

export default function DashboardLayout({
    children,
    rightSidebar
}: DashboardLayoutProps) {
    return (
        <div className={`mx-auto grid min-h-[calc(100dvh-64px)] w-full grid-cols-1 gap-7 px-4 py-6 sm:px-6 lg:min-h-screen lg:px-8 lg:py-8 ${rightSidebar ? 'max-w-[1500px] xl:grid-cols-[minmax(0,1fr)_270px] 2xl:gap-10' : 'max-w-6xl'}`}>
            <main className="min-w-0">
                {children}
            </main>

            {rightSidebar && (
                <aside className="hidden min-w-0 xl:block">
                    <div className="sticky top-8 space-y-6">{rightSidebar}</div>
                </aside>
            )}
        </div>
    );
}
