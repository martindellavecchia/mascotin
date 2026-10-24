'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { StateFeedback } from '@/components/ui/state-feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import SlotPicker from '@/components/appointments/SlotPicker';
import { DEFAULT_TIME_ZONE, getTimeZoneLabel } from '@/lib/timezone-label';
const LABELS: Record<string, string> = {
  PENDING: 'Pendiente de confirmación',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Completado',
};
const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'neutral' | 'destructive'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'destructive',
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
function formatAppointmentDate(value: string, row: Appointment) {
  return new Date(value).toLocaleString('es-AR', {
    timeZone: row.service.provider.schedule?.timeZone || DEFAULT_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
    hourCycle: 'h23',
  });
}
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
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cambiar el turno');
      return false;
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
        <StateFeedback
          status="error"
          title={error}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError('');
                void load();
              }}
            >
              Actualizar
            </Button>
          }
        />
      )}
      {loading ? (
        <StateFeedback status="loading" title="Cargando turnos" />
      ) : !rows.length && !error ? (
        <EmptyState
          icon={<CalendarClock className="size-10" aria-hidden="true" />}
          title="Todavía no solicitaste turnos"
          description="Cuando reserves un servicio, vas a ver acá la confirmación y el historial."
          action={<Button asChild variant="outline"><Link href="/shop">Buscar servicios</Link></Button>}
        />
      ) : (
        rows.map((row) => (
          <section key={row.id} className="space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                  {row.service.name} · {row.pet.name}
                </h2>
                <p className="text-sm text-muted-foreground">{row.service.provider.businessName}</p>
              </div>
              <Badge variant={STATUS_VARIANTS[row.status] || 'neutral'}>{LABELS[row.status] || row.status}</Badge>
            </div>
            <div>
              <p className="font-medium text-foreground">
                {formatAppointmentDate(row.date, row)}{' '}
                · {row.durationMinutes ?? row.service.duration} min
              </p>
              <p className="text-xs text-muted-foreground">
                Horario en {getTimeZoneLabel(row.service.provider.schedule?.timeZone)}
              </p>
            </div>
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
                <ConfirmDialog
                  title="¿Cancelar este turno?"
                  description={`${row.service.name} para ${row.pet.name} el ${formatAppointmentDate(row.date, row)} (${getTimeZoneLabel(row.service.provider.schedule?.timeZone)}). El prestador va a ser notificado.`}
                  confirmLabel="Cancelar turno"
                  destructive
                  onConfirm={() => change(row, { status: 'CANCELLED' })}
                  trigger={
                    <Button variant="ghost" disabled={busy}>
                      Cancelar turno
                    </Button>
                  }
                />

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
                      {formatAppointmentDate(h.createdAt, row)} · {LABELS[h.status]} · turno{' '}
                      {formatAppointmentDate(h.date, row)}
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
