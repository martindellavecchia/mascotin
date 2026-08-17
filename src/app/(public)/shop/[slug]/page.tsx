import Link from 'next/link';
import { Button } from '@/components/ui/button';
import StoreDetailClient from '@/components/shop/StoreDetailClient';
import { logStoreQuery } from '@/lib/server/store-cache';
import { getCachedPublicStoreBySlug } from '@/lib/server/stores';

export const revalidate = 300;

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const started = Date.now();
  const store = await getCachedPublicStoreBySlug(slug);

  logStoreQuery({
    route: '/shop/[slug]',
    duration_ms: Date.now() - started,
    result_count: store ? 1 : 0,
    cache_mode: 'ISR',
  });

  if (!store) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">No encontramos este negocio</h1>
        <Button asChild className="mt-5"><Link href="/shop">Volver a negocios</Link></Button>
      </div>
    );
  }

  return <StoreDetailClient store={store} />;
}
