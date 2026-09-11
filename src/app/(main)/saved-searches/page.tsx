'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { searchHref, type SearchFilters } from '@/lib/product-search';

type Search = {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  pushEnabled: boolean;
  filters: SearchFilters;
};
export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<Search | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    fetch('/api/store-categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => setError('No pudimos cargar las categorías.'));
  }, []);
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/saved-searches');
      if (!r.ok) throw new Error();
      const d = await r.json();
      setSearches(d.searches);
    } catch {
      setError('No pudimos cargar tus búsquedas.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function update(id: string, method: string, data?: Partial<Search>) {
    setBusy(id);
    setError('');
    try {
      const r = await fetch(`/api/saved-searches/${id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      if (!r.ok) throw new Error();
      setEdit(null);
      await load();
    } catch {
      setError('No pudimos guardar el cambio. Intentá nuevamente.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageHeader
        title="Búsquedas guardadas"
        description="Un resumen diario con resultados nuevos, a partir de las 9:00 de Argentina."
      />
      {error && (
        <p role="alert" className="text-destructive">
          {error}{' '}
          <Button
            variant="outline"
            onClick={() => {
              setError('');
              void load();
            }}
          >
            Reintentar
          </Button>
        </p>
      )}
      {loading ? (
        <p role="status">Cargando búsquedas...</p>
      ) : !searches.length ? (
        <p>
          Guardá una búsqueda desde{' '}
          <Link className="underline" href="/adoptions">
            Adopciones
          </Link>{' '}
          o{' '}
          <Link className="underline" href="/shop">
            Servicios
          </Link>
          .
        </p>
      ) : (
        searches.map((search) => (
          <section key={search.id} className="space-y-3 rounded-xl border bg-surface p-5">
            <h2 className="text-lg font-semibold">{search.name}</h2>
            <p className="text-sm text-muted-foreground">
              {search.kind === 'ADOPTION' ? 'Adopciones' : 'Servicios'} ·{' '}
              {search.filters.zone || 'Todas las zonas'} · {search.enabled ? 'Activa' : 'Pausada'}
            </p>
            {edit?.id === search.id ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void update(search.id, 'PATCH', {
                    name: edit.name,
                    filters: edit.filters,
                    pushEnabled: edit.pushEnabled,
                  });
                }}
              >
                <label className="block">
                  Nombre
                  <Input
                    required
                    maxLength={80}
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </label>
                <label className="block">
                  Zona
                  <Input
                    maxLength={100}
                    value={edit.filters.zone}
                    onChange={(e) =>
                      setEdit({ ...edit, filters: { ...edit.filters, zone: e.target.value } })
                    }
                  />
                </label>
                <label className="block">
                  Texto de búsqueda
                  <Input
                    maxLength={100}
                    value={edit.filters.search}
                    onChange={(e) =>
                      setEdit({ ...edit, filters: { ...edit.filters, search: e.target.value } })
                    }
                  />
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={edit.pushEnabled}
                    onChange={(e) => setEdit({ ...edit, pushEnabled: e.target.checked })}
                  />
                  Enviar push
                </label>
                {search.kind === 'ADOPTION' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      Especie
                      <select
                        className="h-11 w-full rounded-md border bg-surface px-2"
                        value={edit.filters.species}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            filters: {
                              ...edit.filters,
                              species: e.target.value as SearchFilters['species'],
                            },
                          })
                        }
                      >
                        <option value="">Todas</option>
                        <option value="dog">Perro</option>
                        <option value="cat">Gato</option>
                        <option value="bird">Ave</option>
                        <option value="other">Otra</option>
                      </select>
                    </label>
                    <label>
                      Tamaño
                      <select
                        className="h-11 w-full rounded-md border bg-surface px-2"
                        value={edit.filters.size}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            filters: {
                              ...edit.filters,
                              size: e.target.value as SearchFilters['size'],
                            },
                          })
                        }
                      >
                        <option value="">Todos</option>
                        <option value="small">Pequeño</option>
                        <option value="medium">Mediano</option>
                        <option value="large">Grande</option>
                      </select>
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      Categoría
                      <select
                        className="h-11 w-full rounded-md border bg-surface px-2"
                        value={edit.filters.categoryId}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            filters: { ...edit.filters, categoryId: e.target.value },
                          })
                        }
                      >
                        <option value="">Todas</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Calificación mínima
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        step={0.5}
                        value={edit.filters.minRating}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            filters: { ...edit.filters, minRating: Number(e.target.value) },
                          })
                        }
                      />
                    </label>
                  </div>
                )}
                <Button disabled={busy === search.id}>Guardar cambios</Button>
                <Button type="button" variant="ghost" onClick={() => setEdit(null)}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={searchHref(search.kind, search.filters)}>Ver resultados</Link>
                </Button>
                <Button variant="outline" onClick={() => setEdit(search)}>
                  Editar
                </Button>
                <Button
                  variant="outline"
                  disabled={busy === search.id}
                  onClick={() => void update(search.id, 'PATCH', { enabled: !search.enabled })}
                >
                  {search.enabled ? 'Pausar' : 'Reactivar'}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy === search.id}
                  onClick={() => void update(search.id, 'DELETE')}
                >
                  Eliminar
                </Button>
              </div>
            )}
          </section>
        ))
      )}
    </main>
  );
}
