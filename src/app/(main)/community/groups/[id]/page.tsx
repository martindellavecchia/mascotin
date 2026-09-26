'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Users } from 'lucide-react';
import CommunityLayout from '@/components/community/CommunityLayout';
import GroupHeader from '@/components/groups/GroupHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { StateFeedback } from '@/components/ui/state-feedback';

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

type LoadStatus = 'loading' | 'ready' | 'not_found' | 'error';

export default function SingleGroupPage() {
    const params = useParams();
    const id = params?.id as string | undefined;
    const { data: session, status: sessionStatus } = useSession();
    const userId = session?.user?.id;
    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [status, setStatus] = useState<LoadStatus>('loading');
    const [isMember, setIsMember] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadGroup = useCallback(async (signal: AbortSignal) => {
        if (!id) {
            setStatus('not_found');
            return;
        }
        try {
            const res = await fetch(`/api/groups/${id}`, { signal });
            const data = await res.json().catch(() => null);
            if (res.status === 404) {
                setStatus('not_found');
                return;
            }
            if (!res.ok || !data?.success) {
                setStatus('error');
                return;
            }
            setGroup(data.group);
            setStatus('ready');

            if (!userId) return;
            const membershipRes = await fetch(`/api/groups?userId=${userId}`, { signal });
            const membershipData = await membershipRes.json().catch(() => null);
            if (membershipRes.ok && membershipData?.success) {
                const found = membershipData.groups.find((item: { id: string; isMember?: boolean }) => item.id === id);
                setIsMember(Boolean(found?.isMember));
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error('Error loading group:', error);
            setStatus('error');
        }
    }, [id, userId]);

    useEffect(() => {
        if (sessionStatus === 'loading') return;
        const controller = new AbortController();
        void loadGroup(controller.signal);
        return () => controller.abort();
    }, [loadGroup, sessionStatus, refreshKey]);

    const retry = () => {
        setStatus('loading');
        setRefreshKey((prev) => prev + 1);
    };

    if (status === 'loading' || (sessionStatus === 'loading' && !group)) {
        return (
            <CommunityLayout>
                <StateFeedback status="loading" title="Cargando grupo" />
            </CommunityLayout>
        );
    }

    if (status === 'not_found') {
        return (
            <CommunityLayout>
                <EmptyState
                    icon={<Users className="size-11" aria-hidden="true" />}
                    title="Grupo no encontrado"
                    description="Es posible que se haya eliminado o que el enlace no sea correcto."
                    action={<Button asChild variant="outline"><Link href="/community/groups">Volver a grupos</Link></Button>}
                />
            </CommunityLayout>
        );
    }

    if (status === 'error' || !group) {
        return (
            <CommunityLayout>
                <StateFeedback
                    status="error"
                    title="No pudimos cargar el grupo"
                    description="Revisá tu conexión e intentá de nuevo."
                    action={
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button variant="outline" onClick={retry}>Reintentar</Button>
                            <Button asChild variant="ghost"><Link href="/community/groups">Volver a grupos</Link></Button>
                        </div>
                    }
                />
            </CommunityLayout>
        );
    }

    const isCreator = userId === group.creatorId;

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
                                Publicaciones
                            </TabsTrigger>
                            <TabsTrigger value="chat" className="shrink-0 rounded-none px-3 py-3 data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 sm:px-6">
                                Chat grupal
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
                                    currentUserId={userId || ''}
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
                                isMember={isMember || isCreator}
                                currentUserId={userId || ''}
                            />
                        </TabsContent>
                        <TabsContent value="members" className="min-w-0">
                            <GroupMembers
                                groupId={group.id}
                                isCreator={isCreator}
                                currentUserId={userId || ''}
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </CommunityLayout>
        </div>
    );
}
