import ShopDirectory from '@/components/shop/ShopDirectory';
import { logStoreQuery } from '@/lib/server/store-cache';
import { getCachedActiveStoreCategories, getCachedPublicStoreDirectory } from '@/lib/server/stores';

export default async function ShopDirectoryPage({ signedIn }: { signedIn: boolean }) {
  const started = Date.now();
  const [categories, stores] = await Promise.all([
    getCachedActiveStoreCategories(),
    getCachedPublicStoreDirectory(),
  ]);

  logStoreQuery({
    route: '/shop',
    duration_ms: Date.now() - started,
    result_count: stores.length,
    cache_mode: 'ISR',
    filters: { search: false, category: false, minRating: null, sortBy: 'recommended' },
  });

  return <ShopDirectory initialCategories={categories} initialStores={stores} signedIn={signedIn} />;
}
