'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  useEffect(() => {
    fetch('/api/store-categories')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setCategories(data.categories);
      })
      .catch(() => undefined);

    fetch('/api/stores')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setStores(data.stores);
      })
      .catch(() => undefined);
  }, []);

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
    if (filteredStores.length === 0) return;

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
          color: store.featured ? '#d97706' : '#0d9488',
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
  }, [filteredStores, withCoords]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mapa pet-friendly</h1>
        <p className="text-slate-500">Veterinarias, plazas y restaurantes con etiquetas claras.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryId('_all')}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            categoryId === '_all'
              ? 'border-teal-500 bg-teal-50 text-teal-800'
              : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
          }`}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategoryId(category.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              categoryId === category.id
                ? 'border-teal-500 bg-teal-50 text-teal-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {stores.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 border-dashed p-10 text-center">
          <span className="material-symbols-rounded text-5xl text-slate-300">map</span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Todavía no hay lugares en el mapa</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Cuando haya negocios publicados con ubicación, van a aparecer acá. Mientras tanto podés explorar la tienda o sumar tu negocio.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-teal-600 hover:bg-teal-700">
              <Link href="/shop">Ver negocios</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/provider">Publicar mi negocio</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div id="pet-friendly-map" className="h-[480px] overflow-hidden rounded-2xl border border-slate-200" />
          {withCoords.length === 0 && (
            <p className="text-sm text-slate-500">
              Ningún negocio filtrado tiene coordenadas todavía. Mostramos Buenos Aires como referencia.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStores.map((store) => (
              <Card key={store.id} className={`p-4 ${selected?.id === store.id ? 'ring-2 ring-teal-500' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/shop/${store.slug}`} className="font-semibold text-slate-900 hover:text-teal-700">
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
                  {store.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tagLabel(tag)}</Badge>
                  ))}
                </div>
                {store.promotions[0] && (
                  <p className="mt-2 text-sm text-teal-700">{store.promotions[0].title}</p>
                )}
              </Card>
            ))}
            {filteredStores.length === 0 && (
              <Card className="p-8 text-center text-slate-500 md:col-span-2 lg:col-span-3">
                No hay negocios en esta categoría.
              </Card>
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
