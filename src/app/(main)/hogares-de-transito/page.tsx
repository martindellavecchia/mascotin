import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import HelpCenter from '@/components/help/HelpCenter';
import { getCachedSession } from '@/lib/session';

export default async function FosterHomesPage() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect('/login');

  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-center text-slate-500">Cargando hogares de tránsito…</div>}>
      <HelpCenter />
    </Suspense>
  );
}
