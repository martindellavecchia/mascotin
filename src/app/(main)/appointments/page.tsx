'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import SlotPicker from '@/components/appointments/SlotPicker';
const LABELS: Record<string, string> = {
  PENDING: 'Pendiente de confirmación',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Completado',
};
type Appointment = {
  id: string;
  serviceId: string;
  status: string;
  date: string;
  updatedAt: string;
  durationMinutes: number | null;
  service: {
    name: string;
    duration: number;
    provider: { businessName: string; schedule: { timeZone: string } | null };
  };
  pet: { name: string };
  history: Array<{ id: string; date: string; status: string; createdAt: string }>;
};
export default function AppointmentsPage() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/appointments?all=true&page=${page}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setRows(d.appointments);
      setHasMore(d.hasMore);
      setError('');
    } catch {
      setError('No pudimos cargar tus turnos');
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    void load();
  }, [load]);
  async function change(row: Appointment, data: { status?: string; date?: string }) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/appointments/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, expectedUpdatedAt: row.updatedAt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cambiar el turno');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <PageHeader
        title="Mis turnos"
        description="Solicitudes, confirmaciones e historial de atención."
        action={
          <Button asChild variant="outline">
            <Link href="/shop">Buscar servicios</Link>
          </Button>
        }
      />
      {error && (
        <div role="alert">
          <p className="text-destructive">{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              setError('');
              void load();
            }}
          >
            Actualizar
          </Button>
        </div>
      )}
      {loading ? (
        <p role="status">Cargando turnos...</p>
      ) : !rows.length && !error ? (
        <p>Todavía no solicitaste turnos.</p>
      ) : (
        rows.map((row) => (
          <section key={row.id} className="space-y-3 rounded-xl border bg-surface p-5">
            <h2 className="text-lg font-bold">
              {row.service.name} · {row.pet.name}
            </h2>
            <p>{row.service.provider.businessName}</p>
            <p>
              {new Date(row.date).toLocaleString('es-AR', {
                timeZone:
                  row.service.provider.schedule?.timeZone || 'America/Argentina/Buenos_Aires',
              })}{' '}
              · {row.durationMinutes ?? row.service.duration} min
            </p>
            <p className="text-xs text-muted-foreground">
              Hora del prestador:{' '}
              {(
                row.service.provider.schedule?.timeZone || 'America/Argentina/Buenos_Aires'
              ).replaceAll('_', ' ')}
            </p>
            <p className="font-medium text-primary">{LABELS[row.status] || row.status}</p>
            {new Date(row.date) > new Date() && ['PENDING', 'CONFIRMED'].includes(row.status) && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setDate('');
                    setEditing(editing === row.id ? null : row.id);
                  }}
                >
                  Reprogramar
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void change(row, { status: 'CANCELLED' })}
                >
                  Cancelar turno
                </Button>
              </div>
            )}
            {editing === row.id && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void change(row, { date });
                }}
              >
                <p className="text-sm">
                  El nuevo horario deberá ser confirmado por el prestador. Tu turno actual se
                  conserva si el cambio falla.
                </p>
                <SlotPicker
                  serviceId={row.serviceId}
                  appointmentId={row.id}
                  value={date}
                  onChange={setDate}
                />
                <Button disabled={busy || !date}>Solicitar nuevo horario</Button>
              </form>
            )}
            {row.history.length > 0 && (
              <details>
                <summary className="cursor-pointer py-2 text-sm">Ver historial</summary>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {row.history.map((h) => (
                    <li key={h.id}>
                      {new Date(h.createdAt).toLocaleString('es-AR')} · {LABELS[h.status]} · turno{' '}
                      {new Date(h.date).toLocaleString('es-AR')}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        ))
      )}
      {(page > 1 || hasMore) && (
        <nav aria-label="Páginas de mis turnos" className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={page === 1 || busy || loading}
            onClick={() => {
              setEditing(null);
              setPage(page - 1);
            }}
          >
            Anterior
          </Button>
          <span>Página {page}</span>
          <Button
            variant="outline"
            disabled={!hasMore || busy || loading}
            onClick={() => {
              setEditing(null);
              setPage(page + 1);
            }}
          >
            Siguiente
          </Button>
        </nav>
      )}
    </main>
  );
}
