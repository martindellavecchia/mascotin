'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MatchWithPet {
    id: string;
    matchId: string;
    name: string;
    breed?: string;
    images: string;
}

interface Group {
    id: string;
    name: string;
    description: string;
    image: string | null;
}

interface ConversationListProps {
    matches: MatchWithPet[];
    groups: Group[];
    selectedId: string | null;
    selectedType: 'match' | 'group' | null;
    onSelect: (id: string, type: 'match' | 'group') => void;
    currentUserId: string;
}

export default function ConversationList({
    matches,
    groups,
    selectedId,
    selectedType,
    onSelect,
    currentUserId
}: ConversationListProps) {
    const getFirstImage = (images: string): string | undefined => {
        try {
            const parsed = JSON.parse(images);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : undefined;
        } catch {
            return undefined;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 mb-3">Mensajes</h2>
                <div className="relative mb-3">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-rounded text-lg">search</span>
                    <Input placeholder="Buscar..." className="pl-10 bg-slate-50 border-slate-200 rounded-full h-9 text-sm" />
                </div>
            </div>

            <Tabs defaultValue="matches" className="flex-1 flex flex-col">
                <div className="px-4">
                    <TabsList className="w-full bg-slate-100 p-1">
                        <TabsTrigger value="matches" className="flex-1 text-xs">Chats</TabsTrigger>
                        <TabsTrigger value="groups" className="flex-1 text-xs">Grupos</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="matches" className="flex-1 overflow-y-auto mt-2 outline-none">
                    {matches.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                            <span className="material-symbols-rounded text-4xl mb-2">pets</span>
                            <p className="text-sm">No tienes matches aún.</p>
                        </div>
                    ) : (
                        matches.map((match) => (
                            <div
                                key={match.matchId}
                                onClick={() => onSelect(match.matchId, 'match')}
                                className={cn(
                                    "flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-slate-50",
                                    selectedId === match.matchId && selectedType === 'match' ? 'bg-teal-50' : 'hover:bg-slate-50'
                                )}
                            >
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={getFirstImage(match.images)} />
                                    <AvatarFallback className="bg-teal-100 text-teal-700">{match.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm truncate">{match.name}</p>
                                    <p className="text-xs text-teal-600">{match.breed || 'Mascota'}</p>
                                    <p className="text-sm text-slate-400 truncate">Toca para chatear...</p>
                                </div>
                            </div>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="groups" className="flex-1 overflow-y-auto mt-2 outline-none">
                    {groups.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                            <span className="material-symbols-rounded text-4xl mb-2">groups</span>
                            <p className="text-sm">No perteneces a ningún grupo.</p>
                        </div>
                    ) : (
                        groups.map((group) => (
                            <div
                                key={group.id}
                                onClick={() => onSelect(group.id, 'group')}
                                className={cn(
                                    "flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-slate-50",
                                    selectedId === group.id && selectedType === 'group' ? 'bg-teal-50' : 'hover:bg-slate-50'
                                )}
                            >
                                <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                                    {group.image ? (
                                        <Image src={group.image} alt={group.name} width={48} height={48} unoptimized className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-teal-100">
                                            <span className="material-symbols-rounded text-teal-300">groups</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm truncate">{group.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{group.description}</p>
                                </div>
                            </div>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
