'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
type Meetup = {
  id: string;
  proposedById: string;
  place: string;
  date: string;
  status: string;
  version: number;
  durationMinutes: number;
};
const LABELS: Record<string, string> = {
  PROPOSED: 'Esperando aceptación',
  ACCEPTED: 'Aceptado',
  DECLINED: 'Declinado',
  CANCELLED: 'Cancelado',
};
export default function MeetupPanel({ matchId, userId }: { matchId: string; userId: string }) {
  const [rows, setRows] = useState<Meetup[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{
    id?: string;
    version?: number;
    place: string;
    date: string;
    publicPlace: boolean;
    durationMinutes: number;
  } | null>(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/matches/${matchId}/meetups`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEnabled(d.enabled);
      setRows(d.meetups);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar las propuestas');
    }
  }, [matchId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(data: object) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/matches/${matchId}/meetups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos guardar');
    } finally {
      setBusy(false);
    }
  }
  if (!enabled && !error) return null;
  return (
    <details className="max-h-[50dvh] shrink-0 overflow-y-auto border-b bg-surface px-4 py-2">
      <summary className="cursor-pointer py-2 text-sm font-semibold" onClick={() => void load()}>
        Coordinar un encuentro
        {rows.some((r) => r.status === 'PROPOSED') ? ' · propuesta pendiente' : ''}
      </summary>
      <div className="space-y-3 py-2">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {enabled && !form && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setForm({ place: '', date: '', publicPlace: false, durationMinutes: 60 })
            }
          >
            Proponer encuentro
          </Button>
        )}
        {form && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save({
                id: form.id,
                version: form.version,
                action: form.id ? 'EDIT' : 'PROPOSE',
                proposal: { ...form, date: new Date(form.date).toISOString() },
              });
            }}
          >
            <label className="block text-sm">
              Lugar público
              <Input
                required
                minLength={3}
                maxLength={180}
                value={form.place}
                onChange={(e) => setForm({ ...form, place: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Fecha y hora (hora de tu dispositivo)
              <Input
                required
                type="datetime-local"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Duración en minutos
              <Input
                type="number"
                required
                min={15}
                max={180}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                required
                checked={form.publicPlace}
                onChange={(e) => setForm({ ...form, publicPlace: e.target.checked })}
              />
              Elegí un espacio de acceso público
            </label>
            <div className="flex gap-2">
              <Button disabled={busy}>Enviar propuesta</Button>
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                Cerrar
              </Button>
            </div>
          </form>
        )}
        {rows.map((row) => (
          <div key={row.id} className="space-y-2 rounded-lg border p-3">
            <p className="font-medium">{row.place}</p>
            <p className="text-sm">
              {new Date(row.date).toLocaleString('es-AR')} · {row.durationMinutes} min ·{' '}
              {LABELS[row.status]}
            </p>
            <div className="flex flex-wrap gap-2">
              {row.status === 'PROPOSED' &&
                row.proposedById !== userId &&
                new Date(row.date) > new Date() && (
                  <>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void save({ id: row.id, version: row.version, action: 'ACCEPT' })
                      }
                    >
                      Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void save({ id: row.id, version: row.version, action: 'DECLINE' })
                      }
                    >
                      Declinar
                    </Button>
                  </>
                )}
              {['PROPOSED', 'ACCEPTED'].includes(row.status) && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void save({ id: row.id, version: row.version, action: 'CANCEL' })
                    }
                  >
                    Cancelar propuesta
                  </Button>
                  {row.proposedById === userId && new Date(row.date) > new Date() && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const date = new Date(row.date);
                        setForm({
                          id: row.id,
                          version: row.version,
                          place: row.place,
                          durationMinutes: row.durationMinutes,
                          publicPlace: false,
                          date: new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                            .toISOString()
                            .slice(0, 16),
                        });
                      }}
                    >
                      Editar propuesta
                    </Button>
                  )}
                </>
              )}
              {row.status === 'ACCEPTED' && (
                <a
                  className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
                  href={`/api/matches/${matchId}/meetups?calendar=${row.id}`}
                >
                  Agregar al calendario (.ics)
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
