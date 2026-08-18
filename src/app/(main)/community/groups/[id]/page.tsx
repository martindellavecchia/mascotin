'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CommunityLayout from '@/components/community/CommunityLayout';
import GroupHeader from '@/components/groups/GroupHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';

import GroupChat from '@/components/groups/GroupChat';
import GroupMembers from '@/components/groups/GroupMembers';
import GroupEvents from '@/components/groups/GroupEvents';
import GroupFeed from '@/components/groups/GroupFeed';

interface GroupDetail {
    id: string;
    name: string;
    description: string;
    image: string | null;
    creatorId: string;
    _count: { members: number };
}

export default function SingleGroupPage() {
    const params = useParams();
    const id = params?.id as string;
    const { data: session } = useSession();
    const router = useRouter();
    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!id || !session?.user?.id) return;

        const fetchGroup = async () => {
            const res = await fetch(`/api/groups/${id}`);
            const data = await res.json();
            if (data.success) {
                setGroup(data.group);
                checkMembership();
            } else {
                toast.error('Grupo no encontrado');
                router.push('/community/groups');
            }
            setLoading(false);
        };

        const checkMembership = async () => {
            const res = await fetch(`/api/groups?userId=${session.user.id}`);
            const data = await res.json();
            if (data.success) {
                const found = data.groups.find((item: { id: string; isMember?: boolean }) => item.id === id);
                setIsMember(Boolean(found?.isMember));
            }
        };

        fetchGroup();
    }, [id, router, session?.user?.id, refreshKey]);

    if (!id) return <div>Cargando...</div>;
    if (loading || !group) return <div>Cargando...</div>;

    const isCreator = session?.user?.id === group.creatorId;

    return (
        <div className="flex min-w-0 flex-col bg-background">
            <CommunityLayout>
                <GroupHeader
                    group={group}
                    isMember={isMember}
                    isCreator={isCreator}
                    onJoinChange={() => setRefreshKey((prev) => prev + 1)}
                />

                <Tabs defaultValue="feed" className="min-w-0 w-full">
                    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                        <TabsList className="inline-flex h-auto min-w-max justify-start rounded-none border-b border-slate-200 bg-white p-0">
                            <TabsTrigger value="feed" className="shrink-0 rounded-none px-3 py-3 data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 sm:px-6">
                                Feed
                            </TabsTrigger>
                            <TabsTrigger value="chat" className="shrink-0 rounded-none px-3 py-3 data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 sm:px-6">
                                Chat Grupal
                            </TabsTrigger>
                            <TabsTrigger value="events" className="shrink-0 rounded-none px-3 py-3 data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 sm:px-6">
                                Eventos
                            </TabsTrigger>
                            <TabsTrigger value="members" className="shrink-0 rounded-none px-3 py-3 data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 sm:px-6">
                                Miembros
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="mt-4 min-w-0 sm:mt-6">
                        <TabsContent value="feed" className="min-w-0">
                            <GroupFeed
                                groupId={group.id}
                                currentUser={session?.user ? {
                                    id: session.user.id,
                                    name: session.user.name || 'Usuario',
                                    image: session.user.image || null
                                } : null}
                            />
                        </TabsContent>
                        <TabsContent value="chat" className="min-w-0">
                            {isMember ? (
                                <GroupChat
                                    groupId={group.id}
                                    currentUserId={session?.user?.id || ''}
                                    className="h-[calc(100dvh-12rem)] min-h-[28rem] max-h-[44rem] overflow-hidden"
                                />
                            ) : (
                                <EmptyState compact title="Unite al grupo para ver el chat" />
                            )}
                        </TabsContent>
                        <TabsContent value="events" className="min-w-0">
                            <GroupEvents
                                groupId={group.id}
                                isCreator={isCreator}
                                currentUserId={session?.user?.id || ''}
                            />
                        </TabsContent>
                        <TabsContent value="members" className="min-w-0">
                            <GroupMembers
                                groupId={group.id}
                                isCreator={isCreator}
                                currentUserId={session?.user?.id || ''}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </CommunityLayout>
        </div>
    );
}
