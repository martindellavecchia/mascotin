'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useFetchWithError } from '@/hooks/useFetchWithError';

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
}

export default function SuggestedPets({ selectedPetId }: SuggestedPetsProps) {
    const [suggestions, setSuggestions] = useState<SuggestedPet[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionPetId, setActionPetId] = useState<string | null>(null);
    const { fetchWithError } = useFetchWithError();

    useEffect(() => {
        fetchSuggestions();
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
            toast.error('Selecciona una mascota primero');
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
                    toast.success('🎉 ¡Match! Conectaste con esta mascota');
                } else if (isLike) {
                    toast.success('❤️ Like enviado');
                }
                // Remove from suggestions
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

    const getPetEmoji = (petType: string) => {
        return petType === 'dog' ? '🐕' : petType === 'cat' ? '🐱' : '🐾';
    };

    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <span className="material-symbols-rounded text-teal-500">pets</span>
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
                        <span className="material-symbols-rounded text-teal-500">pets</span>
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
                    <span className="material-symbols-rounded text-teal-500">pets</span>
                    Amigos compatibles
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {suggestions.map((pet) => (
                    <div key={pet.id} className="flex items-center gap-3 group">
                        {/* Pet Avatar with Type Badge */}
                        <div className="relative">
                            <Avatar className="h-12 w-12 border-2 border-slate-100">
                                {pet.image ? (
                                    <AvatarImage src={pet.image} alt={pet.name} />
                                ) : (
                                    <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-600 text-white text-lg">
                                        {getPetEmoji(pet.petType)}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            {/* Pet Type Badge */}
                            <span className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full shadow-sm border border-slate-100 w-5 h-5 flex items-center justify-center">
                                {getPetEmoji(pet.petType)}
                            </span>
                        </div>

                        {/* Pet Info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">{pet.name}</p>
                            <p className="text-xs text-slate-500 truncate">
                                {pet.breed || pet.petType} • {pet.matchReason}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1">
                            {/* Dismiss Button */}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all h-8 w-8"
                                onClick={() => handleSwipe(pet.id, false)}
                                disabled={actionPetId === pet.id}
                                title="No me interesa"
                            >
                                <span className="material-symbols-rounded text-lg">heart_broken</span>
                            </Button>

                            {/* Like Button */}
                            <Button
                                size="icon"
                                variant="ghost"
                                className="text-pink-500 hover:bg-pink-50 hover:text-pink-600 transition-all h-8 w-8"
                                onClick={() => handleSwipe(pet.id, true)}
                                disabled={actionPetId === pet.id}
                                title="Me gusta"
                            >
                                {actionPetId === pet.id ? (
                                    <div className="w-4 h-4 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
                                ) : (
                                    <span className="material-symbols-rounded text-lg filled">favorite</span>
                                )}
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
