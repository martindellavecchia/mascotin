interface StatsCardProps {
    petsCount: number;
    matchesCount?: number;
}

export function StatsCard({ petsCount, matchesCount }: StatsCardProps) {
    return (
        <dl className="grid grid-cols-2 divide-x divide-border border-y border-border bg-surface text-center">
            <div className="p-4">
                <dd className="text-2xl font-bold text-primary">{petsCount}</dd>
                <dt className="text-xs text-muted-foreground">Mascotas</dt>
            </div>
            <div className="p-4">
                <dd className="text-2xl font-bold text-primary" aria-label={matchesCount === undefined ? 'Encuentros no disponibles' : undefined}>{matchesCount ?? '—'}</dd>
                <dt className="text-xs text-muted-foreground">Encuentros</dt>
            </div>
        </dl>
    );
}
