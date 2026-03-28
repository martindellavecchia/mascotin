'use client';

import { useEffect, useState } from 'react';
import { Pet } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { toast } from 'sonner';

interface PetProfileSidebarProps {
    pet: Pet | null;
    pets?: Pet[];
    selectedPetId?: string;
    onSelectPet?: (petId: string) => void;
    onEdit?: () => void;
}

interface HealthRecord {
    id: string;
    type: string;
    name: string;
    dueDate: string | null;
}

// Helper to parse images safely
function getFirstImage(images: string | string[] | undefined | null): string | null {
    if (!images) return null;

    // If it's already an array
    if (Array.isArray(images)) {
        return images.length > 0 ? images[0] : null;
    }

    // If it's a JSON string
    if (typeof images === 'string') {
        try {
            const parsed = JSON.parse(images);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed[0];
            }
        } catch {
            // If it's just a URL string
            if (images.startsWith('http') || images.startsWith('/')) {
                return images;
            }
        }
    }

    return null;
}

export default function PetProfileSidebar({ pet, pets, selectedPetId, onSelectPet, onEdit }: PetProfileSidebarProps) {
    const router = useRouter();
    const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
    const [loadingHealth, setLoadingHealth] = useState(false);
    const { fetchWithError } = useFetchWithError();

    useEffect(() => {
        if (pet?.id) {
            fetchHealthRecords(pet.id);
        }
    }, [pet?.id]);

    const fetchHealthRecords = async (petId: string) => {
        setLoadingHealth(true);
        const result = await fetchWithError<{ healthRecords: HealthRecord[] }>(`/api/pet/health?petId=${petId}`);

        if (result.success && result.data) {
            setHealthRecords(result.data.healthRecords || []);
        }
        setLoadingHealth(false);
    };

    const getDaysUntil = (dateStr: string | null) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    if (!pet) {
        return (
            <Card className="p-6 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="material-symbols-rounded text-slate-400 text-3xl">pets</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Sin Mascota Activa</h3>
                <p className="text-sm text-slate-500 mb-4">Selecciona o registra una mascota.</p>
                <Button
                    onClick={() => router.push('/create-pet')}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                >
                    Registrar Mascota
                </Button>
            </Card>
        );
    }

    const ageDisplay = pet.age ? `${pet.age} años` : '-- años';
    const weightDisplay = pet.weight ? `${pet.weight}kg` : '-- kg';
    const nextHealthRecord = healthRecords[0];
    const daysUntil = nextHealthRecord ? getDaysUntil(nextHealthRecord.dueDate) : null;
    const petImage = getFirstImage(pet.images);

    return (
        <div className="space-y-4">
            {/* Pet Selector (if multiple pets) */}
            {pets && pets.length > 1 && onSelectPet && (
                <Card className="p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Mis Mascotas</p>
                    <div className="flex gap-3">
                        {pets.map(p => {
                            const img = getFirstImage(p.images);
                            const isSelected = p.id === selectedPetId;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => onSelectPet(p.id)}
                                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all min-w-[70px] ${isSelected
                                        ? 'bg-teal-50 border-2 border-teal-500'
                                        : 'border-2 border-transparent hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`w-11 h-11 rounded-full overflow-hidden ${isSelected ? 'ring-2 ring-teal-500 ring-offset-2' : ''
                                        }`}>
                                        {img ? (
                                            <img src={img} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold">
                                                {p.name[0]}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-xs font-medium truncate max-w-[60px] ${isSelected ? 'text-teal-600' : 'text-slate-600'
                                        }`}>
                                        {p.name}
                                    </span>
                                    {isSelected && (
                                        <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Main Pet Card */}
            <Card className="p-6 flex flex-col items-center">
                {/* Profile Image */}
                <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 p-1">
                        <Avatar className="w-full h-full border-4 border-white">
                            {petImage ? (
                                <AvatarImage src={petImage} className="object-cover" />
                            ) : (
                                <AvatarFallback className="bg-slate-100 text-2xl text-slate-600">
                                    {pet.name[0]}
                                </AvatarFallback>
                            )}
                        </Avatar>
                    </div>
                    <button
                        onClick={onEdit}
                        className="absolute bottom-0 right-0 p-1.5 bg-teal-500 text-white rounded-full shadow-md hover:bg-teal-600 transition-colors"
                    >
                        <span className="material-symbols-rounded text-sm">edit</span>
                    </button>
                </div>

                {/* Info */}
                <h2 className="text-xl font-bold text-slate-800">{pet.name}</h2>
                <p className="text-teal-600 font-medium text-sm mb-3">{pet.breed || 'Sin raza especificada'}</p>

                {/* Bio */}
                {pet.bio && (
                    <p className="text-sm text-slate-600 text-center mb-4 line-clamp-2 px-2">
                        {pet.bio}
                    </p>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50">
                        <span className="text-lg font-bold text-slate-800">{weightDisplay}</span>
                        <span className="text-xs text-slate-500">Peso</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-xl bg-slate-50">
                        <span className="text-lg font-bold text-slate-800">{ageDisplay}</span>
                        <span className="text-xs text-slate-500">Edad</span>
                    </div>
                </div>
            </Card>

            {/* Health Alert Widget */}
            {nextHealthRecord && daysUntil !== null && daysUntil <= 30 ? (
                <Card className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 bg-orange-100 text-orange-500 rounded-lg shrink-0">
                            <span className="material-symbols-rounded text-lg">warning</span>
                        </div>
                        <div>
                            <h4 className="font-semibold text-orange-600 text-xs uppercase tracking-wide">Alerta de Salud</h4>
                            <p className="font-medium text-slate-800 text-sm">{nextHealthRecord.name}</p>
                            <p className="text-xs text-slate-500">
                                {daysUntil <= 0 ? '¡Vencido!' : `Vence en ${daysUntil} día${daysUntil > 1 ? 's' : ''}`}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.push('/shop')}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm"
                    >
                        Agendar Veterinario
                    </Button>
                </Card>
            ) : (
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                            <span className="material-symbols-rounded text-lg">check_circle</span>
                        </div>
                        <div>
                            <p className="font-medium text-slate-800 text-sm">Salud al día</p>
                            <p className="text-xs text-slate-500">No hay alertas pendientes</p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
