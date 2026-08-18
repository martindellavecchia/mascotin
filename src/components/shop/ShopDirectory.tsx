'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Star, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PublicStoreCard } from '@/lib/server/stores';

interface Category {
  id: string;
  name: string;
}

const trustClasses: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function ShopDirectory({
  initialCategories,
  initialStores,
}: {
  initialCategories: Category[];
  initialStores: PublicStoreCard[];
}) {
  const [stores, setStores] = useState(initialStores);
  const [categories] = useState(initialCategories);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('_all');
  const [minRating, setMinRating] = useState('_all');
  const [sortBy, setSortBy] = useState('recommended');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipInitialFetch = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const isDefault =
      !debouncedSearch
      && categoryId === '_all'
      && minRating === '_all'
      && sortBy === 'recommended';

    if (skipInitialFetch.current && isDefault) {
      skipInitialFetch.current = false;
      return;
    }
    skipInitialFetch.current = false;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ sortBy });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoryId !== '_all') params.set('categoryId', categoryId);
    if (minRating !== '_all') params.set('minRating', minRating);

    fetch(`/api/stores?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'No se pudieron cargar los negocios');
        setStores(data.stores);
      })
      .catch((fetchError) => {
        if ((fetchError as Error).name === 'AbortError') return;
        setError('No se pudieron cargar los negocios. Intentá de nuevo.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedSearch, categoryId, minRating, refreshKey, sortBy]);

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <PageHeader
            eyebrow="Directorio público"
            title="Servicios para tu mascota"
            description="Buscá por categoría, zona y experiencias verificadas de la comunidad."
            action={<Button asChild variant="outline"><Link href="/map" prefetch={false}>Ver en el mapa</Link></Button>}
          />

          <div className="mt-7 rounded-lg border border-border bg-background p-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar negocio, servicio o zona" className="h-12 pl-11" />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger aria-label="Filtrar por categoría"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas las categorías</SelectItem>
                  {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger aria-label="Filtrar por calificación"><SelectValue placeholder="Calificación" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Cualquier calificación</SelectItem>
                  <SelectItem value="4.5">4,5 o más</SelectItem>
                  <SelectItem value="4">4,0 o más</SelectItem>
                  <SelectItem value="3">3,0 o más</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger aria-label="Ordenar negocios"><SelectValue placeholder="Orden" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recomendados</SelectItem>
                  <SelectItem value="rating">Mejor calificados</SelectItem>
                  <SelectItem value="reviews">Más reseñados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{stores.length} {stores.length === 1 ? 'negocio' : 'negocios'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">La calificación y la cantidad de reseñas determinan el orden.</p>
          </div>
          <Button asChild variant="tonal">
            <Link href="/provider" prefetch={false}>Administrar un negocio</Link>
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-surface px-6 py-10 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => setRefreshKey((current) => current + 1)}>Intentar de nuevo</Button>
          </div>
        ) : loading ? (
          <div className="divide-y divide-border border-y border-border bg-surface" aria-label="Cargando negocios">
            {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse bg-slate-100" />)}
          </div>
        ) : stores.length === 0 ? (
          <EmptyState
            icon={<Store className="size-11" aria-hidden="true" />}
            title="No encontramos negocios con esos filtros"
            description="Ajustá la búsqueda o administrá tu negocio desde el panel de proveedor."
            action={<Button asChild><Link href="/provider" prefetch={false}>Ir al panel</Link></Button>}
          />
        ) : (
          <div className="divide-y divide-border border-y border-border bg-surface">
            {stores.map((store) => (
              <Link key={store.id} href={`/shop/${store.slug}`} className="group grid gap-4 px-0 py-5 transition-colors hover:bg-primary-soft/45 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:px-4">
                <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-lg bg-primary-soft sm:w-28">
                  {store.image ? <img src={store.image} alt={store.name} className="h-full w-full object-cover" /> : <Store className="size-10 text-primary/35" aria-hidden="true" />}
                </div>
                <div className="min-w-0 px-4 sm:px-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 truncate text-lg font-bold text-foreground group-hover:text-primary">{store.name}</h3>
                    <Badge variant="neutral">{store.category.name}</Badge>
                    <Badge variant="outline" className={trustClasses[store.trust.tone] || trustClasses.slate}>{store.trust.label}</Badge>
                  </div>
                  {store.address && <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="line-clamp-1">{store.address}</span></p>}
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{store.description || 'Sin descripción disponible.'}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{store.services[0] ? `${store.services[0].name} · $${store.services[0].price.toLocaleString('es-AR')}` : 'Próximamente publicará sus servicios'}</p>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 sm:flex-col sm:items-end sm:justify-start sm:px-0 sm:pt-1">
                  <p className="flex items-center gap-1 font-bold text-foreground"><Star className="size-4 text-warning" aria-hidden="true" fill="currentColor" />{store.reviewCount ? store.ratingAverage.toFixed(1) : 'Nuevo'}</p>
                  <p className="text-xs text-muted-foreground">{store.reviewCount} reseñas</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
