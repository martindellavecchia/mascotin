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
      <div className="flex min-h-screen min-h-svh flex-col bg-slate-50">
        <Header session={session} />
        <div className="min-w-0 flex-1 lg:pl-[260px]">{children}</div>
      </div>
    </PrivateSessionProvider>
  );
}
