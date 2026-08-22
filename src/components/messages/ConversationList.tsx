'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { shouldUnoptimizeImage } from '@/lib/media';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { PawPrint, Search, Users } from 'lucide-react';
import type { MatchWithPet } from '@/types/messages';

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
}

export default function ConversationList({
    matches,
    groups,
    selectedId,
    selectedType,
    onSelect
}: ConversationListProps) {
    const [search, setSearch] = useState('');
    const normalizedSearch = search.trim().toLocaleLowerCase('es');
    const visibleMatches = normalizedSearch
        ? matches.filter((match) => `${match.name} ${match.breed || ''}`.toLocaleLowerCase('es').includes(normalizedSearch))
        : matches;
    const visibleGroups = normalizedSearch
        ? groups.filter((group) => `${group.name} ${group.description}`.toLocaleLowerCase('es').includes(normalizedSearch))
        : groups;

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-100 p-4">
                <h1 className="mb-3 text-lg font-bold text-foreground">Mensajes</h1>
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <Input
                        aria-label="Buscar conversaciones"
                        placeholder="Buscar conversaciones"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="min-h-11 bg-background pl-10 text-sm"
                    />
                </div>
            </div>

            <Tabs
                key={selectedType ?? 'none'}
                defaultValue={selectedType === 'group' ? 'groups' : 'matches'}
                className="flex min-h-0 min-w-0 flex-1 flex-col"
            >
                <div className="px-4">
                    <TabsList className="w-full">
                        <TabsTrigger value="matches" className="flex-1 text-xs">Chats</TabsTrigger>
                        <TabsTrigger value="groups" className="flex-1 text-xs">Grupos</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="matches" className="mt-2 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain outline-none">
                    {visibleMatches.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                            <PawPrint className="mb-2 size-10" aria-hidden="true" />
                            <p className="text-sm">{normalizedSearch ? 'No encontramos conversaciones.' : 'Todavía no tenés encuentros.'}</p>
                            {!normalizedSearch && (
                                <Button asChild size="sm" className="mt-4">
                                    <Link href="/inicio?tab=explore">Ir a Descubrir</Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        visibleMatches.map((match) => (
                            <button
                                type="button"
                                key={match.matchId}
                                onClick={() => onSelect(match.matchId, 'match')}
                                className={cn(
                                    "flex min-w-0 w-full cursor-pointer items-center gap-3 border-b border-slate-50 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500",
                                    selectedId === match.matchId && selectedType === 'match' ? 'bg-teal-50' : 'hover:bg-slate-50'
                                )}
                            >
                                <Avatar className="h-12 w-12 shrink-0">
                                    <AvatarImage src={match.primaryImageUrl || undefined} />
                                    <AvatarFallback className="bg-teal-100 text-teal-700">{match.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm truncate">{match.name}</p>
                                    <p className="truncate text-xs text-teal-600">{match.breed || 'Mascota'}</p>
                                    <p className="truncate text-sm text-slate-400">Abrir conversación</p>
                                </div>
                            </button>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="groups" className="mt-2 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain outline-none">
                    {visibleGroups.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                            <Users className="mb-2 size-10" aria-hidden="true" />
                            <p className="text-sm">{normalizedSearch ? 'No encontramos grupos.' : 'Todavía no pertenecés a ningún grupo.'}</p>
                            {!normalizedSearch && (
                                <Button asChild size="sm" className="mt-4">
                                    <Link href="/community/groups">Explorar grupos</Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        visibleGroups.map((group) => (
                            <button
                                type="button"
                                key={group.id}
                                onClick={() => onSelect(group.id, 'group')}
                                className={cn(
                                    "flex min-w-0 w-full cursor-pointer items-center gap-3 border-b border-slate-50 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500",
                                    selectedId === group.id && selectedType === 'group' ? 'bg-teal-50' : 'hover:bg-slate-50'
                                )}
                            >
                                <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                                    {group.image ? (
                                        <Image
                                            src={group.image}
                                            alt={group.name}
                                            width={48}
                                            height={48}
                                            unoptimized={shouldUnoptimizeImage(group.image)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-teal-100">
                                            <Users className="size-5 text-teal-300" aria-hidden="true" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm truncate">{group.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{group.description}</p>
                                </div>
                            </button>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
