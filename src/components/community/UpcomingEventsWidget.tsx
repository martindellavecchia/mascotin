'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Event {
    id: string;
    title: string;
    date: string;
    location: string;
    attendeesCount: number;
    isAttending: boolean;
    group?: {
        id: string;
        name: string;
    };
}

export default function UpcomingEventsWidget() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/events');
            const data = await response.json();
            if (data.success) {
                setEvents(data.events?.slice(0, 3) || []);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAttend = async (eventId: string) => {
        try {
            const response = await fetch(`/api/events/${eventId}/attend`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                toast.success(data.attending ? '¡Te anotaste!' : 'Ya no asistirás');
                fetchEvents();
            }
        } catch (error) {
            toast.error('Error al actualizar asistencia');
        }
    };

    const handleDismiss = async (eventId: string) => {
        // Optimistic remove
        setEvents(prev => prev.filter(e => e.id !== eventId));

        try {
            await fetch(`/api/events/${eventId}/dismiss`, {
                method: 'POST',
            });
            toast.success('Evento ocultado');
        } catch (error) {
            toast.error('Error al ocultar evento');
            fetchEvents(); // Revert on error
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            day: date.toLocaleDateString('es-AR', { weekday: 'short' }),
            dayNum: date.getDate(),
            time: date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Próximos Eventos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="animate-pulse flex gap-3">
                            <div className="w-12 h-16 bg-slate-200 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (events.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Próximos Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500 text-center py-4">
                        No hay eventos próximos
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {events.map(event => {
                    const { day, dayNum, time } = formatDate(event.date);
                    return (
                        <div key={event.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                            <div className="flex gap-3">
                                <div className="bg-teal-100 text-teal-700 rounded-lg p-2 text-center min-w-[50px] h-fit">
                                    <span className="block text-xs font-bold uppercase">{day}</span>
                                    <span className="block text-lg font-bold">{dayNum}</span>
                                </div>
                                <div className="flex-1">
                                    {event.group && (
                                        <span className="inline-block px-1.5 py-0.5 mb-1 text-[10px] font-medium bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                                            {event.group.name}
                                        </span>
                                    )}
                                    <h4 className="font-semibold text-sm text-slate-800 line-clamp-1">{event.title}</h4>
                                    <div className="flex items-center text-xs text-slate-500 mt-1 gap-2">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-rounded text-xs">schedule</span>
                                            {time}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-rounded text-xs">group</span>
                                            {event.attendeesCount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                    onClick={() => handleDismiss(event.id)}
                                >
                                    No me interesa
                                </Button>
                                <Button
                                    size="sm"
                                    variant={event.isAttending ? "default" : "ghost"}
                                    className={`h-7 text-xs ${event.isAttending ? 'bg-teal-500 hover:bg-teal-600' : 'text-teal-600 hover:bg-teal-50'}`}
                                    onClick={() => handleAttend(event.id)}
                                >
                                    {event.isAttending ? 'Asistiré ✓' : 'Me interesa'}
                                </Button>
                            </div>
                        </div>
                    );
                })}
                <Button
                    variant="link"
                    className="w-full text-teal-600"
                    onClick={() => window.location.href = '/community/events'}
                >
                    Ver calendario completo
                </Button>
            </CardContent>
        </Card>
    );
}
