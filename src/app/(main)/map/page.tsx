'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
  category: { name: string };
  ratingAverage: number;
  promotions: Array<{ title: string }>;
}

const TAG_LABELS: Record<string, string> = {
  terraza: 'Terraza',
  indoor: 'Interior',
  bebedero: 'Bebedero',
  menu_mascotas: 'Menú mascotas',
  '24hs': '24 hs',
};

export default function MapPage() {
  const [stores, setStores] = useState<MapStore[]>([]);
  const [selected, setSelected] = useState<MapStore | null>(null);

  useEffect(() => {
    fetch('/api/stores')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setStores(data.stores);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const withCoords = stores.filter((store) => store.latitude && store.longitude);
    if (withCoords.length === 0) return;

    let map: { remove: () => void } | null = null;
    let cancelled = false;

    async function renderMap() {
      const leaflet = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      if (cancelled) return;

      const L = leaflet.default;
      const first = withCoords[0];
      map = L.map('pet-friendly-map').setView([first.latitude as number, first.longitude as number], 12);
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
  }, [stores]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mapa pet-friendly</h1>
        <p className="text-slate-500">Veterinarias, plazas y restaurantes con etiquetas claras.</p>
      </div>
      <div id="pet-friendly-map" className="h-[480px] overflow-hidden rounded-2xl border border-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
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
            <div className="mt-3 flex flex-wrap gap-1">
              {store.tags.map((tag) => (
                <Badge key={tag} variant="outline">{TAG_LABELS[tag] || tag}</Badge>
              ))}
            </div>
            {store.promotions[0] && (
              <p className="mt-2 text-sm text-teal-700">{store.promotions[0].title}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
