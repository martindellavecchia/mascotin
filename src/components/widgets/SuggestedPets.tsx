'use client';

import { useEffect, useRef, useState } from 'react';
import { Heart, HeartCrack, PawPrint } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PetTypeIcon } from '@/components/PetTypeIcon';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { getPetTypeLabel } from '@/lib/petTypeIcon';

interface SuggestedPet {
    id: string;
    name: string;
    petType: string;
    breed: string | null;
    image: string | null;
    matchScore: number;
    matchReason: string;
}

interface SuggestedPetsProps {
    selectedPetId?: string;
    initialSuggestions?: SuggestedPet[];
}

export default function SuggestedPets({
    selectedPetId,
    initialSuggestions,
}: SuggestedPetsProps) {
    const [suggestions, setSuggestions] = useState<SuggestedPet[]>(
        initialSuggestions || []
    );
    const [loading, setLoading] = useState(!initialSuggestions);
    const [actionPetId, setActionPetId] = useState<string | null>(null);
    const { fetchWithError } = useFetchWithError();
    const hasInitialForPet = useRef(Boolean(initialSuggestions));

    useEffect(() => {
        if (hasInitialForPet.current && initialSuggestions) {
            hasInitialForPet.current = false;
            setSuggestions(initialSuggestions);
            setLoading(false);
            return;
        }
        void fetchSuggestions();
    }, [selectedPetId]);

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            const params = selectedPetId ? `?petId=${selectedPetId}` : '';
            const result = await fetchWithError<{ suggestions: SuggestedPet[] }>(`/api/pets/suggestions${params}`);

            if (result.success && result.data) {
                setSuggestions(result.data.suggestions);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSwipe = async (toPetId: string, isLike: boolean) => {
        if (!selectedPetId) {
            toast.error('Seleccioná una mascota primero');
            return;
        }

        setActionPetId(toPetId);
        try {
            const res = await fetch('/api/swipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromPetId: selectedPetId,
                    toPetId,
                    isLike,
                }),
            });

            const data = await res.json();
            if (data.success) {
                if (isLike && data.matched) {
                    toast.success('¡Match! Conectaste con esta mascota');
                } else if (isLike) {
                    toast.success('Like enviado');
                }
                setSuggestions(prev => prev.filter(p => p.id !== toPetId));
            } else {
                toast.error(data.error || 'Error');
            }
        } catch (error) {
            toast.error('Error al procesar');
        } finally {
            setActionPetId(null);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <PawPrint className="text-teal-500" aria-hidden="true" />
                        Amigos compatibles
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-12 h-12 rounded-full bg-slate-200"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                                <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (suggestions.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <PawPrint className="text-teal-500" aria-hidden="true" />
                        Amigos compatibles
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500 text-center py-4">
                        No hay sugerencias por ahora. ¡Vuelve pronto!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <PawPrint className="text-teal-500" aria-hidden="true" />
                    Amigos compatibles
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {suggestions.map((pet) => (
                    <div key={pet.id} className="flex items-center gap-3 group">
                        <div className="relative">
                            <Avatar className="h-12 w-12 border-2 border-slate-100">
                                {pet.image ? (
                                    <AvatarImage src={pet.image} alt={pet.name} />
                                ) : (
                                    <AvatarFallback className="bg-teal-600 text-white">
                                        <PetTypeIcon petType={pet.petType} className="size-6 text-white" />
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <span className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-sm border border-slate-100 w-5 h-5 flex items-center justify-center">
                                <PetTypeIcon petType={pet.petType} className="size-3 text-teal-700" />
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">{pet.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                                {pet.breed || getPetTypeLabel(pet.petType)} • {pet.matchReason}
                            </p>
                        </div>

                        <div className="flex gap-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                                onClick={() => handleSwipe(pet.id, false)}
                                disabled={actionPetId === pet.id}
                                title="No me interesa"
                                aria-label="No me interesa"
                            >
                                <HeartCrack className="size-5" aria-hidden="true" />
                            </Button>

                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-teal-600 hover:bg-teal-50 hover:text-teal-700 transition-all"
                                onClick={() => handleSwipe(pet.id, true)}
                                disabled={actionPetId === pet.id}
                                title="Me gusta"
                                aria-label="Me gusta"
                            >
                                {actionPetId === pet.id ? (
                                    <div className="w-4 h-4 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
                                ) : (
                                    <Heart className="size-5 fill-current" aria-hidden="true" />
                                )}
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
