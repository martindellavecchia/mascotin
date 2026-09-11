'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { scheduleSchema, type BookingSchedule } from '@/lib/booking-schedule';
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export default function ProviderSchedule() {
  const [schedule, setSchedule] = useState<BookingSchedule>({
    timeZone: 'America/Argentina/Buenos_Aires',
    weekly: [],
    exceptions: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/provider/schedule')
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        if (d.schedule) setSchedule(scheduleSchema.parse(d.schedule));
      })
      .catch(() => {
        setLoadFailed(true);
        setError('No pudimos cargar tu agenda. Recargá la página.');
      })
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <p>Cargando agenda...</p>;
  return (
    <section className="mb-6 space-y-4 rounded-xl border bg-surface p-5">
      <h2 className="text-xl font-bold">Disponibilidad del prestador</h2>
      <p className="text-sm text-muted-foreground">
        Todos tus servicios comparten esta agenda. Cada solicitud ocupa su horario hasta confirmarla
        o cancelarla. Cambiar la disponibilidad conserva los turnos existentes.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          setMessage('');
          try {
            const parsed = scheduleSchema.safeParse(schedule);
            if (!parsed.success) throw new Error(parsed.error.issues[0].message);
            const r = await fetch('/api/provider/schedule', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsed.data),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            setMessage('Disponibilidad guardada');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos guardar');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm font-medium">
          Zona horaria
          <Input
            required
            value={schedule.timeZone}
            onChange={(e) => setSchedule({ ...schedule, timeZone: e.target.value })}
          />
        </label>
        {schedule.weekly.map((row, index) => (
          <div key={index} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-4">
            <label className="text-sm">
              Día
              <select
                className="h-11 w-full rounded-md border border-border-control bg-surface"
                value={row.day}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    weekly: schedule.weekly.map((r, i) =>
                      i === index ? { ...r, day: Number(e.target.value) } : r
                    ),
                  })
                }
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            {(['start', 'end'] as const).map((key) => (
              <label key={key} className="text-sm">
                {key === 'start' ? 'Desde' : 'Hasta'}
                <Input
                  type="time"
                  required
                  step={900}
                  value={row[key]}
                  onChange={(e) =>
                    setSchedule({
                      ...schedule,
                      weekly: schedule.weekly.map((r, i) =>
                        i === index ? { ...r, [key]: e.target.value } : r
                      ),
                    })
                  }
                />
              </label>
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setSchedule({ ...schedule, weekly: schedule.weekly.filter((_, i) => i !== index) })
              }
            >
              Quitar intervalo
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={schedule.weekly.length >= 28}
          onClick={() =>
            setSchedule({
              ...schedule,
              weekly: [...schedule.weekly, { day: 1, start: '09:00', end: '17:00' }],
            })
          }
        >
          Agregar intervalo semanal
        </Button>
        <h3 className="font-semibold">Excepciones por fecha</h3>
        {schedule.exceptions.map((row, index) => (
          <div key={index} className="space-y-2 rounded-lg border p-3">
            <label className="block text-sm">
              Fecha
              <Input
                type="date"
                required
                value={row.date}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    exceptions: schedule.exceptions.map((r, i) =>
                      i === index ? { ...r, date: e.target.value } : r
                    ),
                  })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!row.intervals.length}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    exceptions: schedule.exceptions.map((r, i) =>
                      i === index
                        ? {
                            ...r,
                            intervals: e.target.checked ? [] : [{ start: '09:00', end: '17:00' }],
                          }
                        : r
                    ),
                  })
                }
              />
              Cerrado todo el día
            </label>
            {row.intervals.map((interval, intervalIndex) => (
              <div className="grid grid-cols-2 gap-2" key={intervalIndex}>
                {(['start', 'end'] as const).map((key) => (
                  <label className="text-sm" key={key}>
                    {key === 'start' ? 'Desde' : 'Hasta'}
                    <Input
                      type="time"
                      required
                      value={interval[key]}
                      onChange={(e) =>
                        setSchedule({
                          ...schedule,
                          exceptions: schedule.exceptions.map((r, i) =>
                            i === index
                              ? {
                                  ...r,
                                  intervals: r.intervals.map((v, j) =>
                                    j === intervalIndex ? { ...v, [key]: e.target.value } : v
                                  ),
                                }
                              : r
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setSchedule({
                  ...schedule,
                  exceptions: schedule.exceptions.filter((_, i) => i !== index),
                })
              }
            >
              Quitar excepción
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setSchedule({
              ...schedule,
              exceptions: [...schedule.exceptions, { date: '', intervals: [] }],
            })
          }
        >
          Agregar excepción
        </Button>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <div>
          <Button disabled={busy || loadFailed}>
            {busy ? 'Guardando...' : 'Guardar disponibilidad'}
          </Button>
        </div>
      </form>
    </section>
  );
}
