'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPinned } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { STORE_PLACE_TAG_LABELS, type StorePlaceTag } from '@/lib/places';
import 'leaflet/dist/leaflet.css';

interface MapStore {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  featured: boolean;
  category: { id: string; name: string };
  ratingAverage: number;
  promotions: Array<{ title: string }>;
}

interface StoreCategory {
  id: string;
  name: string;
}

const BA_CENTER: [number, number] = [-34.6037, -58.3816];

function tagLabel(tag: string): string {
  return STORE_PLACE_TAG_LABELS[tag as StorePlaceTag] || tag;
}

export default function MapPage() {
  const [stores, setStores] = useState<MapStore[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>('_all');
  const [selected, setSelected] = useState<MapStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadMapData() {
      setLoading(true);
      setLoadError(false);
      try {
        const [categoriesResponse, storesResponse] = await Promise.all([
          fetch('/api/store-categories'),
          fetch('/api/stores/map'),
        ]);
        const [categoriesData, storesData] = await Promise.all([
          categoriesResponse.json(),
          storesResponse.json(),
        ]);
        if (!categoriesResponse.ok || !categoriesData.success || !storesResponse.ok || !storesData.success) {
          throw new Error('No se pudo cargar el mapa');
        }
        if (!cancelled) {
          setCategories(categoriesData.categories);
          setStores(storesData.stores);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMapData();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filteredStores = useMemo(() => {
    if (categoryId === '_all') return stores;
    return stores.filter((store) => store.category.id === categoryId);
  }, [stores, categoryId]);

  const withCoords = useMemo(
    () => filteredStores.filter((store) => store.latitude != null && store.longitude != null),
    [filteredStores]
  );

  const withoutCoords = useMemo(
    () => filteredStores.filter((store) => store.latitude == null || store.longitude == null),
    [filteredStores]
  );

  useEffect(() => {
    if (stores.length === 0) return;

    let map: { remove: () => void } | null = null;
    let cancelled = false;

    async function renderMap() {
      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      if (cancelled) return;

      const L = leaflet.default;
      const first = withCoords[0];
      const center: [number, number] = first
        ? [first.latitude as number, first.longitude as number]
        : BA_CENTER;

      map = L.map('pet-friendly-map').setView(center, withCoords.length > 0 ? 12 : 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map as never);

      withCoords.forEach((store) => {
        const marker = L.circleMarker([store.latitude as number, store.longitude as number], {
          radius: store.featured ? 10 : 7,
          color: store.featured ? '#d46a4c' : '#4b244a',
          fillOpacity: 0.85,
        }).addTo(map as never);
        marker.bindPopup(
          `<strong>${store.name}</strong><br/>${store.category.name}${store.featured ? '<br/>Destacado' : ''}`
        );
        marker.on('click', () => setSelected(store));
      });
    }

    void renderMap();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [stores.length, withCoords]);

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-4 px-4 py-5 sm:py-8">
      <PageHeader title="Mapa pet-friendly" description="Veterinarias, plazas y restaurantes con información de la comunidad." />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          onClick={() => setCategoryId('_all')}
          className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
            categoryId === '_all'
              ? 'border-teal-500 bg-teal-50 text-teal-800'
              : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
          }`}
          aria-pressed={categoryId === '_all'}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategoryId(category.id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
              categoryId === category.id
                ? 'border-teal-500 bg-teal-50 text-teal-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
            }`}
            aria-pressed={categoryId === category.id}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loadError ? (
        <EmptyState
          icon={<MapPinned className="size-11" aria-hidden="true" />}
          title="No pudimos cargar el mapa"
          description="Revisá tu conexión e intentá nuevamente."
          action={<Button variant="outline" onClick={() => setRefreshKey((current) => current + 1)}>Intentar de nuevo</Button>}
        />
      ) : loading ? (
        <div className="h-[clamp(20rem,60svh,30rem)] animate-pulse rounded-xl border border-border bg-slate-100" aria-label="Cargando mapa" />
      ) : stores.length === 0 ? (
        <EmptyState
          icon={<MapPinned className="size-11" aria-hidden="true" />}
          title="Todavía no hay lugares en el mapa"
          description="Cuando haya negocios publicados con ubicación, van a aparecer acá."
          action={<Button asChild><Link href="/shop">Ver negocios</Link></Button>}
        />
      ) : (
        <>
          <div
            id="pet-friendly-map"
            role="region"
            aria-label="Mapa de lugares pet-friendly"
            className="h-[clamp(20rem,60svh,30rem)] overflow-hidden rounded-xl border border-border sm:h-[clamp(24rem,65svh,36rem)] lg:h-[clamp(28rem,70svh,42rem)]"
          />
          {withCoords.length === 0 && (
            <p className="text-sm text-slate-500">
              Ningún negocio filtrado tiene coordenadas todavía. Mostramos Buenos Aires como referencia.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStores.map((store) => (
              <Card key={store.id} className={`min-w-0 p-4 ${selected?.id === store.id ? 'ring-2 ring-teal-500' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/shop/${store.slug}`} className="inline-flex min-h-11 items-center break-words font-semibold text-slate-900 hover:text-teal-700">
                      {store.name}
                    </Link>
                    <p className="text-sm text-slate-500">{store.category.name}</p>
                  </div>
                  {store.featured && <Badge className="bg-amber-100 text-amber-800">Destacado</Badge>}
                </div>
                <p className="mt-2 text-sm text-slate-600">{store.address || 'Sin dirección'}</p>
                {(store.latitude == null || store.longitude == null) && (
                  <p className="mt-1 text-xs font-medium text-amber-700">Sin ubicación en el mapa</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  {store.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline">{tagLabel(tag)}</Badge>
                  ))}
                  {store.tags.length > 3 && <Badge variant="neutral">+{store.tags.length - 3}</Badge>}
                </div>
                {store.promotions[0] && (
                  <p className="mt-2 text-sm text-teal-700">{store.promotions[0].title}</p>
                )}
              </Card>
            ))}
            {filteredStores.length === 0 && (
              <EmptyState compact className="md:col-span-2 lg:col-span-3" title="No hay negocios en esta categoría" />
            )}
          </div>
          {withoutCoords.length > 0 && withCoords.length > 0 && (
            <p className="text-xs text-slate-400">
              {withoutCoords.length} negocio{withoutCoords.length === 1 ? '' : 's'} sin ubicación en el mapa.
            </p>
          )}
        </>
      )}
    </div>
  );
}
