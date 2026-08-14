'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
}

interface StoreCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  image: string | null;
  category: Category;
  ratingAverage: number;
  reviewCount: number;
  trust: { label: string; description: string; tone: string };
  services: Array<{ id: string; name: string; price: number; duration: number }>;
}

const trustClasses: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function ShopPage() {
  const { data: session } = useSession();
  const [stores, setStores] = useState<StoreCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('_all');
  const [minRating, setMinRating] = useState('_all');
  const [sortBy, setSortBy] = useState('recommended');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/store-categories')
      .then((response) => response.json())
      .then((data) => data.success && setCategories(data.categories))
      .catch((error) => console.error('Error fetching categories:', error));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ sortBy });
      if (search.trim()) params.set('search', search.trim());
      if (categoryId !== '_all') params.set('categoryId', categoryId);
      if (minRating !== '_all') params.set('minRating', minRating);

      try {
        const response = await fetch(`/api/stores?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (data.success) setStores(data.stores);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') console.error('Error fetching stores:', error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, categoryId, minRating, sortBy]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-50">
              Profesionales de la comunidad
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Negocios confiables para tu mascota
            </h1>
            <p className="mt-3 text-base text-slate-600 md:text-lg">
              Descubrí servicios por categoría y decidí con reseñas verificadas de clientes reales.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/map">Ver mapa pet-friendly</Link>
            </Button>
            <div className="relative mx-auto mt-7 max-w-2xl">
              <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar negocio, servicio o zona"
                className="h-12 rounded-2xl border-slate-200 bg-white pl-12 shadow-sm"
              />
            </div>
          </div>

          <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-3">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[210px] bg-white">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger className="w-[170px] bg-white">
                <SelectValue placeholder="Calificación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Cualquier rating</SelectItem>
                <SelectItem value="4.5">4,5 o más</SelectItem>
                <SelectItem value="4">4,0 o más</SelectItem>
                <SelectItem value="3">3,0 o más</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[190px] bg-white">
                <SelectValue placeholder="Orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Más recomendados</SelectItem>
                <SelectItem value="rating">Mejor calificados</SelectItem>
                <SelectItem value="reviews">Más reseñados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 md:py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Recomendados en MascoTin</h2>
            <p className="mt-1 text-sm text-slate-500">
              El orden combina la nota y la cantidad de experiencias verificadas.
            </p>
          </div>
          {session?.user?.role === 'PROVIDER' && (
            <Button asChild variant="outline" className="hidden border-teal-200 text-teal-700 sm:inline-flex">
              <Link href="/provider">Administrar mi negocio</Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Cargando negocios">
            {[0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl bg-slate-200" />)}
          </div>
        ) : stores.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-white">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <span className="material-symbols-rounded text-5xl text-slate-300">storefront</span>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Todavía no hay negocios con esos filtros</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">Probá otra búsqueda o publicá tu negocio desde el panel de proveedor.</p>
              <Button asChild className="mt-5 bg-teal-600 hover:bg-teal-700">
                <Link href="/provider">Ir al panel de proveedor</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((store) => (
              <Link key={store.id} href={`/shop/${store.slug}`} className="group block">
                <Card className="h-full overflow-hidden border-slate-200 bg-white transition duration-200 group-hover:-translate-y-0.5 group-hover:border-teal-200 group-hover:shadow-lg">
                  <div className="relative h-36 bg-gradient-to-br from-teal-100 via-cyan-50 to-orange-50">
                    {store.image ? (
                      <img src={store.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="material-symbols-rounded absolute left-6 top-6 text-6xl text-teal-700/30">storefront</span>
                    )}
                    <Badge className="absolute left-4 top-4 border-white/70 bg-white/90 text-slate-700 shadow-sm hover:bg-white">
                      {store.category.name}
                    </Badge>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-slate-900 group-hover:text-teal-700">{store.name}</h3>
                        {store.address && (
                          <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                            <span className="material-symbols-rounded text-sm">location_on</span>
                            {store.address}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="flex items-center justify-end gap-1 font-bold text-slate-900">
                          <span className="material-symbols-rounded text-base text-amber-500">star</span>
                          {store.reviewCount ? store.ratingAverage.toFixed(1) : 'Nuevo'}
                        </p>
                        <p className="text-xs text-slate-400">{store.reviewCount} reseñas</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`mt-3 ${trustClasses[store.trust.tone] || trustClasses.slate}`}>
                      {store.trust.label}
                    </Badge>
                    <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-relaxed text-slate-600">
                      {store.description || 'Servicios profesionales para el cuidado de tu mascota.'}
                    </p>
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {store.services[0] ? (
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-slate-600">Desde {store.services[0].name}</span>
                          <span className="font-bold text-teal-700">${store.services[0].price.toLocaleString('es-AR')}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">Próximamente publicará sus servicios</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
