'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickActionsProps {
    showTitle?: boolean;
    compact?: boolean;
}

export default function QuickActions({ showTitle = true, compact = false }: QuickActionsProps) {
    const router = useRouter();

    const actions = [
        { icon: 'favorite', label: 'Match', color: 'bg-rose-50 text-rose-600', href: '/?tab=explore' },
        { icon: 'vaccines', label: 'Vet', color: 'bg-teal-50 text-teal-600', href: '/shop?category=vet' },
        { icon: 'directions_walk', label: 'Paseo', color: 'bg-orange-50 text-orange-600', href: '/shop?category=paseo' },
        { icon: 'store', label: 'Tienda', color: 'bg-blue-50 text-blue-600', href: '/shop' },
        { icon: 'content_cut', label: 'Grooming', color: 'bg-pink-50 text-pink-600', href: '/shop?category=grooming' },
    ];

    if (compact) {
        return (
            <div className="flex items-center justify-center gap-4 py-2">
                {actions.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => router.push(action.href)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                        title={action.label}
                        aria-label={action.label}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.color}`}>
                            <span className="material-symbols-rounded text-lg">{action.icon}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">{action.label}</span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <Card>
            {showTitle && (
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Acciones Rápidas</CardTitle>
                </CardHeader>
            )}
            <CardContent className={!showTitle ? 'pt-4' : ''}>
                <div className="grid grid-cols-5 gap-2">
                    {actions.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => router.push(action.href)}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                            aria-label={action.label}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                                <span className="material-symbols-rounded text-xl">{action.icon}</span>
                            </div>
                            <span className="text-xs text-slate-600 font-medium">{action.label}</span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
