'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import CommunityLayout from '@/components/community/CommunityLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function CommunityEventsPage() {
    const { data: session } = useSession();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events');
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
            <Header session={session} />
            <CommunityLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-800">Próximos Eventos</h2>
                        {/* Optionally add filters here later */}
                    </div>

                    {loading ? (
                        <div className="text-center py-12">Cargando calendario...</div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
                            <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">event_busy</span>
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
                                                    <span className="material-symbols-rounded text-base">schedule</span>
                                                    {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="material-symbols-rounded text-base">location_on</span>
                                                    {event.location}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="material-symbols-rounded text-base">group</span>
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
