import Header from '@/components/Header';
import PrivateSessionProvider from '@/components/PrivateSessionProvider';
import { getCachedSession } from '@/lib/session';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  return (
    <PrivateSessionProvider session={session}>
      <div className="flex min-h-screen min-h-svh flex-col bg-background">
        <Header session={session} />
        <div className="min-w-0 flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pl-[252px] lg:pb-0">{children}</div>
      </div>
    </PrivateSessionProvider>
  );
}
