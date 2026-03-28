import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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
        <Card className="h-full hover:shadow-md transition-shadow">
            <div className="h-32 bg-slate-100 relative">
                {group.image ? (
                    <img
                        src={group.image}
                        alt={group.name}
                        className="w-full h-full object-cover rounded-t-lg"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-50 rounded-t-lg">
                        <span className="material-symbols-rounded text-4xl text-teal-200">groups</span>
                    </div>
                )}
                {group.isMember && (
                    <Badge className="absolute top-2 right-2 bg-white text-teal-600 hover:bg-white/90">
                        Miembro
                    </Badge>
                )}
            </div>
            <CardContent className="p-4">
                <Link href={`/community/groups/${group.id}`} className="hover:underline">
                    <h3 className="font-bold text-lg text-slate-900 truncate">{group.name}</h3>
                </Link>
                <div className="flex items-center text-xs text-slate-500 mt-1 mb-3 gap-2">
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-rounded text-sm">person</span>
                        {group._count.members} miembros
                    </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4 h-10">
                    {group.description}
                </p>
                {onJoin && !group.isMember ? (
                    <Button
                        onClick={() => onJoin(group.id)}
                        className="w-full bg-teal-50 text-teal-600 hover:bg-teal-100 border-teal-200"
                        variant="outline"
                    >
                        Unirse
                    </Button>
                ) : (
                    <Link href={`/community/groups/${group.id}`} className="w-full block">
                        <Button className="w-full bg-slate-100 text-slate-600 hover:bg-slate-200" variant="ghost">
                            Ver Grupo
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
