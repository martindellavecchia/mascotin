import { notFound } from 'next/navigation';
import StoreDetailView from '@/components/shop/StoreDetailView';
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

  if (!store) notFound();

  return <StoreDetailView store={store} />;
}
