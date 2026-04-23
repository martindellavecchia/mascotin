'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFetchWithError } from '@/hooks/useFetchWithError';

interface LostPet {
    id: string;
    content: string;
    images: string;
    primaryImageUrl?: string | null;
    contactPhone: string | null;
    lastSeenLocation: string | null;
    createdAt: string;
    pet?: {
        name: string;
        images: string;
        primaryImageUrl?: string | null;
        petType: string;
    };
    author: {
        name: string | null;
    };
}

export default function LostPetWidget() {
    const router = useRouter();
    const [lostPets, setLostPets] = useState<LostPet[]>([]);
    const [loading, setLoading] = useState(true);
    const { fetchWithError } = useFetchWithError();

    useEffect(() => {
        fetchLostPets();
    }, []);

    const fetchLostPets = async () => {
        const result = await fetchWithError<{ lostPets: LostPet[] }>('/api/posts/lost?limit=3');

        if (result.success && result.data) {
            setLostPets(result.data.lostPets);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <Card className="border-red-200 bg-red-50/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                        <span className="material-symbols-rounded">emergency</span>
                        Mascotas Perdidas
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 animate-pulse">
                        <div className="w-14 h-14 rounded-lg bg-red-200/50"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-red-200/50 rounded w-2/3"></div>
                            <div className="h-2 bg-red-200/50 rounded w-1/2"></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (lostPets.length === 0) {
        return (
            <Card className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700">
                        <span className="material-symbols-rounded">check_circle</span>
                        Sin alertas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-green-600">
                        No hay mascotas perdidas reportadas.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full border-green-300 text-green-700 hover:bg-green-100"
                        onClick={() => router.push('/community?report=lost')}
                    >
                        <span className="material-symbols-rounded mr-2 text-sm">add_alert</span>
                        Reportar mascota
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                    <span className="material-symbols-rounded animate-pulse">emergency</span>
                    Mascotas Perdidas
                    <Badge className="bg-red-500 text-white text-xs ml-auto">
                        {lostPets.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {lostPets.slice(0, 2).map((pet) => {
                    const image = pet.pet?.primaryImageUrl || pet.primaryImageUrl || null;
                    return (
                        <div
                            key={pet.id}
                            className="flex items-start gap-3 p-2 rounded-lg bg-white/70 border border-red-100 hover:bg-white transition-colors cursor-pointer"
                            onClick={() => router.push(`/community?post=${pet.id}`)}
                        >
                            <Avatar className="h-14 w-14 rounded-lg border-2 border-red-200">
                                {image ? (
                                    <AvatarImage src={image} className="object-cover" />
                                ) : (
                                    <AvatarFallback className="bg-red-100 text-red-600 text-xl rounded-lg">
                                        🐾
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 truncate">
                                    {pet.pet?.name || 'Mascota sin nombre'}
                                </p>
                                {pet.lastSeenLocation && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                        <span className="material-symbols-rounded text-sm">location_on</span>
                                        {pet.lastSeenLocation}
                                    </p>
                                )}
                                {pet.contactPhone && (
                                    <p className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                                        <span className="material-symbols-rounded text-sm">call</span>
                                        {pet.contactPhone}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}

                <div className="flex gap-2 pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-100"
                        onClick={() => router.push('/community?filter=lost_pet')}
                    >
                        Ver todas
                    </Button>
                    <Button
                        size="sm"
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => router.push('/community?report=lost')}
                    >
                        <span className="material-symbols-rounded mr-1 text-sm">add_alert</span>
                        Reportar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
