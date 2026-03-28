'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import ProviderAppointments from '@/components/provider/ProviderAppointments';

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

export default function ProviderPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [provider, setProvider] = useState<ProviderProfile | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);
    const [addServiceOpen, setAddServiceOpen] = useState(false);

    // Registration form
    const [businessName, setBusinessName] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');

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

            if (data.success && data.provider) {
                setProvider(data.provider);
                setServices(data.provider.services || []);
            }
        } catch (error) {
            console.error('Error fetching provider data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!businessName.trim() || !location.trim()) {
            toast.error('Nombre del negocio y ubicación son requeridos');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessName, description, location }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success('¡Perfil de proveedor creado!');
                setProvider(data.provider);
                setIsRegistering(false);
            } else {
                toast.error(data.error || 'Error al registrar');
            }
        } catch (error) {
            toast.error('Error al registrar');
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
                // Reset form
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
            <div className="min-h-screen bg-slate-50">
                <Header session={session} />
                <div className="container mx-auto px-4 py-8 flex justify-center">
                    <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    // Not a provider yet - show registration
    if (!provider && !isRegistering) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Header session={session} />
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <Card className="text-center">
                        <CardContent className="p-8">
                            <span className="material-symbols-rounded text-6xl text-teal-500 mb-4">storefront</span>
                            <h1 className="text-2xl font-bold text-slate-800 mb-2">¿Ofreces servicios para mascotas?</h1>
                            <p className="text-slate-600 mb-6">
                                Únete como proveedor y llega a miles de dueños de mascotas.
                                Ofrece tus servicios de veterinaria, paseos, grooming y más.
                            </p>
                            <Button
                                size="lg"
                                className="bg-teal-500 hover:bg-teal-600"
                                onClick={() => setIsRegistering(true)}
                            >
                                <span className="material-symbols-rounded mr-2">add_business</span>
                                Registrar mi negocio
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Registration form
    if (isRegistering) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Header session={session} />
                <div className="container mx-auto px-4 py-8 max-w-xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="material-symbols-rounded text-teal-500">add_business</span>
                                Registrar mi negocio
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Nombre del negocio *</label>
                                <Input
                                    placeholder="Ej: Veterinaria San Roque"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Ubicación *</label>
                                <Input
                                    placeholder="Ej: Palermo, Buenos Aires"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Descripción</label>
                                <Textarea
                                    placeholder="Cuéntanos sobre tu negocio..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsRegistering(false)}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 bg-teal-500 hover:bg-teal-600"
                                    onClick={handleRegister}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Registrando...' : 'Registrar'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Provider Dashboard - provider is guaranteed to be non-null at this point
    if (!provider) return null; // TypeScript guard

    return (
        <div className="min-h-screen bg-slate-50">
            <Header session={session} />
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Summary */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardContent className="p-6">
                                <div className="text-center mb-4">
                                    <div className="w-20 h-20 bg-teal-100 rounded-full mx-auto flex items-center justify-center mb-3">
                                        <span className="material-symbols-rounded text-4xl text-teal-600">storefront</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-800">{provider.businessName}</h2>
                                    <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
                                        <span className="material-symbols-rounded text-sm">location_on</span>
                                        {provider.location}
                                    </p>
                                </div>

                                <div className="flex justify-center gap-4 mb-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-teal-600">{provider.rating.toFixed(1)}</p>
                                        <p className="text-xs text-slate-500">Rating</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-slate-700">{provider.reviewCount}</p>
                                        <p className="text-xs text-slate-500">Reseñas</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-slate-700">{services.length}</p>
                                        <p className="text-xs text-slate-500">Servicios</p>
                                    </div>
                                </div>

                                {provider.description && (
                                    <p className="text-sm text-slate-600 text-center">{provider.description}</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Services & Appointments Tabs */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="appointments" className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="appointments">Citas</TabsTrigger>
                                <TabsTrigger value="services">Servicios</TabsTrigger>
                            </TabsList>

                            <TabsContent value="appointments">
                                <ProviderAppointments />
                            </TabsContent>

                            <TabsContent value="services">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-slate-800">Mis Servicios</h2>
                                    <Button
                                        className="bg-teal-500 hover:bg-teal-600"
                                        onClick={() => setAddServiceOpen(true)}
                                    >
                                        <span className="material-symbols-rounded mr-2">add</span>
                                        Agregar servicio
                                    </Button>
                                </div>

                                {services.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-8 text-center">
                                            <span className="material-symbols-rounded text-5xl text-slate-300 mb-2">work</span>
                                            <p className="text-slate-500">No tienes servicios aún.</p>
                                            <Button
                                                variant="link"
                                                className="text-teal-600 mt-2"
                                                onClick={() => setAddServiceOpen(true)}
                                            >
                                                Agregar tu primer servicio
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {services.map(service => (
                                            <Card key={service.id} className="hover:shadow-md transition-shadow">
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-semibold text-slate-800">{service.name}</h3>
                                                        <Badge variant="outline">{service.duration} min</Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">{service.description}</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-lg font-bold text-teal-600">
                                                            ${service.price.toLocaleString()}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {service._count?.appointments || 0} reservas
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Add Service Modal */}
            <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar nuevo servicio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700">Nombre del servicio *</label>
                            <Input
                                placeholder="Ej: Consulta veterinaria"
                                value={serviceName}
                                onChange={(e) => setServiceName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">Descripción *</label>
                            <Textarea
                                placeholder="Describe el servicio..."
                                value={serviceDesc}
                                onChange={(e) => setServiceDesc(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Precio ($) *</label>
                                <Input
                                    type="number"
                                    placeholder="1500"
                                    value={servicePrice}
                                    onChange={(e) => setServicePrice(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Duración (min) *</label>
                                <Input
                                    type="number"
                                    placeholder="60"
                                    value={serviceDuration}
                                    onChange={(e) => setServiceDuration(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddServiceOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-teal-500 hover:bg-teal-600"
                            onClick={handleAddService}
                            disabled={submitting}
                        >
                            {submitting ? 'Guardando...' : 'Guardar servicio'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
