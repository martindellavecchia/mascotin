import { getServerSession } from 'next-auth';
import Header from '@/components/Header';
import { authOptions } from '@/lib/auth';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen min-h-svh flex-col bg-slate-50">
      <Header session={session} />
      <div className="min-w-0 flex-1 lg:pl-[260px]">{children}</div>
    </div>
  );
}
