'use client';
import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { searchFiltersSchema, type SearchFilters } from '@/lib/product-search';

export default function SaveSearchButton({
  kind,
  filters,
}: {
  kind: 'ADOPTION' | 'SERVICES';
  filters: Partial<SearchFilters>;
}) {
  const router = useRouter();
  const id = useId();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [push, setPush] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/product-features')
      .then((r) => r.json())
      .then((d) => setEnabled(d.savedSearches === true))
      .catch(() => setEnabled(false));
  }, []);
  if (!enabled) return null;
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Guardar búsqueda
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar esta búsqueda</DialogTitle>
            <DialogDescription>
              Recibí un resumen diario a partir de las 9:00, hora argentina, cuando haya nuevos
              resultados. Se guardan los filtros actuales, incluida la zona que escribiste.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              setBusy(true);
              setError('');
              try {
                const response = await fetch('/api/saved-searches', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name,
                    kind,
                    filters: searchFiltersSchema.parse(filters),
                    pushEnabled: push,
                  }),
                });
                if (response.status === 401) {
                  router.push(
                    `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`
                  );
                  return;
                }
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'No pudimos guardar la búsqueda');
                setOpen(false);
                router.push('/saved-searches');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No pudimos guardar la búsqueda');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor={id} className="block text-sm font-medium">
              Nombre de la búsqueda
            </label>
            <Input
              id={id}
              value={name}
              maxLength={80}
              required
              onChange={(e) => setName(e.target.value)}
            />
            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={push} onCheckedChange={(v) => setPush(v === true)} />
              También enviar push a mis dispositivos habilitados
            </label>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando...' : 'Guardar búsqueda'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
