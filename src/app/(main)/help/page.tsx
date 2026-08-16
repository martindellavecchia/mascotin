import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import HelpCenter from '@/components/help/HelpCenter';
import { authOptions } from '@/lib/auth';

export default async function HelpPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-center text-slate-500">Cargando centro de ayuda…</div>}>
      <HelpCenter />
    </Suspense>
  );
}
