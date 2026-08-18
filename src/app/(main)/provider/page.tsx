'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Briefcase,
    CircleX,
    Clock,
    MapPin,
    Plus,
    RefreshCw,
    Store,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import ProviderAppointments from '@/components/provider/ProviderAppointments';
import BusinessManagement from '@/components/provider/BusinessManagement';

interface ProviderProfile {
    id: string;
    businessName: string;
    description: string | null;
    location: string;
    rating: number;
    reviewCount: number;
}

interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    _count?: { appointments: number };
}

interface ProviderRequest {
    id: string;
    businessName: string;
    description: string | null;
    location: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    adminNote: string | null;
    createdAt: string;
}

export default function ProviderPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [provider, setProvider] = useState<ProviderProfile | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [providerRequest, setProviderRequest] = useState<ProviderRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);
    const [addServiceOpen, setAddServiceOpen] = useState(false);

    // Request form
    const [businessName, setBusinessName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [reason, setReason] = useState('');

    // New service form
    const [serviceName, setServiceName] = useState('');
    const [serviceDesc, setServiceDesc] = useState('');
    const [servicePrice, setServicePrice] = useState('');
    const [serviceDuration, setServiceDuration] = useState('60');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchProviderData();
        }
    }, [status, router]);

    const fetchProviderData = async () => {
        try {
            const res = await fetch('/api/provider');
            const data = await res.json();

            if (data.success) {
                if (data.provider) {
                    setProvider(data.provider);
                    setServices(data.provider.services || []);
                }
                if (data.providerRequest) {
                    setProviderRequest(data.providerRequest);
                }
            }
        } catch (error) {
            console.error('Error fetching provider data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRequest = async () => {
        if (!businessName.trim() || !location.trim() || !reason.trim()) {
            toast.error('Nombre del negocio, ubicación y motivo son requeridos');
            return;
        }
        if (reason.trim().length < 10) {
            toast.error('El motivo debe tener al menos 10 caracteres');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessName, description, location, reason }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success('¡Solicitud enviada! Te notificaremos cuando sea revisada.');
                setProviderRequest(data.providerRequest);
                setIsRegistering(false);
            } else {
                toast.error(data.error || 'Error al enviar solicitud');
            }
        } catch (error) {
            toast.error('Error al enviar solicitud');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddService = async () => {
        if (!serviceName.trim() || !serviceDesc.trim() || !servicePrice || !serviceDuration) {
            toast.error('Todos los campos son requeridos');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/provider/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: serviceName,
                    description: serviceDesc,
                    price: servicePrice,
                    duration: serviceDuration,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success('¡Servicio agregado!');
                setServices(prev => [data.service, ...prev]);
                setAddServiceOpen(false);
                setServiceName('');
                setServiceDesc('');
                setServicePrice('');
                setServiceDuration('60');
            } else {
                toast.error(data.error || 'Error al agregar servicio');
            }
        } catch (error) {
            toast.error('Error al agregar servicio');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto flex max-w-6xl justify-center px-4 py-8">
                    <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    // Already a provider — show dashboard
    if (provider) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                    <PageHeader title="Panel de proveedor" description="Gestioná tu negocio, servicios y citas desde un solo lugar." />
                    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="text-center mb-4">
                                        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-lg bg-primary-soft">
                                            <Store className="size-7 text-primary" aria-hidden="true" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-800">{provider.businessName}</h2>
                                        <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
                                            <MapPin className="size-3.5" aria-hidden="true" />
                                            {provider.location}
                                        </p>
                                    </div>
                                    <dl className="mb-4 grid grid-cols-3 divide-x divide-border border-y border-border py-3">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-teal-600">{provider.rating.toFixed(1)}</p>
                                            <p className="text-xs text-slate-500">Calificación</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-slate-700">{provider.reviewCount}</p>
                                            <p className="text-xs text-slate-500">Reseñas</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-slate-700">{services.length}</p>
                                            <p className="text-xs text-slate-500">Servicios</p>
                                        </div>
                                    </dl>
                                    {provider.description && (
                                        <p className="text-sm text-slate-600 text-center">{provider.description}</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Tabs defaultValue="appointments" className="w-full">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="appointments">Citas</TabsTrigger>
                                    <TabsTrigger value="services">Servicios</TabsTrigger>
                                    <TabsTrigger value="business">Mi negocio</TabsTrigger>
                                </TabsList>
                                <TabsContent value="appointments">
                                    <ProviderAppointments />
                                </TabsContent>
                                <TabsContent value="services">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-bold text-slate-800">Mis servicios</h2>
                                        <Button onClick={() => setAddServiceOpen(true)}>
                                            <Plus className="mr-2 size-5" aria-hidden="true" />
                                            Agregar servicio
                                        </Button>
                                    </div>
                                    {services.length === 0 ? (
                                        <EmptyState
                                            icon={<Briefcase className="size-11" aria-hidden="true" />}
                                            title="Todavía no publicaste servicios"
                                            action={<Button onClick={() => setAddServiceOpen(true)}>Agregar el primero</Button>}
                                        />
                                    ) : (
                                        <div className="divide-y divide-border border-y border-border bg-surface">
                                            {services.map(service => (
                                                <div key={service.id} className="p-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className="font-semibold text-slate-800">{service.name}</h3>
                                                            <Badge variant="outline">{service.duration} min</Badge>
                                                        </div>
                                                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{service.description}</p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-lg font-bold text-teal-600">${service.price.toLocaleString()}</span>
                                                            <span className="text-xs text-slate-400">{service._count?.appointments || 0} reservas</span>
                                                        </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="business">
                                    <BusinessManagement />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
                <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Agregar nuevo servicio</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Nombre del servicio *</label>
                                <Input placeholder="Ej: Consulta veterinaria" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Descripción *</label>
                                <Textarea placeholder="Describe el servicio..." value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} rows={3} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Precio ($) *</label>
                                    <Input type="number" placeholder="1500" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Duración (min) *</label>
                                    <Input type="number" placeholder="60" value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddServiceOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddService} disabled={submitting}>
                                {submitting ? 'Guardando...' : 'Guardar servicio'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // Request form
    if (isRegistering) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Store className="size-5 text-teal-500" aria-hidden="true" />
                                Solicitar acceso de proveedor
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Nombre del negocio *</label>
                                <Input placeholder="Ej: Veterinaria San Roque" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Ubicación *</label>
                                <Input placeholder="Ej: Palermo, Buenos Aires" value={location} onChange={(e) => setLocation(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Descripción</label>
                                <Textarea placeholder="Contanos sobre tu negocio" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">¿Por qué querés ser proveedor? *</label>
                                <Textarea
                                    placeholder="Contanos tu experiencia y motivación"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" onClick={() => setIsRegistering(false)} className="flex-1">
                                    Cancelar
                                </Button>
                                <Button className="flex-1" onClick={handleSubmitRequest} disabled={submitting}>
                                    {submitting ? 'Enviando...' : 'Enviar solicitud'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Pending request
    if (providerRequest?.status === 'PENDING') {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
                    <Card className="text-center">
                        <CardContent className="p-8">
                            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-lg bg-amber-100">
                                <Clock className="size-8 text-amber-600" aria-hidden="true" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-2">Tu solicitud está en revisión</h1>
                            <p className="text-slate-600 mb-4">
                                Enviaste una solicitud para <strong>{providerRequest.businessName}</strong>.
                                Un administrador la revisará pronto.
                            </p>
                            <Badge className="bg-amber-100 text-amber-700">
                                Enviada el {new Date(providerRequest.createdAt).toLocaleDateString('es-AR')}
                            </Badge>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Rejected request
    if (providerRequest?.status === 'REJECTED') {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
                    <Card className="text-center">
                        <CardContent className="p-8">
                            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-lg bg-red-100">
                                <CircleX className="size-8 text-red-600" aria-hidden="true" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-800 mb-2">Tu solicitud fue rechazada</h1>
                            {providerRequest.adminNote && (
                                <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                                    <p className="text-sm text-slate-500 mb-1">Nota del administrador:</p>
                                    <p className="text-slate-700">{providerRequest.adminNote}</p>
                                </div>
                            )}
                            <p className="mb-6 text-slate-600">Podés enviar una nueva solicitud con información actualizada.</p>
                            <Button
                                onClick={() => {
                                    setBusinessName('');
                                    setDescription('');
                                    setLocation('');
                                    setReason('');
                                    setIsRegistering(true);
                                }}
                            >
                                <RefreshCw className="mr-2 size-5" aria-hidden="true" />
                                Solicitar nuevamente
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // No request yet — show call to action
    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
                <Card className="text-center">
                    <CardContent className="p-8">
                        <Store className="mb-4 size-16 text-teal-500" aria-hidden="true" />
                        <h1 className="mb-2 text-2xl font-bold text-slate-800">¿Ofrecés servicios para mascotas?</h1>
                        <p className="text-slate-600 mb-6">
                            Publicá tus servicios, recibí consultas y administrá las citas desde Huella.
                        </p>
                        <Button size="lg" onClick={() => setIsRegistering(true)}>
                            <Store className="mr-2 size-5" aria-hidden="true" />
                            Solicitar acceso de proveedor
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
