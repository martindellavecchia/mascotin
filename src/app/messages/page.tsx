'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import ConversationList from '@/components/messages/ConversationList';
import ChatWindow from '@/components/messages/ChatWindow';
import GroupChat from '@/components/groups/GroupChat';
import QuickActions from '@/components/widgets/QuickActions';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { LoadingSpinner } from '@/components/ui/loading';
import type { MatchWithPet } from '@/types/messages';

interface Group {
    id: string;
    name: string;
    description: string;
    image: string | null;
}

interface GroupListItem extends Group {
    isMember?: boolean;
}

export default function MessagesPage() {
    const { data: session } = useSession();
    const [matches, setMatches] = useState<MatchWithPet[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<'match' | 'group' | null>(null);
    const [loading, setLoading] = useState(true);
    const { fetchWithError } = useFetchWithError();

    useEffect(() => {
        if (session?.user?.id) {
            fetchData();
        }
    }, [session?.user?.id]);

    const fetchData = async () => {
        setLoading(true);
        const [matchesResult, groupsResult] = await Promise.all([
            fetchWithError<{ matches: MatchWithPet[] }>('/api/matches'),
            fetchWithError<{ groups: GroupListItem[] }>(`/api/groups?userId=${session?.user?.id}`)
        ]);

        if (matchesResult.success && matchesResult.data) {
            setMatches(matchesResult.data.matches);
        }
        if (groupsResult.success && groupsResult.data) {
            setGroups(groupsResult.data.groups.filter((g) => g.isMember));
        }
        setLoading(false);
    };

    const handleSelect = (id: string, type: 'match' | 'group') => {
        setSelectedId(id);
        setSelectedType(type);
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="h-full flex items-center justify-center">
                    <LoadingSpinner size="lg" />
                </div>
            );
        }

        if (!selectedId) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
                    <span className="material-symbols-rounded text-6xl mb-4 text-slate-300">chat_bubble</span>
                    <h3 className="text-xl font-semibold text-slate-600 mb-2">Tus Mensajes</h3>
                    <p>Selecciona una conversación o grupo para comenzar a chatear.</p>
                </div>
            );
        }

        if (selectedType === 'group') {
            const group = groups.find(g => g.id === selectedId);
            return (
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b bg-white flex items-center gap-3 shadow-sm z-10">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden">
                            {group?.image && <Image src={group.image} alt={group?.name || "Grupo"} width={40} height={40} unoptimized className="w-full h-full object-cover" />}
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">{group?.name}</h2>
                            <p className="text-xs text-slate-500">Grupo de Interés</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden p-4 bg-slate-50">
                        <GroupChat groupId={selectedId} currentUserId={session?.user?.id || ''} className="shadow-none border-0 bg-transparent" />
                    </div>
                </div>
            );
        }

        const match = matches.find(m => m.matchId === selectedId);
        return (
            <ChatWindow
                matchId={selectedId}
                currentUserId={session?.user?.id || ''}
                otherPet={match}
            />
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header session={session} />
            <div className="container mx-auto px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col max-h-[calc(100vh-140px)] lg:max-h-[calc(100vh-120px)]">
                    <ConversationList
                        matches={matches}
                        groups={groups}
                        selectedId={selectedId}
                        selectedType={selectedType}
                        onSelect={handleSelect}
                        currentUserId={session?.user?.id || ''}
                    />
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col max-h-[calc(100vh-140px)] lg:max-h-[calc(100vh-120px)]">
                    {renderContent()}
                </div>

                <div className="lg:col-span-1 hidden lg:block max-h-[calc(100vh-140px)] lg:max-h-[calc(100vh-120px)] overflow-y-auto">
                    <QuickActions />
                </div>
            </div>
        </div>
    );
}



