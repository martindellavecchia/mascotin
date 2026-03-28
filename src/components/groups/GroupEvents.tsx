'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface GroupEventsProps {
    groupId: string;
    isCreator: boolean;
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
}

interface Attendee {
    userId: string;
    name: string;
    email: string;
    image: string | null;
    confirmedAt: string;
}

export default function GroupEvents({ groupId, isCreator, currentUserId }: GroupEventsProps) {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

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
            const data = await res.json();
            if (data.success) {
                setEvents(data.events);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
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
            const d = new Date(editingEvent.date);
            const dateString = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

            setEditForm({
                title: editingEvent.title,
                date: dateString,
                location: editingEvent.location,
                description: editingEvent.description || ''
            });
        }
    }, [editingEvent]);

    const handleDelete = async (eventId: string) => {
        if (!confirm('¿Estás seguro de eliminar este evento?')) return;

        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Evento eliminado');
                fetchEvents();
            } else {
                toast.error('Error al eliminar evento');
            }
        } catch (error) {
            toast.error('Error al eliminar evento');
        }
    };

    const handleUpdate = async () => {
        if (!editingEvent) return;
        setUpdating(true);
        try {
            const res = await fetch(`/api/events/${editingEvent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
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
            new Date(a.confirmedAt).toLocaleString()
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

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-800">Eventos del Grupo ({events.length})</h3>

            {events.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <span className="material-symbols-rounded text-4xl text-slate-300 mb-2">event_busy</span>
                    <p className="text-slate-500">No hay eventos programados.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {events.map((event) => (
                        <Card
                            key={event.id}
                            className="p-4 flex gap-4 cursor-pointer hover:shadow-md transition-shadow group-card"
                            onClick={() => (isCreator || event.authorId === currentUserId) && setViewingEvent(event)}
                        >
                            <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                                {event.image ? (
                                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-300">
                                        <span className="material-symbols-rounded text-3xl">event</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-slate-800 truncate">{event.title}</h4>
                                        <p className="text-sm text-slate-500 mb-2 flex items-center gap-1">
                                            <span className="material-symbols-rounded text-xs">calendar_today</span>
                                            {new Date(event.date).toLocaleDateString()}
                                            <span className="material-symbols-rounded text-xs ml-2">location_on</span>
                                            {event.location}
                                        </p>
                                        <p className="text-sm text-slate-600 line-clamp-2">{event.description}</p>
                                    </div>
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        {(isCreator || event.authorId === currentUserId) && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                                                    onClick={() => setEditingEvent(event)}
                                                >
                                                    <span className="material-symbols-rounded">edit</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => handleDelete(event.id)}
                                                >
                                                    <span className="material-symbols-rounded">delete</span>
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                                    <span>Organizado por {event.author.name}</span>
                                    {(isCreator || event.authorId === currentUserId) && (
                                        <span className="text-teal-600 font-medium ml-2 px-2 py-0.5 bg-teal-50 rounded-full">
                                            Ver Asistentes
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit DIALOG */}
            <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Evento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha y Hora</Label>
                            <Input
                                type="datetime-local"
                                value={editForm.date}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ubicación</Label>
                            <Input
                                value={editForm.location}
                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Descripción</Label>
                            <Textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingEvent(null)}>Cancelar</Button>
                        <Button onClick={handleUpdate} disabled={updating}>
                            {updating ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Attendees DIALOG */}
            <Dialog open={!!viewingEvent} onOpenChange={(open) => !open && setViewingEvent(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Asistentes: {viewingEvent?.title}</DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        {loadingAttendees ? (
                            <div className="text-center py-8 text-slate-500">Cargando asistentes...</div>
                        ) : attendees.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                                No hay asistentes confirmados aún.
                            </div>
                        ) : (
                            <div className="max-h-[300px] overflow-y-auto border rounded-md">
                                <Table>
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
                                                <TableCell className="flex items-center gap-2">
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarImage src={attendee.image || undefined} />
                                                        <AvatarFallback>{attendee.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{attendee.name}</span>
                                                </TableCell>
                                                <TableCell>{attendee.email}</TableCell>
                                                <TableCell className="text-slate-500 text-xs">
                                                    {new Date(attendee.confirmedAt).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
                        <div className="text-sm text-slate-500">
                            Total: {attendees.length} asistentes
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setViewingEvent(null)}>Cerrar</Button>
                            {attendees.length > 0 && (
                                <Button onClick={downloadCSV} className="bg-teal-600 hover:bg-teal-700">
                                    <span className="material-symbols-rounded mr-2 text-sm">download</span>
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
