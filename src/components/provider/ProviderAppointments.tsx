'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PetTypeIcon } from '@/components/PetTypeIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { getPrimaryImageUrl } from '@/lib/media';

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
        thumbnailIndex: number;
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
                return <Badge className="whitespace-nowrap bg-amber-100 text-amber-700">Pendiente</Badge>;
            case 'CONFIRMED':
                return <Badge className="whitespace-nowrap bg-teal-100 text-teal-700">Confirmada</Badge>;
            case 'CANCELLED':
                return <Badge className="whitespace-nowrap bg-red-100 text-red-700">Cancelada</Badge>;
            case 'COMPLETED':
                return <Badge className="whitespace-nowrap bg-slate-100 text-slate-700">Completada</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getPetImage = (pet: Appointment['pet']) =>
        getPrimaryImageUrl(pet.images, pet.thumbnailIndex);

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-w-0 space-y-6">
            {/* Status Tabs */}
            <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-2">
                    <Button
                        variant={filter === '' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('')}
                        className={`min-h-10 shrink-0 ${filter === '' ? 'bg-teal-500 hover:bg-teal-600' : ''}`}
                    >
                        Todas ({counts.PENDING + counts.CONFIRMED})
                    </Button>
                    <Button
                        variant={filter === 'PENDING' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('PENDING')}
                        className={`min-h-10 shrink-0 ${filter === 'PENDING' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                    >
                        Pendientes ({counts.PENDING})
                    </Button>
                    <Button
                        variant={filter === 'CONFIRMED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('CONFIRMED')}
                        className={`min-h-10 shrink-0 ${filter === 'CONFIRMED' ? 'bg-teal-500 hover:bg-teal-600' : ''}`}
                    >
                        Confirmadas ({counts.CONFIRMED})
                    </Button>
                </div>
            </div>

            {/* Appointments List */}
            {appointments.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <CalendarCheck className="mx-auto mb-2 size-12 text-slate-300" aria-hidden="true" />
                        <p className="text-slate-500">
                            {filter ? 'No hay citas con este estado' : 'No tienes citas próximas'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="min-w-0 space-y-4">
                    {appointments.map(apt => (
                        <Card key={apt.id} className="min-w-0 transition-colors hover:border-primary/35">
                            <CardContent className="min-w-0 p-4">
                                <div className="min-w-0 space-y-4">
                                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="flex min-w-[50px] shrink-0 flex-col items-center rounded-lg bg-teal-50 px-3 py-2">
                                                <span className="text-[10px] font-bold uppercase text-teal-600">
                                                    {format(new Date(apt.date), 'MMM', { locale: es })}
                                                </span>
                                                <span className="text-xl font-bold text-teal-700">
                                                    {format(new Date(apt.date), 'd')}
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-slate-800">
                                                    {format(new Date(apt.date), 'HH:mm')}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {apt.service.duration} min
                                                </p>
                                                <p className="mt-2 font-semibold text-slate-800 [overflow-wrap:anywhere]">{apt.service.name}</p>
                                                <div className="mt-1 flex min-w-0 items-start gap-2">
                                                    <Avatar className="h-6 w-6 shrink-0">
                                                        {getPetImage(apt.pet) ? (
                                                            <AvatarImage src={getPetImage(apt.pet)!} />
                                                        ) : (
                                                            <AvatarFallback className="text-xs">
                                                                <PetTypeIcon petType={apt.pet.petType} className="size-4 text-teal-700" />
                                                            </AvatarFallback>
                                                        )}
                                                    </Avatar>
                                                    <span className="min-w-0 text-sm text-slate-600 [overflow-wrap:anywhere]">
                                                        {apt.pet.name} {apt.pet.breed && `(${apt.pet.breed})`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 self-start">
                                            {getStatusBadge(apt.status)}
                                        </div>
                                    </div>

                                    {/* Client */}
                                    <div className="flex min-w-0 items-center gap-3 border-t border-slate-100 pt-3">
                                        <Avatar className="h-9 w-9 shrink-0">
                                            {apt.user.image ? (
                                                <AvatarImage src={apt.user.image} />
                                            ) : (
                                                <AvatarFallback>{apt.user.name?.[0] || 'U'}</AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-700 [overflow-wrap:anywhere]">{apt.user.name || 'Cliente'}</p>
                                            <p className="text-xs text-slate-500 [overflow-wrap:anywhere]">{apt.user.email}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {apt.status === 'PENDING' && (
                                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:flex sm:justify-end">
                                            <Button
                                                size="sm"
                                                className="min-h-10 w-full bg-teal-500 hover:bg-teal-600 sm:w-auto"
                                                disabled={updating === apt.id}
                                                onClick={() => updateStatus(apt.id, 'CONFIRMED')}
                                            >
                                                {updating === apt.id ? '...' : 'Confirmar'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="min-h-10 w-full border-red-200 text-red-600 hover:bg-red-50 sm:w-auto"
                                                disabled={updating === apt.id}
                                                onClick={() => updateStatus(apt.id, 'CANCELLED')}
                                            >
                                                Rechazar
                                            </Button>
                                        </div>
                                    )}

                                    {apt.status === 'CONFIRMED' && (
                                        <div className="flex border-t border-slate-100 pt-3 sm:justify-end">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="min-h-10 w-full sm:w-auto"
                                                disabled={updating === apt.id}
                                                onClick={() => updateStatus(apt.id, 'COMPLETED')}
                                            >
                                                Marcar completada
                                            </Button>
                                        </div>
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
