interface StatsCardProps {
    petsCount: number;
    matchesCount: number;
}

export function StatsCard({ petsCount, matchesCount }: StatsCardProps) {
    return (
        <dl className="grid grid-cols-2 divide-x divide-border border-y border-border bg-surface text-center">
            <div className="p-4">
                <dd className="text-2xl font-bold text-primary">{petsCount}</dd>
                <dt className="text-xs text-slate-500">Mascotas</dt>
            </div>
            <div className="p-4">
                <dd className="text-2xl font-bold text-primary">{matchesCount}</dd>
                <dt className="text-xs text-slate-500">Encuentros</dt>
            </div>
        </dl>
    );
}
