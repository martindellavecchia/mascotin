'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarX, Check, Clock, Loader2, MapPin, Users } from 'lucide-react';
import CommunityLayout from '@/components/community/CommunityLayout';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChip } from '@/components/ui/filter-chip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { StateFeedback } from '@/components/ui/state-feedback';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';

const EVENT_CATEGORIES = [
    { value: '_all', label: 'Todas' },
    { value: 'paseo', label: 'Paseos' },
    { value: 'feria', label: 'Ferias' },
    { value: 'adopcion', label: 'Adopción' },
    { value: 'no_convencionales', label: 'Mascotas no convencionales' },
    { value: 'otro', label: 'Otros' },
];

const EMPTY_FORM = { title: '', description: '', date: '', location: '', category: 'otro' };

type Timeframe = 'upcoming' | 'past';
import { APP_TIME_ZONE, EVENT_TIME_ZONE_LABEL, eventInputToIso, getEventCalendarDate, getEventDateParts } from '@/lib/date-format';
import { countLabel } from '@/lib/utils';

interface CommunityEvent {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    attendeesCount: number;
    isAttending: boolean;
    group?: {
        id: string;
        name: string;
    };
}

export default function CommunityEventsPage() {
    const { data: session } = useSession();
    const [events, setEvents] = useState<CommunityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [category, setCategory] = useState('_all');
    const [timeframe, setTimeframe] = useState<Timeframe>('upcoming');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [pendingAttendId, setPendingAttendId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const requestId = useRef(0);

    const fetchEvents = useCallback(async () => {
        const currentRequest = ++requestId.current;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ category, limit: '100' });
            if (timeframe === 'past') params.set('action', 'past');
            const res = await fetch(`/api/events?${params}`);
            const data = await res.json().catch(() => null);
            if (currentRequest !== requestId.current) return;
            if (res.ok && data?.success) {
                setEvents(data.events);
            } else {
                throw new Error(data?.error || 'No se pudieron cargar los eventos');
            }
        } catch {
            if (currentRequest !== requestId.current) return;
            setError('No se pudieron cargar los eventos. Intentá de nuevo.');
            toast.error('Error al cargar eventos');
        } finally {
            if (currentRequest === requestId.current) setLoading(false);
        }
    }, [category, timeframe]);

    useEffect(() => {
        void fetchEvents();
    }, [fetchEvents]);

    const eventDays = useMemo(() => events.map((event) => getEventCalendarDate(event.date)), [events]);
    const visibleEvents = useMemo(
        () => selectedDate ? events.filter((event) => isSameDay(getEventCalendarDate(event.date), selectedDate)) : events,
        [events, selectedDate],
    );

    const handleAttend = async (eventId: string, currentStatus: boolean) => {
        if (!session) return toast.error('Iniciá sesión para participar');
        if (pendingAttendId) return;
        const event = events.find((item) => item.id === eventId);
        if (!event || new Date(event.date).getTime() <= Date.now()) return;

        const applyAttendance = (attending: boolean) => {
            setEvents((current) => current.map((ev) => {
                if (ev.id !== eventId || ev.isAttending === attending) return ev;
                return { ...ev, isAttending: attending, attendeesCount: Math.max(0, ev.attendeesCount + (attending ? 1 : -1)) };
            }));
        };

        setPendingAttendId(eventId);
        applyAttendance(!currentStatus);
        try {
            const res = await fetch(`/api/events/${eventId}/attend`, { method: 'POST' });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                applyAttendance(currentStatus);
                toast.error(data?.error || 'No se pudo actualizar tu asistencia');
                return;
            }
            applyAttendance(Boolean(data.attending));
        } catch {
            applyAttendance(currentStatus);
            toast.error('Error de conexión. Intentá de nuevo.');
        } finally {
            setPendingAttendId(null);
        }
    };

    const handleCreate = async () => {
        setCreating(true);
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, date: eventInputToIso(form.date) }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.success) {
                toast.success('Evento creado');
                setShowCreate(false);
                setForm(EMPTY_FORM);
                void fetchEvents();
            } else {
                toast.error(data?.error || 'No se pudo crear el evento');
            }
        } catch {
            toast.error('Error de conexión. Intentá de nuevo.');
        } finally {
            setCreating(false);
        }
    };

    const selectedDayLabel = selectedDate ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) : '';

    return (
        <div>
            <CommunityLayout>
                <div className="space-y-6">
                    <PageHeader
                        title="Calendario de eventos"
                        description="Organizá y encontrá actividades presenciales de la comunidad."
                        action={<Button variant={showCreate ? 'outline' : 'default'} onClick={() => setShowCreate((value) => !value)}>{showCreate ? 'Cerrar formulario' : 'Crear evento'}</Button>}
                    />
                    <div role="group" aria-label="Período" className="flex flex-wrap gap-2">
                        {([
                            { value: 'upcoming', label: 'Próximos' },
                            { value: 'past', label: 'Pasados' },
                        ] as const).map((item) => (
                            <FilterChip
                                key={item.value}
                                active={timeframe === item.value}
                                onClick={() => {
                                    setTimeframe(item.value);
                                    setSelectedDate(undefined);
                                }}
                            >
                                {item.label}
                            </FilterChip>
                        ))}
                    </div>
                    <div role="group" aria-label="Categoría" className="flex flex-wrap gap-2">
                        {EVENT_CATEGORIES.map((item) => (
                            <FilterChip
                                key={item.value}
                                active={category === item.value}
                                onClick={() => setCategory(item.value)}
                            >
                                {item.label}
                            </FilterChip>
                        ))}
                    </div>
                    {showCreate && (
                        <section className="space-y-3 border-y border-border bg-surface px-4 py-5" aria-label="Crear evento">
                            <div className="space-y-1">
                                <Label htmlFor="event-title">Título</Label>
                                <Input id="event-title" placeholder="Ej: Paseo por los bosques de Palermo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="event-description">Descripción</Label>
                                <Textarea id="event-description" placeholder="Contá de qué se trata y qué hay que llevar" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="event-date">Fecha y hora (Argentina)</Label>
                                <Input id="event-date" type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="event-location">Ubicación</Label>
                                <Input id="event-location" placeholder="Dirección o punto de encuentro" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="event-category">Categoría</Label>
                                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                                    <SelectTrigger id="event-category"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {EVENT_CATEGORIES.filter((item) => item.value !== '_all').map((item) => (
                                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button disabled={creating} onClick={() => void handleCreate()}>
                                {creating && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                                {creating ? 'Publicando…' : 'Publicar evento'}
                            </Button>
                        </section>
                    )}
                    <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={es}
                        modifiers={{ hasEvent: eventDays }}
                        modifiersClassNames={{ hasEvent: 'font-bold text-primary' }}
                        className="mx-auto w-fit rounded-lg border border-border bg-surface p-3 lg:sticky lg:top-8 lg:mx-0"
                    />

                    <div className="min-w-0 space-y-4">

                    {selectedDate && (
                        <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
                            <p className="text-sm font-medium text-foreground first-letter:uppercase">
                                Eventos del {selectedDayLabel}
                            </p>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedDate(undefined)}>
                                Ver todos
                            </Button>
                        </div>
                    )}

                    {error ? (
                        <EmptyState
                            title="No pudimos cargar los eventos"
                            description={error}
                            action={<Button variant="outline" onClick={() => void fetchEvents()}>Intentar de nuevo</Button>}
                        />
                    ) : loading ? (
                        <StateFeedback status="loading" title="Cargando eventos" />
                    ) : events.length === 0 ? (
                        timeframe === 'past' ? (
                            <EmptyState
                                icon={<CalendarX className="size-11" aria-hidden="true" />}
                                title="Todavía no hay eventos pasados"
                                description="Cuando terminen los próximos eventos, los vas a ver acá."
                            />
                        ) : (
                            <EmptyState
                                icon={<CalendarX className="size-11" aria-hidden="true" />}
                                title="No hay eventos programados"
                                description="Podés crear el primero para convocar a la comunidad."
                                action={<Button onClick={() => setShowCreate(true)}>Crear evento</Button>}
                            />
                        )
                    ) : visibleEvents.length === 0 ? (
                        <EmptyState
                            icon={<CalendarX className="size-11" aria-hidden="true" />}
                            title="No hay eventos para este día"
                            description="Elegí otra fecha del calendario o mirá todos los eventos."
                            action={<Button variant="outline" onClick={() => setSelectedDate(undefined)}>Ver todos</Button>}
                        />
                    ) : (
                        <div className="divide-y divide-border border-y border-border bg-surface">
                            {visibleEvents.map(event => {
                                const date = new Date(event.date);
                                const ended = date.getTime() <= Date.now();
                                return (
                                    <article key={event.id} className="flex gap-4 px-4 py-5">
                                        <div className="flex w-14 shrink-0 flex-col items-center self-start rounded-lg bg-primary-soft py-2 text-primary sm:w-16" aria-hidden="true">
                                            <span className="text-xs font-semibold uppercase">{getEventDateParts(date).month}</span>
                                            <span className="text-2xl font-bold leading-tight">{getEventDateParts(date).day}</span>
                                            <span className="text-[11px] uppercase opacity-75">{date.toLocaleDateString('es-AR', { weekday: 'short', timeZone: APP_TIME_ZONE })}</span>
                                        </div>

                                        <div className="min-w-0 flex-1 md:flex md:items-start md:justify-between md:gap-6">
                                        <div className="min-w-0 space-y-1.5">
                                            <h2 className="text-base font-semibold text-foreground sm:text-lg">{event.title}</h2>
                                            {event.group && (
                                                <p className="text-xs font-medium text-muted-foreground">Grupo: {event.group.name}</p>
                                            )}

                                            {event.description && <p className="line-clamp-2 text-sm text-foreground">{event.description}</p>}

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="size-4" aria-hidden="true" />
                                                    {getEventDateParts(date).time + ' (' + EVENT_TIME_ZONE_LABEL + ')'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="size-4" aria-hidden="true" />
                                                    {event.location}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="size-4" aria-hidden="true" />
                                                    {countLabel(event.attendeesCount, 'asistente', 'asistentes')}
                                                </div>
                                            </div>
                                        </div>

                                            <Button
                                                onClick={() => void handleAttend(event.id, event.isAttending)}
                                                variant={event.isAttending ? 'tonal' : 'outline'}
                                                className="mt-3 w-full sm:w-auto md:mt-0 md:min-w-32 md:shrink-0"
                                                disabled={pendingAttendId === event.id || ended}
                                            >
                                                {event.isAttending && <Check className="size-4" aria-hidden="true" />}
                                                {ended
                                                    ? 'Finalizado'
                                                    : event.isAttending ? 'Asistiré' : 'Asistir'}
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                    </div>
                    </div>
                </div>
            </CommunityLayout>
        </div>
    );
}
