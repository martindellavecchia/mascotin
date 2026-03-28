'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { LoadingSpinner } from '@/components/ui/loading';
import { toast } from 'sonner';

interface Stats {
    totalPets: number;
    totalMatches: number;
    totalSwipes: number;
    likesReceived: number;
}

export default function HomeStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const { fetchWithError } = useFetchWithError();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const result = await fetchWithError<{ stats: Stats }>('/api/stats');

        if (result.success && result.data) {
            setStats(result.data.stats);
        } else {
            toast.error('Error al cargar estadísticas');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                            <div className="h-12 bg-gray-200 rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const statItems = [
        {
            label: 'Mis Mascotas',
            value: stats.totalPets,
            icon: 'pets',
            color: 'text-teal-500',
            bgColor: 'bg-teal-50',
        },
        {
            label: 'Matches',
            value: stats.totalMatches,
            icon: 'favorite',
            color: 'text-rose-500',
            bgColor: 'bg-rose-50',
        },
        {
            label: 'Swipes',
            value: stats.totalSwipes,
            icon: 'swipe',
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-50',
        },
        {
            label: 'Likes Recibidos',
            value: stats.likesReceived,
            icon: 'star',
            color: 'text-purple-500',
            bgColor: 'bg-purple-50',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statItems.map((item, index) => (
                <Card
                    key={item.label}
                    className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-white shadow-sm"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${item.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                            <span className={`material-symbols-rounded text-2xl ${item.color}`}>{item.icon}</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-gray-800">{item.value}</p>
                            <p className="text-sm text-gray-500 font-medium">{item.label}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
