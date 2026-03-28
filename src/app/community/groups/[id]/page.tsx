'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import CommunityLayout from '@/components/community/CommunityLayout';
import GroupHeader from '@/components/groups/GroupHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import GroupChat from '@/components/groups/GroupChat';
import GroupMembers from '@/components/groups/GroupMembers';
import GroupEvents from '@/components/groups/GroupEvents';
import GroupFeed from '@/components/groups/GroupFeed';

export default function SingleGroupPage() {
    const params = useParams();
    const id = params?.id as string;
    const { data: session } = useSession();
    const router = useRouter();
    const [group, setGroup] = useState<any>(null);
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
                const found = data.groups.find((g: any) => g.id === id);
                setIsMember(Boolean(found?.isMember));
            }
        };

        fetchGroup();
    }, [id, router, session?.user?.id, refreshKey]);

    if (!id) return <div>Cargando...</div>;
    if (loading || !group) return <div>Cargando...</div>;

    const isCreator = session?.user?.id === group.creatorId;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header session={session} />
            <CommunityLayout>
                <GroupHeader
                    group={group}
                    isMember={isMember}
                    isCreator={isCreator}
                    onJoinChange={() => setRefreshKey((prev) => prev + 1)}
                />

                <Tabs defaultValue="feed" className="w-full">
                    <TabsList className="w-full justify-start bg-white border-b p-0 h-auto rounded-none">
                        <TabsTrigger value="feed" className="py-3 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600">
                            Feed
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="py-3 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600">
                            Chat Grupal
                        </TabsTrigger>
                        <TabsTrigger value="events" className="py-3 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600">
                            Eventos
                        </TabsTrigger>
                        <TabsTrigger value="members" className="py-3 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600">
                            Miembros
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        <TabsContent value="feed">
                            <GroupFeed
                                groupId={group.id}
                                currentUser={session?.user ? {
                                    id: session.user.id,
                                    name: session.user.name || 'Usuario',
                                    image: session.user.image || null
                                } : null}
                            />
                        </TabsContent>
                        <TabsContent value="chat">
                            {isMember ? (
                                <GroupChat groupId={group.id} currentUserId={session?.user?.id || ''} />
                            ) : (
                                <div className="text-center py-12 bg-white rounded-lg">
                                    <p className="text-slate-500">Debes unirte al grupo para ver el chat.</p>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="events">
                            <GroupEvents
                                groupId={group.id}
                                isCreator={isCreator}
                                currentUserId={session?.user?.id || ''}
                            />
                        </TabsContent>
                        <TabsContent value="members">
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