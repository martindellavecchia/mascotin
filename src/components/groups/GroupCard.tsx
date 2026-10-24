import Link from 'next/link';
import { UserRound, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { countLabel } from '@/lib/utils';

interface GroupCardProps {
    group: {
        id: string;
        name: string;
        description: string;
        image: string | null;
        _count: {
            members: number;
        };
        isMember?: boolean;
    };
    onJoin?: (id: string) => void;
}

export default function GroupCard({ group, onJoin }: GroupCardProps) {
    return (
        <Card className="h-full gap-0 overflow-hidden py-0 transition-colors hover:border-border-control">
            <div className="relative h-32 bg-muted">
                {group.image ? (
                    <img
                        src={group.image}
                        alt={group.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary-soft">
                        <Users className="size-10 text-primary/30" aria-hidden="true" />
                    </div>
                )}
            </div>
            <CardContent className="flex flex-1 flex-col p-4">
                <Link href={`/community/groups/${group.id}`} className="inline-flex min-h-11 w-full items-center hover:underline">
                    <h2 className="truncate text-lg font-semibold text-foreground">{group.name}</h2>
                </Link>
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <UserRound className="size-4" aria-hidden="true" />
                        {countLabel(group._count.members, 'miembro', 'miembros')}
                    </span>
                    {group.isMember && <Badge variant="verified">Miembro</Badge>}
                </div>
                <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground">
                    {group.description}
                </p>
                {onJoin && !group.isMember ? (
                    <Button
                        onClick={() => onJoin(group.id)}
                        className="w-full"
                        variant="tonal"
                    >
                        Unirse
                    </Button>
                ) : (
                    <Button asChild className="w-full" variant="outline">
                        <Link href={`/community/groups/${group.id}`}>
                            Ver grupo
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
