'use client';

import { Button } from '@/components/ui/button';

interface FeedFiltersProps {
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

export default function FeedFilters({ activeFilter, onFilterChange }: FeedFiltersProps) {
    const filters = [
        { id: 'all', label: 'Todo', icon: 'apps' },
        { id: 'photos', label: 'Fotos', icon: 'photo_library' },
        { id: 'events', label: 'Eventos', icon: 'event' },
        { id: 'questions', label: 'Preguntas', icon: 'help' },
    ];

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {filters.map(filter => (
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
                    <span className={`material-symbols-rounded text-lg ${activeFilter === filter.id ? '' : 'text-slate-400'}`}>
                        {filter.icon}
                    </span>
                    {filter.label}
                </Button>
            ))}
        </div>
    );
}
