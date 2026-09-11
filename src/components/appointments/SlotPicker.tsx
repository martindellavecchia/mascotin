'use client';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
export default function SlotPicker({
  serviceId,
  appointmentId,
  value,
  onChange,
}: {
  serviceId: string;
  appointmentId?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [slots, setSlots] = useState<string[]>([]);
  const [zone, setZone] = useState('America/Argentina/Buenos_Aires');
  const [day, setDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(
      `/api/services/${serviceId}/availability${appointmentId ? `?appointmentId=${encodeURIComponent(appointmentId)}` : ''}`,
      { signal: controller.signal }
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      })
      .then((d) => {
        setSlots(d.slots);
        setZone(d.timeZone || 'America/Argentina/Buenos_Aires');
        setConfigured(d.configured);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message || 'No pudimos cargar los horarios');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [serviceId, appointmentId, retry]);
  const dateLabel = (slot: string) =>
    new Date(slot).toLocaleDateString('es-AR', {
      timeZone: zone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  const days = [...new Set(slots.map(dateLabel))];
  const selectedDay = days.includes(day) ? day : days[0];
  if (loading) return <p role="status">Buscando horarios disponibles...</p>;
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <Button type="button" variant="outline" onClick={() => setRetry((n) => n + 1)}>
          Reintentar
        </Button>
      </div>
    );
  if (!slots.length)
    return (
      <p>
        {configured
          ? 'No hay horarios disponibles en los próximos 30 días.'
          : 'El prestador todavía no habilitó su agenda.'}
      </p>
    );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Horarios de {zone.replaceAll('_', ' ')}</p>
      <label htmlFor={`${id}-day`} className="block text-sm font-medium">
        Día
      </label>
      <select
        id={`${id}-day`}
        className="h-11 w-full rounded-md border border-border-control bg-surface px-3"
        value={selectedDay}
        onChange={(e) => {
          setDay(e.target.value);
          onChange('');
        }}
      >
        {days.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      <label htmlFor={`${id}-time`} className="block text-sm font-medium">
        Horario disponible
      </label>
      <select
        id={`${id}-time`}
        required
        className="h-11 w-full rounded-md border border-border-control bg-surface px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Elegí un horario</option>
        {slots
          .filter((s) => dateLabel(s) === selectedDay)
          .map((s) => (
            <option key={s} value={s}>
              {new Date(s).toLocaleTimeString('es-AR', {
                timeZone: zone,
                hour: '2-digit',
                minute: '2-digit',
              })}
            </option>
          ))}
      </select>
    </div>
  );
}
