'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useFetchWithError } from '@/hooks/useFetchWithError';

interface Provider {
    id: string;
    businessName: string;
    location: string;
    rating: number;
    reviewCount: number;
}

export default function SuggestedProviders() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const { fetchWithError } = useFetchWithError();

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        const result = await fetchWithError<{ services: Array<{ provider: Provider }> }>('/api/services');

        if (result.success && result.data) {
            const uniqueProviders = new Map<string, Provider>();
            result.data.services.forEach((service) => {
                if (service.provider && !uniqueProviders.has(service.provider.id)) {
                    uniqueProviders.set(service.provider.id, service.provider);
                }
            });
            setProviders(Array.from(uniqueProviders.values()).slice(0, 3));
        }
        setLoading(false);
    };

    const getColor = (index: number) => {
        const colors = ['bg-teal-500', 'bg-blue-500', 'bg-orange-500'];
        return colors[index % colors.length];
    };

    if (loading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Sugeridos para ti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                            <div className="w-10 h-10 rounded-full bg-slate-200"></div>
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

    if (providers.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Sugeridos para ti</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-500 text-center py-4">
                        No hay proveedores disponibles aún.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Sugeridos para ti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {providers.map((provider, index) => (
                    <div key={provider.id} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className={`${getColor(index)} text-white text-sm`}>
                                {provider.businessName[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-800 truncate">{provider.businessName}</p>
                            <p className="text-xs text-slate-500">
                                {provider.location} • <span className="text-amber-500">★</span> {provider.rating.toFixed(1)}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="text-teal-600 hover:bg-teal-50">
                            <span className="material-symbols-rounded text-xl">add</span>
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
