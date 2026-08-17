'use client';

import { CalendarDays, CircleHelp, Images, LayoutGrid, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedFiltersProps {
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

export default function FeedFilters({ activeFilter, onFilterChange }: FeedFiltersProps) {
    const filters: { id: string; label: string; icon: LucideIcon }[] = [
        { id: 'all', label: 'Todo', icon: LayoutGrid },
        { id: 'photos', label: 'Fotos', icon: Images },
        { id: 'events', label: 'Eventos', icon: CalendarDays },
        { id: 'questions', label: 'Preguntas', icon: CircleHelp },
    ];

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {filters.map((filter) => {
                const Icon = filter.icon;
                return (
                <Button
                    key={filter.id}
                    variant={activeFilter === filter.id ? 'default' : 'outline'}
                    size="sm"
                    className={`rounded-full px-4 h-9 flex items-center gap-2 whitespace-nowrap ${activeFilter === filter.id
                            ? 'bg-teal-500 hover:bg-teal-600 text-white border-transparent'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                    onClick={() => onFilterChange(filter.id)}
                >
                    <Icon className={`size-5 ${activeFilter === filter.id ? '' : 'text-slate-400'}`} aria-hidden="true" />
                    {filter.label}
                </Button>
                );
            })}
        </div>
    );
}
