'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { es } from 'date-fns/locale';
import { CalendarX, Clock, MapPin, Users } from 'lucide-react';
import CommunityLayout from '@/components/community/CommunityLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function CommunityEventsPage() {
    const { data: session } = useSession();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('_all');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', date: '', location: '', category: 'otro' });

    const fetchEvents = async (nextCategory = category) => {
        try {
            const res = await fetch(`/api/events?category=${nextCategory}`);
            const data = await res.json();
            if (data.success) {
                setEvents(data.events);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar eventos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleAttend = async (eventId: string, currentStatus: boolean) => {
        if (!session) return toast.error('Inicia sesión para participar');

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
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <CommunityLayout>
                <div className="space-y-6">
                    <div className="flex flex-wrap justify-between items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-800">Calendario de eventos</h2>
                        <Button onClick={() => setShowCreate((value) => !value)}>Crear evento</Button>
                    </div>
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
                        <Card className="p-4 space-y-3">
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
                        </Card>
                    )}
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={es}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                    />

                    {loading ? (
                        <div className="text-center py-12">Cargando calendario...</div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
                            <CalendarX className="mb-2 size-10 text-slate-300" aria-hidden="true" />
                            <p className="text-slate-500">No hay eventos programados próximamente.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {events.map(event => {
                                const date = new Date(event.date);
                                return (
                                    <Card key={event.id} className="p-4 flex flex-col md:flex-row gap-4">
                                        {/* Date Box */}
                                        <div className="flex-shrink-0 bg-teal-50 text-teal-700 rounded-lg p-4 text-center md:w-24 flex flex-col justify-center">
                                            <span className="block text-sm font-bold uppercase">{date.toLocaleDateString('es-AR', { month: 'short' })}</span>
                                            <span className="block text-3xl font-bold">{date.getDate()}</span>
                                            <span className="block text-xs uppercase opacity-75">{date.toLocaleDateString('es-AR', { weekday: 'short' })}</span>
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800">{event.title}</h3>
                                                    {event.group && (
                                                        <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full inline-block mb-1">
                                                            Grupo: {event.group.name}
                                                        </span>
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
                                                className={event.isAttending ? "border-teal-500 text-teal-600 hover:bg-teal-50" : "bg-teal-500 hover:bg-teal-600"}
                                            >
                                                {event.isAttending ? 'Asistiré ✓' : 'Asistir'}
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CommunityLayout>
        </div>
    );
}
