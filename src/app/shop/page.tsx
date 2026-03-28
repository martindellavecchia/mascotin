'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import QuickActions from '@/components/widgets/QuickActions';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useFetchWithError } from '@/hooks/useFetchWithError';

interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    provider: {
        id: string;
        businessName: string;
        location: string;
        rating: number;
        reviewCount: number;
    };
}

interface Pet {
    id: string;
    name: string;
}

export default function ShopPage() {
    const { data: session } = useSession();
    const [services, setServices] = useState<Service[]>([]);
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [minRating, setMinRating] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sortBy, setSortBy] = useState('rating');
    const { fetchWithError } = useFetchWithError();

    const [bookingOpen, setBookingOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedPetId, setSelectedPetId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [bookingLoading, setBookingLoading] = useState(false);

    useEffect(() => {
        fetchPets();
    }, []);

    const fetchServices = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (minRating && minRating !== '_all') params.set('minRating', minRating);
        if (maxPrice && maxPrice !== '_all') params.set('maxPrice', maxPrice);
        if (sortBy) params.set('sortBy', sortBy);

        const result = await fetchWithError<{ services: Service[] }>(`/api/services?${params.toString()}`);
        if (result.success && result.data) {
            setServices(result.data.services || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchServices();
    }, [searchTerm, minRating, maxPrice, sortBy]);

    const fetchPets = async () => {
        const result = await fetchWithError<{ pets: Pet[] }>('/api/pet/mine');
        if (result.success && result.data) {
            setPets(result.data.pets || []);
        }
    };

    const openBookingModal = (service: Service) => {
        setSelectedService(service);
        setSelectedPetId(pets[0]?.id || '');
        setSelectedDate('');
        setBookingOpen(true);
    };

    const handleBooking = async () => {
        if (!selectedService || !selectedPetId || !selectedDate) {
            toast.error('Completa todos los campos');
            return;
        }

        setBookingLoading(true);
        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId: selectedService.id,
                    petId: selectedPetId,
                    date: selectedDate,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success('¡Cita reservada exitosamente!');
                setBookingOpen(false);
            } else {
                toast.error(data.error || 'Error al reservar');
            }
        } catch (error) {
            toast.error('Error al reservar la cita');
        } finally {
            setBookingLoading(false);
        }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.provider.businessName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getServiceIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('vet') || lower.includes('vacun')) return 'vaccines';
        if (lower.includes('paseo') || lower.includes('walk')) return 'directions_walk';
        if (lower.includes('groom') || lower.includes('baño') || lower.includes('corte')) return 'content_cut';
        if (lower.includes('hotel') || lower.includes('guard')) return 'hotel';
        return 'pets';
    };

    const getServiceColor = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('vet') || lower.includes('vacun')) return 'bg-teal-50 text-teal-600';
        if (lower.includes('paseo') || lower.includes('walk')) return 'bg-orange-50 text-orange-600';
        if (lower.includes('groom') || lower.includes('baño')) return 'bg-pink-50 text-pink-600';
        return 'bg-blue-50 text-blue-600';
    };

    // Generate next 7 days for date selection
    const getNextDays = () => {
        const days = [];
        for (let i = 1; i <= 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            date.setHours(10, 0, 0, 0);
            days.push({
                value: date.toISOString(),
                label: date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' 10:00',
            });
        }
        return days;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Header session={session} />

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="mb-8 text-center">
                            <h1 className="text-3xl font-bold text-slate-800 mb-2">Servicios para tu Mascota</h1>
                            <p className="text-slate-600">Encuentra veterinarios, paseadores y más.</p>

                            <div className="max-w-xl mx-auto mt-6 relative">
                                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <Input
                                    placeholder="Buscar servicios..."
                                    className="pl-12 h-12 rounded-full shadow-sm border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                                <Select value={minRating} onValueChange={setMinRating}>
                                    <SelectTrigger className="w-[140px] bg-white">
                                        <SelectValue placeholder="Rating mínimo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_all">Todos</SelectItem>
                                        <SelectItem value="4.5">⭐ 4.5+</SelectItem>
                                        <SelectItem value="4">⭐ 4.0+</SelectItem>
                                        <SelectItem value="3.5">⭐ 3.5+</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={maxPrice} onValueChange={setMaxPrice}>
                                    <SelectTrigger className="w-[140px] bg-white">
                                        <SelectValue placeholder="Precio máx" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_all">Sin límite</SelectItem>
                                        <SelectItem value="2000">Hasta $2.000</SelectItem>
                                        <SelectItem value="3500">Hasta $3.500</SelectItem>
                                        <SelectItem value="5000">Hasta $5.000</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-[160px] bg-white">
                                        <SelectValue placeholder="Ordenar por" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rating">Mejor valorado</SelectItem>
                                        <SelectItem value="price_asc">Precio: menor</SelectItem>
                                        <SelectItem value="price_desc">Precio: mayor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
                            </div>
                        ) : filteredServices.length === 0 ? (
                            <Card className="max-w-md mx-auto">
                                <CardContent className="p-8 text-center">
                                    <span className="material-symbols-rounded text-5xl text-slate-300 mb-4">store</span>
                                    <h3 className="font-semibold text-slate-800 mb-2">No hay servicios disponibles</h3>
                                    <p className="text-sm text-slate-500">
                                        {searchTerm ? 'Intenta con otra búsqueda' : 'Los proveedores aún no han publicado servicios'}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredServices.map((service) => (
                                    <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                        <CardContent className="p-0">
                                            <div className="p-5">
                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getServiceColor(service.name)}`}>
                                                        <span className="material-symbols-rounded text-xl">{getServiceIcon(service.name)}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-slate-800">{service.name}</h3>
                                                        <p className="text-sm text-slate-500">{service.provider.businessName}</p>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{service.description}</p>

                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="text-amber-500 material-symbols-rounded text-sm filled">star</span>
                                                    <span className="text-sm font-medium">{service.provider.rating.toFixed(1)}</span>
                                                    <span className="text-sm text-slate-400">({service.provider.reviewCount} reseñas)</span>
                                                    <Badge variant="outline" className="ml-auto text-xs">
                                                        {service.duration} min
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                    <div>
                                                        <span className="text-2xl font-bold text-teal-600">${service.price.toLocaleString()}</span>
                                                    </div>
                                                    <Button
                                                        className="bg-teal-500 hover:bg-teal-600"
                                                        onClick={() => openBookingModal(service)}
                                                    >
                                                        Reservar
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar: Quick Actions */}
                    <div className="lg:col-span-1 hidden lg:block">
                        <div className="sticky top-24">
                            <QuickActions />
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reservar Cita</DialogTitle>
                    </DialogHeader>

                    {selectedService && (
                        <div className="space-y-4 py-4">
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="font-semibold text-slate-800">{selectedService.name}</p>
                                <p className="text-sm text-slate-500">{selectedService.provider.businessName}</p>
                                <p className="text-lg font-bold text-teal-600 mt-2">${selectedService.price.toLocaleString()}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Mascota</label>
                                <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una mascota" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pets.map(pet => (
                                            <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Fecha y hora</label>
                                <Select value={selectedDate} onValueChange={setSelectedDate}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona fecha" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getNextDays().map(day => (
                                            <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancelar</Button>
                        <Button
                            className="bg-teal-500 hover:bg-teal-600"
                            onClick={handleBooking}
                            disabled={bookingLoading || !selectedPetId || !selectedDate}
                        >
                            {bookingLoading ? 'Reservando...' : 'Confirmar Reserva'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
