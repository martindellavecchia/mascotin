'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import GroupCard from '@/components/groups/GroupCard';
import CreateGroupModal from '@/components/groups/CreateGroupModal';
import CommunityLayout from '@/components/community/CommunityLayout';

interface Group {
    id: string;
    name: string;
    description: string;
    image: string | null;
    isMember: boolean;
    _count: {
        members: number;
    };
}

export default function GroupsDirectoryPage() {
    const { data: session } = useSession();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchGroups();
        }
    }, [session?.user?.id]);

    const fetchGroups = async (search = '') => {
        setLoading(true);
        setError(null);
        try {
            const userId = session?.user?.id;
            const res = await fetch(`/api/groups?search=${search}&userId=${userId || ''}`);
            const data = await res.json();
            if (data.success) {
                setGroups(data.groups);
            } else {
                throw new Error(data.error || 'No se pudieron cargar los grupos');
            }
        } catch {
            setError('No se pudieron cargar los grupos. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchGroups(searchTerm);
    };

    const handleJoin = async (groupId: string) => {
        try {
            const res = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' });
            if (res.ok) {
                toast.success('¡Te has unido al grupo!');
                // Update local state
                setGroups(groups.map(g => g.id === groupId ? { ...g, isMember: true, _count: { members: g._count.members + 1 } } : g));
            } else {
                toast.error('Error al unirse al grupo');
            }
        } catch (error) {
            toast.error('Error al unirse al grupo');
        }
    };

    return (
        <div>
            <CommunityLayout>
                <div className="space-y-6">
                    <PageHeader
                        title="Grupos de interés"
                        description="Encontrá personas con intereses y experiencias en común."
                        action={<Button
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus className="mr-2 size-5" aria-hidden="true" />
                            Crear grupo
                        </Button>}
                    />

                    <form onSubmit={handleSearch} className="flex gap-2 border-y border-border bg-surface py-4">
                        <Input
                            placeholder="Buscar grupos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button type="submit" variant="outline">Buscar</Button>
                    </form>

                    {error ? (
                        <EmptyState
                            title="No pudimos cargar los grupos"
                            description={error}
                            action={<Button variant="outline" onClick={() => void fetchGroups(searchTerm)}>Intentar de nuevo</Button>}
                        />
                    ) : loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : groups.length === 0 ? (
                        <EmptyState
                            icon={<Users className="size-11" aria-hidden="true" />}
                            title="No encontramos grupos"
                            description="Creá el primero para reunir a la comunidad alrededor de este tema."
                            action={<Button onClick={() => setShowCreateModal(true)}>Crear grupo</Button>}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.map(group => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    onJoin={handleJoin}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <CreateGroupModal
                    open={showCreateModal}
                    onOpenChange={setShowCreateModal}
                    onSuccess={() => fetchGroups()}
                />
            </CommunityLayout>
        </div>
    );
}
