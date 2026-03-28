'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFetchWithError } from '@/hooks/useFetchWithError';

interface Appointment {
    id: string;
    date: string;
    status: string;
    service: {
        id: string;
        name: string;
        price: number;
        duration: number;
    };
    pet: {
        id: string;
        name: string;
        petType: string;
        breed: string | null;
        images: string;
    };
    user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
    };
}

interface StatusCounts {
    PENDING: number;
    CONFIRMED: number;
    CANCELLED: number;
    COMPLETED: number;
}

export default function ProviderAppointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [counts, setCounts] = useState<StatusCounts>({ PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('');
    const [updating, setUpdating] = useState<string | null>(null);
    const { fetchWithError } = useFetchWithError();

    const fetchAppointments = useCallback(async () => {
        const params = new URLSearchParams({ upcoming: 'true' });
        if (filter) params.set('status', filter);

        const result = await fetchWithError<{ appointments: Appointment[]; counts: StatusCounts }>(`/api/provider/appointments?${params.toString()}`);

        if (result.success && result.data) {
            setAppointments(result.data.appointments || []);
            setCounts(result.data.counts || { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 });
        } else {
            toast.error('Error al cargar citas');
        }
        setLoading(false);
    }, [filter, fetchWithError]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const updateStatus = async (appointmentId: string, newStatus: string) => {
        setUpdating(appointmentId);
        try {
            const res = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(
                    newStatus === 'CONFIRMED' ? '¡Cita confirmada!' :
                        newStatus === 'CANCELLED' ? 'Cita cancelada' :
                            newStatus === 'COMPLETED' ? 'Cita marcada como completada' : 'Estado actualizado'
                );
                fetchAppointments();
            } else {
                toast.error(data.error || 'Error al actualizar');
            }
        } catch (error) {
            toast.error('Error al actualizar');
        } finally {
            setUpdating(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Badge className="bg-amber-100 text-amber-700">Pendiente</Badge>;
            case 'CONFIRMED':
                return <Badge className="bg-teal-100 text-teal-700">Confirmada</Badge>;
            case 'CANCELLED':
                return <Badge className="bg-red-100 text-red-700">Cancelada</Badge>;
            case 'COMPLETED':
                return <Badge className="bg-slate-100 text-slate-700">Completada</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getPetImage = (pet: Appointment['pet']) => {
        try {
            const images = JSON.parse(pet.images || '[]');
            return images[0] || null;
        } catch {
            return null;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={filter === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('')}
                    className={filter === '' ? 'bg-teal-500 hover:bg-teal-600' : ''}
                >
                    Todas ({counts.PENDING + counts.CONFIRMED})
                </Button>
                <Button
                    variant={filter === 'PENDING' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('PENDING')}
                    className={filter === 'PENDING' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                    Pendientes ({counts.PENDING})
                </Button>
                <Button
                    variant={filter === 'CONFIRMED' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('CONFIRMED')}
                    className={filter === 'CONFIRMED' ? 'bg-teal-500 hover:bg-teal-600' : ''}
                >
                    Confirmadas ({counts.CONFIRMED})
                </Button>
            </div>

            {/* Appointments List */}
            {appointments.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <span className="material-symbols-rounded text-5xl text-slate-300 mb-2">event_available</span>
                        <p className="text-slate-500">
                            {filter ? 'No hay citas con este estado' : 'No tienes citas próximas'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {appointments.map(apt => (
                        <Card key={apt.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    {/* Date */}
                                    <div className="flex items-center gap-3 md:w-48">
                                        <div className="flex flex-col items-center bg-teal-50 rounded-lg px-3 py-2 min-w-[50px]">
                                            <span className="text-[10px] font-bold text-teal-600 uppercase">
                                                {format(new Date(apt.date), 'MMM', { locale: es })}
                                            </span>
                                            <span className="text-xl font-bold text-teal-700">
                                                {format(new Date(apt.date), 'd')}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">
                                                {format(new Date(apt.date), 'HH:mm')}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {apt.service.duration} min
                                            </p>
                                        </div>
                                    </div>

                                    {/* Service & Pet */}
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800">{apt.service.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Avatar className="h-6 w-6">
                                                {getPetImage(apt.pet) ? (
                                                    <AvatarImage src={getPetImage(apt.pet)!} />
                                                ) : (
                                                    <AvatarFallback className="text-xs">
                                                        {apt.pet.petType === 'dog' ? '🐶' : '🐱'}
                                                    </AvatarFallback>
                                                )}
                                            </Avatar>
                                            <span className="text-sm text-slate-600">
                                                {apt.pet.name} {apt.pet.breed && `(${apt.pet.breed})`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Client */}
                                    <div className="flex items-center gap-2 md:w-48">
                                        <Avatar className="h-8 w-8">
                                            {apt.user.image ? (
                                                <AvatarImage src={apt.user.image} />
                                            ) : (
                                                <AvatarFallback>{apt.user.name?.[0] || 'U'}</AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">{apt.user.name}</p>
                                            <p className="text-xs text-slate-500">{apt.user.email}</p>
                                        </div>
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex items-center gap-2 md:w-40 justify-end">
                                        {getStatusBadge(apt.status)}
                                    </div>

                                    {/* Action Buttons */}
                                    {apt.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-teal-500 hover:bg-teal-600"
                                                disabled={updating === apt.id}
                                                onClick={() => updateStatus(apt.id, 'CONFIRMED')}
                                            >
                                                {updating === apt.id ? '...' : 'Confirmar'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                                disabled={updating === apt.id}
                                                onClick={() => updateStatus(apt.id, 'CANCELLED')}
                                            >
                                                Rechazar
                                            </Button>
                                        </div>
                                    )}

                                    {apt.status === 'CONFIRMED' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={updating === apt.id}
                                            onClick={() => updateStatus(apt.id, 'COMPLETED')}
                                        >
                                            Marcar completada
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
