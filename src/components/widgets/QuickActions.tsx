'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays, HandHeart, Search, Store, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickActionsProps {
    showTitle?: boolean;
    compact?: boolean;
}

export default function QuickActions({ showTitle = true, compact = false }: QuickActionsProps) {
    const router = useRouter();

    const actions: Array<{ icon: LucideIcon; label: string; color: string; href: string }> = [
        { icon: Search, label: 'Descubrir', color: 'bg-teal-50 text-teal-700', href: '/inicio?tab=explore' },
        { icon: Store, label: 'Servicios', color: 'bg-slate-100 text-slate-700', href: '/shop' },
        { icon: HandHeart, label: 'Hogares', color: 'bg-orange-50 text-orange-700', href: '/hogares-de-transito' },
        { icon: CalendarDays, label: 'Eventos', color: 'bg-teal-50 text-teal-700', href: '/community/events' },
    ];

    if (compact) {
        return (
            <div className="flex flex-wrap items-center justify-center gap-2 py-2 sm:gap-4">
                {actions.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => router.push(action.href)}
                        className="flex min-h-11 min-w-16 flex-1 basis-16 flex-col items-center gap-1 rounded-xl p-2 transition-colors hover:bg-slate-100"
                        title={action.label}
                        aria-label={action.label}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.color}`}>
                            <action.icon className="size-5" aria-hidden="true" />
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
                <div className="grid grid-cols-2 gap-2">
                    {actions.map((action) => (
                        <button
                            key={action.label}
                            onClick={() => router.push(action.href)}
                            className="flex min-h-20 min-w-0 flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-slate-50"
                            aria-label={action.label}
                        >
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}>
                                <action.icon className="size-6" aria-hidden="true" />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{action.label}</span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
