'use client';

import { useEffect, useState } from 'react';
import { Check, Clock, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { APP_TIME_ZONE, EVENT_TIME_ZONE_LABEL, getEventDateParts } from '@/lib/date-format';
import { useShowEventTimeZone } from '@/hooks/useShowEventTimeZone';

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
    const showEventTimeZone = useShowEventTimeZone();
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
            const data = await response.json().catch(() => null);
            if (response.ok && data?.success) {
                toast.success(data.attending ? '¡Te anotaste!' : 'Ya no asistirás');
                fetchEvents();
            } else {
                toast.error(data?.error || 'No se pudo actualizar tu asistencia');
            }
        } catch {
            toast.error('Error de conexión. Intentá de nuevo.');
        }
    };

    const handleDismiss = async (eventId: string) => {
        setEvents(prev => prev.filter(e => e.id !== eventId));

        try {
            const response = await fetch(`/api/events/${eventId}/dismiss`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('dismiss failed');
            toast.success('Evento ocultado');
        } catch {
            toast.error('No se pudo ocultar el evento');
            fetchEvents();
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            day: date.toLocaleDateString('es-AR', { weekday: 'short', timeZone: APP_TIME_ZONE }),
            dayNum: getEventDateParts(date).day,
            time: getEventDateParts(date).time + (showEventTimeZone ? ' (' + EVENT_TIME_ZONE_LABEL + ')' : ''),
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
                            <div className="w-12 h-16 bg-muted rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4"></div>
                                <div className="h-3 bg-muted rounded w-1/2"></div>
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
                    <p className="text-sm text-muted-foreground text-center py-4">
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
                        <div key={event.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                            <div className="flex gap-3">
                                <div className="bg-teal-100 text-primary rounded-lg p-2 text-center min-w-[50px] h-fit">
                                    <span className="block text-xs font-bold uppercase">{day}</span>
                                    <span className="block text-lg font-bold">{dayNum}</span>
                                </div>
                                <div className="flex-1">
                                    {event.group && (
                                        <span className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                                            {event.group.name}
                                        </span>
                                    )}
                                    <h4 className="font-semibold text-sm text-foreground line-clamp-1">{event.title}</h4>
                                    <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                                        <span className="flex items-center gap-1">
                                            <Clock className="size-3" aria-hidden="true" />
                                            {time}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="size-3" aria-hidden="true" />
                                            {event.attendeesCount}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="min-h-10 text-xs text-muted-foreground hover:bg-muted hover:text-slate-600"
                                    onClick={() => handleDismiss(event.id)}
                                >
                                    No me interesa
                                </Button>
                                <Button
                                    size="sm"
                                    variant={event.isAttending ? "tonal" : "ghost"}
                                    className={`min-h-10 text-xs ${event.isAttending ? '' : 'text-primary'}`}
                                    onClick={() => handleAttend(event.id)}
                                >
                                    {event.isAttending && <Check className="size-4" aria-hidden="true" />}
                                    {event.isAttending ? 'Asistiré' : 'Me interesa'}
                                </Button>
                            </div>
                        </div>
                    );
                })}
                <Button
                    variant="link"
                    className="w-full text-primary"
                    onClick={() => window.location.href = '/community/events'}
                >
                    Ver calendario completo
                </Button>
            </CardContent>
        </Card>
    );
}
