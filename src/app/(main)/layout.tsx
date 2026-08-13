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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header session={session} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
