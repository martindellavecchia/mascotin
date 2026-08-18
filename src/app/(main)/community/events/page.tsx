'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { es } from 'date-fns/locale';
import { CalendarX, Check, Clock, MapPin, Users } from 'lucide-react';
import CommunityLayout from '@/components/community/CommunityLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
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
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', date: '', location: '', category: 'otro' });

    const fetchEvents = async (nextCategory = category) => {
        setError(null);
        try {
            const res = await fetch(`/api/events?category=${nextCategory}`);
            const data = await res.json();
            if (data.success) {
                setEvents(data.events);
            } else {
                throw new Error(data.error || 'No se pudieron cargar los eventos');
            }
        } catch {
            setError('No se pudieron cargar los eventos. Intentá de nuevo.');
            toast.error('Error al cargar eventos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleAttend = async (eventId: string, currentStatus: boolean) => {
        if (!session) return toast.error('Iniciá sesión para participar');

        // Optimistic update
        setEvents(events.map(ev =>
            ev.id === eventId
                ? { ...ev, isAttending: !currentStatus, attendeesCount: ev.attendeesCount + (!currentStatus ? 1 : -1) }
                : ev
        ));

        try {
            const res = await fetch(`/api/events/${eventId}/attend`, { method: 'POST' });
            if (!res.ok) throw new Error();
        } catch (error) {
            // Revert
            setEvents(events.map(ev =>
                ev.id === eventId
                    ? { ...ev, isAttending: currentStatus, attendeesCount: ev.attendeesCount + (currentStatus ? 1 : -1) }
                    : ev
            ));
            toast.error('Error al actualizar asistencia');
        }
    };

    return (
        <div>
            <CommunityLayout>
                <div className="space-y-6">
                    <PageHeader
                        title="Calendario de eventos"
                        description="Organizá y encontrá actividades presenciales de la comunidad."
                        action={<Button variant={showCreate ? 'outline' : 'default'} onClick={() => setShowCreate((value) => !value)}>{showCreate ? 'Cerrar formulario' : 'Crear evento'}</Button>}
                    />
                    <div className="flex flex-wrap gap-2">
                        {EVENT_CATEGORIES.map((item) => (
                            <Button
                                key={item.value}
                                size="sm"
                                variant={category === item.value ? 'default' : 'outline'}
                                onClick={() => {
                                    setCategory(item.value);
                                    setLoading(true);
                                    void fetchEvents(item.value);
                                }}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </div>
                    {showCreate && (
                        <section className="space-y-3 border-y border-border bg-surface px-4 py-5" aria-label="Crear evento">
                            <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            <Textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            <Input placeholder="Ubicación" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                            <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {EVENT_CATEGORIES.filter((item) => item.value !== '_all').map((item) => (
                                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={async () => {
                                const res = await fetch('/api/events', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(form),
                                });
                                const data = await res.json();
                                if (data.success) {
                                    toast.success('Evento creado');
                                    setShowCreate(false);
                                    void fetchEvents();
                                } else {
                                    toast.error(data.error || 'No se pudo crear');
                                }
                            }}>Publicar evento</Button>
                        </section>
                    )}
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={es}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                    />

                    {error ? (
                        <EmptyState
                            title="No pudimos cargar los eventos"
                            description={error}
                            action={<Button variant="outline" onClick={() => void fetchEvents(category)}>Intentar de nuevo</Button>}
                        />
                    ) : loading ? (
                        <div className="text-center py-12">Cargando calendario...</div>
                    ) : events.length === 0 ? (
                        <EmptyState
                            icon={<CalendarX className="size-11" aria-hidden="true" />}
                            title="No hay eventos programados"
                            description="Podés crear el primero para convocar a la comunidad."
                            action={<Button onClick={() => setShowCreate(true)}>Crear evento</Button>}
                        />
                    ) : (
                        <div className="divide-y divide-border border-y border-border bg-surface">
                            {events.map(event => {
                                const date = new Date(event.date);
                                return (
                                    <article key={event.id} className="flex flex-col gap-4 px-4 py-5 md:flex-row">
                                        <div className="flex shrink-0 flex-row items-center justify-center gap-2 rounded-lg bg-primary-soft px-4 py-3 text-primary md:w-24 md:flex-col md:gap-0 md:text-center">
                                            <span className="block text-sm font-bold uppercase">{date.toLocaleDateString('es-AR', { month: 'short' })}</span>
                                            <span className="block text-3xl font-bold">{date.getDate()}</span>
                                            <span className="block text-xs uppercase opacity-75">{date.toLocaleDateString('es-AR', { weekday: 'short' })}</span>
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800">{event.title}</h3>
                                                    {event.group && (
                                                        <Badge variant="neutral">Grupo: {event.group.name}</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-slate-600 text-sm line-clamp-2">{event.description}</p>

                                            <div className="flex flex-wrap gap-4 text-sm text-slate-500 pt-2">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="size-4" aria-hidden="true" />
                                                    {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="size-4" aria-hidden="true" />
                                                    {event.location}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="size-4" aria-hidden="true" />
                                                    {event.attendeesCount} asistentes
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col justify-center min-w-[140px]">
                                            <Button
                                                onClick={() => handleAttend(event.id, event.isAttending)}
                                                variant={event.isAttending ? "outline" : "default"}
                                                className={event.isAttending ? 'border-primary text-primary' : undefined}
                                            >
                                                {event.isAttending && <Check className="size-4" aria-hidden="true" />}
                                                {event.isAttending ? 'Asistiré' : 'Asistir'}
                                            </Button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CommunityLayout>
        </div>
    );
}
