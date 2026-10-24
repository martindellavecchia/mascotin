'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Search, Star, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { StateFeedback } from '@/components/ui/state-feedback';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PublicStoreCard } from '@/lib/server/stores';
import SaveSearchButton from '@/components/searches/SaveSearchButton';
import { countLabel } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
}

const trustVariants: Record<string, 'success' | 'default' | 'warning' | 'destructive' | 'neutral'> = {
  emerald: 'success',
  teal: 'default',
  amber: 'warning',
  rose: 'destructive',
  slate: 'neutral',
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
  const [zone, setZone] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('_all');
  const [minRating, setMinRating] = useState('_all');
  const [sortBy, setSortBy] = useState('recommended');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipInitialFetch = useRef(true);
  const [urlReady, setUrlReady] = useState(false);
  const hasFilters = Boolean(search.trim() || zone.trim() || categoryId !== '_all' || minRating !== '_all');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get('search') || '';
    setSearch(initialSearch);
    setDebouncedSearch(initialSearch.trim());
    setCategoryId(params.get('categoryId') || '_all');
    setMinRating(params.get('minRating') || '_all');
    setZone(params.get('zone') || '');
    setSortBy(params.get('sortBy') || 'recommended');
    setUrlReady(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams(window.location.search);
    const entries: Record<string, string> = {
      search: debouncedSearch,
      zone: zone.trim(),
      categoryId: categoryId === '_all' ? '' : categoryId,
      minRating: minRating === '_all' ? '' : minRating,
      sortBy: sortBy === 'recommended' ? '' : sortBy,
    };
    for (const [key, value] of Object.entries(entries)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [urlReady, debouncedSearch, zone, categoryId, minRating, sortBy]);

  useEffect(() => {
    const isDefault =
      !debouncedSearch
      && !zone
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
    if (zone.trim()) params.set('zone', zone.trim());
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
  }, [debouncedSearch, categoryId, minRating, refreshKey, sortBy, zone]);

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <PageHeader
            title="Servicios para tu mascota"
            description="Buscá por categoría, zona y experiencias verificadas de la comunidad."
            action={
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="ghost" className="text-primary"><Link href="/appointments">Mis turnos</Link></Button>
                <Button asChild variant="outline"><Link href="/map" prefetch={false}>Ver en el mapa</Link></Button>
              </div>
            }
          />

          <div className="mt-6 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input aria-label="Buscar negocio, servicio o zona" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar negocio, servicio o zona" className="pl-9" />
              </div>
              <Input aria-label="Zona elegida" value={zone} onChange={e => setZone(e.target.value)} placeholder="Zona: barrio o ciudad (opcional)" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
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
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{stores.length} {stores.length === 1 ? 'negocio' : 'negocios'}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Ordenados por calificación y cantidad de reseñas.</p>
          </div>
          <SaveSearchButton kind="SERVICES" filters={{ search, zone: zone.trim(), categoryId: categoryId === '_all' ? '' : categoryId, minRating: minRating === '_all' ? 0 : Number(minRating) }} />
        </div>

        {error ? (
          <StateFeedback
            status="error"
            title={error}
            action={<Button variant="outline" onClick={() => setRefreshKey((current) => current + 1)}>Intentar de nuevo</Button>}
          />
        ) : loading ? (
          <div className="divide-y divide-border border-y border-border bg-surface" aria-label="Cargando negocios">
            {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse bg-muted/60 motion-reduce:animate-none" />)}
          </div>
        ) : stores.length === 0 ? (
          <EmptyState
            icon={<Store className="size-11" aria-hidden="true" />}
            title={hasFilters ? 'No encontramos negocios con esos filtros' : 'Todavía no hay negocios publicados'}
            description={hasFilters ? 'Probá quitar los filtros para ver otras opciones.' : 'Mientras se suman servicios, podés conocer la comunidad.'}
            action={hasFilters ? <Button onClick={() => { setSearch(''); setZone(''); setCategoryId('_all'); setMinRating('_all'); }}>Limpiar filtros</Button> : <Button asChild><Link href="/community" prefetch={false}>Explorar la comunidad</Link></Button>}
          />
        ) : (
          <div className="divide-y divide-border border-y border-border bg-surface">
            {stores.map((store) => (
              <Link key={store.id} href={`/shop/${store.slug}`} className="group grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-primary-soft/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:py-5">
                <div className="row-span-2 flex size-16 items-center justify-center overflow-hidden rounded-lg bg-primary-soft sm:row-span-1 sm:size-24">
                  {store.image ? <img src={store.image} alt={store.name} className="h-full w-full object-cover" /> : <Store className="size-7 text-primary/35 sm:size-9" aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="min-w-0 text-base font-semibold text-foreground group-hover:text-primary sm:text-lg">{store.name}</h3>
                    <Badge variant={trustVariants[store.trust.tone] || 'neutral'}>{store.trust.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {store.category.name}
                    {store.address && <span> · {store.address}</span>}
                  </p>
                  {store.description && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-foreground">{store.description}</p>}
                  {store.services[0] && <p className="mt-1.5 text-sm text-muted-foreground">{store.services[0].name} · ${store.services[0].price.toLocaleString('es-AR')}</p>}
                </div>
                <div className="col-start-2 flex items-center gap-2 text-sm sm:col-start-3 sm:flex-col sm:items-end sm:gap-0.5 sm:pt-1">
                  {store.reviewCount ? (
                    <>
                      <p className="flex items-center gap-1 font-semibold text-foreground"><Star className="size-4 text-highlight" aria-hidden="true" fill="currentColor" />{store.ratingAverage.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">{countLabel(store.reviewCount, 'reseña', 'reseñas')}</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin reseñas todavía</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-6 text-sm text-muted-foreground">
          ¿Tenés un negocio para mascotas?{' '}
          <Link href="/provider" prefetch={false} className="font-semibold text-primary underline-offset-4 hover:underline">Administrar un negocio</Link>
        </p>
      </section>
    </main>
  );
}
