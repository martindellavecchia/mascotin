'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Pet } from '@/types';
import Image from 'next/image';
import { toast } from 'sonner';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { getPetTypeIcon, getPetTypeLabel } from '@/lib/petTypeIcon';
import { getPrimaryImageUrl, isRenderableImage, shouldUnoptimizeImage } from '@/lib/media';

export default function TrendingPets() {
    const router = useRouter();
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const { fetchWithError } = useFetchWithError();

    useEffect(() => {
        fetchTrendingPets();
    }, []);

    const fetchTrendingPets = async () => {
        const result = await fetchWithError<{ pets: Pet[] }>('/api/pets/trending');

        if (result.success && result.data) {
            setPets(result.data.pets || []);
        } else {
            toast.error('Error al cargar mascotas en tendencia');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-rounded w-5 h-5 text-orange-500">trending_up</span>
                        Mascotas en tendencia
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-32 bg-gray-200 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (pets.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="material-symbols-rounded w-5 h-5 text-orange-500">trending_up</span>
                        Mascotas en tendencia
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500 text-center py-8">
                        Aún no hay mascotas en tendencia. Sé el primero en registrar una.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="material-symbols-rounded w-5 h-5 text-orange-500">trending_up</span>
                    Mascotas en tendencia
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {pets.map((pet, index) => {
                        const firstImage = getPrimaryImageUrl(pet.images, pet.thumbnailIndex);
                        const showImage = isRenderableImage(firstImage);

                        return (
                            <Card
                                key={pet.id}
                                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                                onClick={() => {
                                    toast.info(`¡Explorando ${pet.name}!`, { duration: 2000 });
                                    // Switch to explore tab - the main page will handle showing this pet
                                    router.push('/?tab=explore');
                                }}
                            >
                                <div className="relative h-28 bg-gradient-to-br from-orange-100 to-yellow-100">
                                    {showImage ? (
                                        <Image
                                            src={firstImage}
                                            alt={pet.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform"
                                            sizes="(max-width: 768px) 50vw, 220px"
                                            unoptimized={shouldUnoptimizeImage(firstImage)}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-rounded text-4xl text-teal-600">
                                              {getPetTypeIcon(pet.petType)}
                                            </span>
                                        </div>
                                    )}
                                    {index < 3 && (
                                        <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-700'
                                            }`}>
                                            {index + 1}
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-slate-900/70 text-white px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1">
                                        <span className="material-symbols-rounded text-xs">emoji_events</span>
                                        {pet.level}
                                    </div>
                                </div>
                                <CardContent className="p-3">
                                    <h3 className="font-semibold text-sm truncate">{pet.name}</h3>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs text-gray-500">{getPetTypeLabel(pet.petType)}</span>
                                        <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700">
                                            <span className="material-symbols-rounded text-xs mr-1">favorite</span>
                                            {pet.totalMatches}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
