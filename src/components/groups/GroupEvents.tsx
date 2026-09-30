'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, CalendarX, Check, Download, Loader2, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StateFeedback } from '@/components/ui/state-feedback';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { eventInputToIso, toEventDateInput, formatEventDate } from '@/lib/date-format';

interface GroupEventsProps {
    groupId: string;
    isCreator: boolean;
    isMember?: boolean;
    currentUserId: string;
}

interface Event {
    id: string;
    title: string;
    date: string;
    location: string;
    image: string | null;
    author: {
        id: string;
        name: string;
        image: string | null;
    };
    authorId: string;
    description: string;
    isAttending?: boolean;
    attendeesCount?: number;
}

interface Attendee {
    userId: string;
    name: string;
    email: string;
    image: string | null;
    confirmedAt: string;
}

export default function GroupEvents({ groupId, isCreator, isMember = false, currentUserId }: GroupEventsProps) {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
    const [pendingAttendId, setPendingAttendId] = useState<string | null>(null);

    // Edit State
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [editForm, setEditForm] = useState({
        title: '',
        date: '',
        location: '',
        description: ''
    });
    const [updating, setUpdating] = useState(false);

    // Attendees State
    const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loadingAttendees, setLoadingAttendees] = useState(false);

    const fetchEvents = async () => {
        try {
            const res = await fetch(`/api/events?groupId=${groupId}&action=all`);
            const data = await res.json().catch(() => null);
            if (res.ok && data?.success) {
                setEvents(data.events);
                setLoadError(false);
            } else {
                setLoadError(true);
            }
        } catch (error) {
            console.error('Error fetching group events:', error);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleAttend = async (event: Event) => {
        if (pendingAttendId || new Date(event.date).getTime() <= Date.now()) return;
        setPendingAttendId(event.id);
        try {
            const res = await fetch(`/api/events/${event.id}/attend`, { method: 'POST' });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                toast.error(data?.error || 'No se pudo actualizar tu asistencia');
                return;
            }
            const attending = Boolean(data.attending);
            setEvents((current) => current.map((item) => item.id === event.id
                ? {
                    ...item,
                    isAttending: attending,
                    attendeesCount: Math.max(0, (item.attendeesCount ?? 0) + (attending === Boolean(item.isAttending) ? 0 : attending ? 1 : -1)),
                }
                : item));
            toast.success(attending ? '¡Te anotaste!' : 'Cancelaste tu asistencia');
        } catch {
            toast.error('Error de conexión. Intentá de nuevo.');
        } finally {
            setPendingAttendId(null);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [groupId]);

    // Fetch attendees when viewingEvent changes
    useEffect(() => {
        if (viewingEvent && (isCreator || viewingEvent.authorId === currentUserId)) {
            fetchAttendees(viewingEvent.id);
        } else {
            setAttendees([]);
        }
    }, [viewingEvent, isCreator, currentUserId]);

    const fetchAttendees = async (eventId: string) => {
        setLoadingAttendees(true);
        try {
            const res = await fetch(`/api/events/${eventId}/attendees`);
            const data = await res.json();
            if (data.success) {
                setAttendees(data.attendees);
            } else {
                setAttendees([]);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar asistentes');
        } finally {
            setLoadingAttendees(false);
        }
    };

    useEffect(() => {
        if (editingEvent) {
            const dateString = toEventDateInput(editingEvent.date);

            setEditForm({
                title: editingEvent.title,
                date: dateString,
                location: editingEvent.location,
                description: editingEvent.description || ''
            });
        }
    }, [editingEvent]);

    const handleDelete = async (eventId: string) => {
        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Evento eliminado');
                fetchEvents();
                return true;
            }
            const data = await res.json().catch(() => null);
            toast.error(data?.error || 'No se pudo eliminar el evento');
            return false;
        } catch {
            toast.error('Error de conexión. Intentá de nuevo.');
            return false;
        }
    };

    const handleUpdate = async () => {
        if (!editingEvent) return;
        setUpdating(true);
        try {
            const res = await fetch(`/api/events/${editingEvent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editForm, date: eventInputToIso(editForm.date, editingEvent.date) })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Evento actualizado');
                setEditingEvent(null);
                fetchEvents();
            } else {
                toast.error(data.error || 'Error al actualizar');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setUpdating(false);
        }
    };

    const downloadCSV = () => {
        if (!attendees.length || !viewingEvent) return;

        const headers = ["Nombre", "Email", "Fecha Confirmación"];
        const rows = attendees.map(a => [
            a.name,
            a.email,
            new Date(a.confirmedAt).toLocaleString('es-AR')
        ].join(","));

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `asistentes_${viewingEvent.title.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando eventos...</div>;

    if (loadError) {
        return (
            <StateFeedback
                status="error"
                title="No pudimos cargar los eventos del grupo"
                description="Revisá tu conexión e intentá de nuevo."
                action={<Button variant="outline" onClick={() => { setLoading(true); void fetchEvents(); }}>Reintentar</Button>}
            />
        );
    }

    return (
        <div className="min-w-0 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 [overflow-wrap:anywhere]">Eventos del grupo ({events.length})</h3>

            {events.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                    <CalendarX className="mx-auto mb-2 size-10 text-slate-300" aria-hidden="true" />
                    <p className="text-slate-500">No hay eventos programados.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {events.map((event) => {
                        const canManage = isCreator || event.authorId === currentUserId;
                        const ended = new Date(event.date).getTime() <= Date.now();
                        return (
                        <Card
                            key={event.id}
                            className={`group-card flex min-w-0 flex-col gap-4 p-4 transition-colors sm:flex-row ${canManage ? 'cursor-pointer hover:border-primary/35' : ''}`}
                            onClick={() => canManage && setViewingEvent(event)}
                        >
                            <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-24 sm:w-24">
                                {event.image ? (
                                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-300">
                                        <CalendarDays className="size-8" aria-hidden="true" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-slate-800 [overflow-wrap:anywhere]">{event.title}</h4>
                                        <div className="mb-2 mt-1 space-y-1 text-sm text-slate-500">
                                            <p className="flex items-start gap-1">
                                                <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
                                                <span>{formatEventDate(event.date)}</span>
                                            </p>
                                            <p className="flex min-w-0 items-start gap-1 [overflow-wrap:anywhere]">
                                                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                                                <span className="min-w-0">{event.location}</span>
                                            </p>
                                        </div>
                                        <p className="line-clamp-2 text-sm text-slate-600 [overflow-wrap:anywhere]">{event.description}</p>
                                    </div>
                                    <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                                        {canManage && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Editar ${event.title}`}
                                                    className="text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                                                    onClick={() => setEditingEvent(event)}
                                                >
                                                    <Pencil className="size-5" aria-hidden="true" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Eliminar ${event.title}`}
                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => setDeletingEvent(event)}
                                                >
                                                    <Trash2 className="size-5" aria-hidden="true" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-400">
                                    <span className="min-w-0 [overflow-wrap:anywhere]">Organizado por {event.author.name}</span>
                                    {typeof event.attendeesCount === 'number' && (
                                        <span>{event.attendeesCount} asistentes</span>
                                    )}
                                    {canManage && (
                                        <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-600">
                                            Ver asistentes
                                        </span>
                                    )}
                                </div>
                                {(isMember || isCreator) && (
                                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            variant={event.isAttending ? 'outline' : 'default'}
                                            className="min-h-10"
                                            disabled={pendingAttendId === event.id || ended}
                                            onClick={() => void handleAttend(event)}
                                            aria-pressed={Boolean(event.isAttending)}
                                        >
                                            {pendingAttendId === event.id
                                                ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                                : event.isAttending && <Check className="size-4" aria-hidden="true" />}
                                            {ended ? 'Finalizado' : event.isAttending ? 'Cancelar asistencia' : 'Asistir'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                open={Boolean(deletingEvent)}
                onOpenChange={(open) => !open && setDeletingEvent(null)}
                title={`¿Eliminar "${deletingEvent?.title ?? 'este evento'}"?`}
                description="Las personas anotadas dejarán de verlo. Esta acción no se puede deshacer."
                confirmLabel="Eliminar evento"
                destructive
                onConfirm={() => (deletingEvent ? handleDelete(deletingEvent.id) : true)}
            />

            {/* Edit DIALOG */}
            <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
                <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Editar evento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="group-event-title">Título</Label>
                            <Input
                                id="group-event-title"
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="group-event-date">Fecha y hora (Argentina)</Label>
                            <Input
                                id="group-event-date"
                                type="datetime-local"
                                value={editForm.date}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="group-event-location">Ubicación</Label>
                            <Input
                                id="group-event-location"
                                value={editForm.location}
                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="group-event-description">Descripción</Label>
                            <Textarea
                                id="group-event-description"
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                        <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setEditingEvent(null)}>Cancelar</Button>
                        <Button className="min-h-11 w-full sm:w-auto" onClick={handleUpdate} disabled={updating}>
                            {updating ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Attendees DIALOG */}
            <Dialog open={!!viewingEvent} onOpenChange={(open) => !open && setViewingEvent(null)}>
                <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="pr-6 [overflow-wrap:anywhere]">Asistentes: {viewingEvent?.title}</DialogTitle>
                    </DialogHeader>

                    <div className="min-w-0 py-4">
                        {loadingAttendees ? (
                            <div className="text-center py-8 text-slate-500">Cargando asistentes...</div>
                        ) : attendees.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                                No hay asistentes confirmados aún.
                            </div>
                        ) : (
                            <div className="max-h-[300px] overflow-auto rounded-md border">
                                <Table className="min-w-[640px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Confirmado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendees.map((attendee) => (
                                            <TableRow key={attendee.userId}>
                                                <TableCell className="flex min-w-0 items-center gap-2">
                                                    <Avatar className="h-8 w-8 shrink-0">
                                                        <AvatarImage src={attendee.image || undefined} />
                                                        <AvatarFallback>{attendee.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{attendee.name}</span>
                                                </TableCell>
                                                <TableCell className="[overflow-wrap:anywhere]">{attendee.email}</TableCell>
                                                <TableCell className="text-slate-500 text-xs">
                                                    {new Date(attendee.confirmedAt).toLocaleDateString('es-AR')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-center text-sm text-slate-500 sm:text-left">
                            Total: {attendees.length} asistentes
                        </div>
                        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
                            <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setViewingEvent(null)}>Cerrar</Button>
                            {attendees.length > 0 && (
                                <Button variant="brand" onClick={downloadCSV} className="min-h-11 w-full bg-teal-600 hover:bg-teal-700 sm:w-auto">
                                    <Download className="mr-2 size-4" aria-hidden="true" />
                                    Descargar CSV
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
