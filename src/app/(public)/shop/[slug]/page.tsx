import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StoreDetailView from '@/components/shop/StoreDetailView';
import { logStoreQuery } from '@/lib/server/store-cache';
import { getCachedPublicStoreBySlug } from '@/lib/server/stores';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getCachedPublicStoreBySlug(slug);
  if (!store) return { title: 'Negocio no encontrado' };

  const description = store.description?.slice(0, 160)
    || `${store.category.name}${store.address ? ` en ${store.address}` : ''}. Conocé sus servicios y reseñas en Huella.`;
  const image = store.image || store.images[0];

  return {
    title: store.name,
    description,
    openGraph: {
      title: store.name,
      description,
      ...(image ? { images: [{ url: image, alt: store.name }] } : {}),
    },
  };
}

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
