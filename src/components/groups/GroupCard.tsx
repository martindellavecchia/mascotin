import Link from 'next/link';
import { UserRound, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
        <Card className="h-full overflow-hidden transition-colors hover:border-primary/35">
            <div className="h-32 bg-slate-100 relative">
                {group.image ? (
                    <img
                        src={group.image}
                        alt={group.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary-soft">
                        <Users className="size-10 text-teal-200" aria-hidden="true" />
                    </div>
                )}
                {group.isMember && (
                    <Badge variant="verified" className="absolute right-2 top-2">
                        Miembro
                    </Badge>
                )}
            </div>
            <CardContent className="p-4">
                <Link href={`/community/groups/${group.id}`} className="inline-flex min-h-11 w-full items-center hover:underline">
                    <h3 className="font-bold text-lg text-slate-900 truncate">{group.name}</h3>
                </Link>
                <div className="flex items-center text-xs text-slate-500 mt-1 mb-3 gap-2">
                    <span className="flex items-center gap-1">
                        <UserRound className="size-4" aria-hidden="true" />
                        {group._count.members} miembros
                    </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10">
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
