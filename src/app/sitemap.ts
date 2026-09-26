import type { MetadataRoute } from 'next';
import { getCachedPublicStoreDirectory } from '@/lib/server/stores';
import { SITE_URL as siteUrl } from '@/lib/site-url';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: 'daily', priority: 0.8 },
  ];

  try {
    const stores = await getCachedPublicStoreDirectory();
    return [
      ...staticEntries,
      ...stores.map((store) => ({
        url: `${siteUrl}/shop/${store.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ];
  } catch (error) {
    console.error('Error building sitemap:', error);
    return staticEntries;
  }
}
