'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (session?.user?.id) {
            fetchGroups();
        }
    }, [session?.user?.id]);

    const fetchGroups = async (search = '') => {
        setLoading(true);
        try {
            const userId = session?.user?.id;
            const res = await fetch(`/api/groups?search=${search}&userId=${userId || ''}`);
            const data = await res.json();
            if (data.success) {
                setGroups(data.groups);
            }
        } catch (error) {
            console.error(error);
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
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header session={session} />
            <CommunityLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Grupos de Interés</h1>
                            <p className="text-slate-500">Encuentra tu manada</p>
                        </div>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-teal-500 hover:bg-teal-600 text-white"
                        >
                            <span className="material-symbols-rounded mr-2">add</span>
                            Crear Grupo
                        </Button>
                    </div>

                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder="Buscar grupos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white"
                        />
                        <Button type="submit" variant="secondary">Buscar</Button>
                    </form>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <span className="material-symbols-rounded text-6xl text-slate-200 mb-4">groups</span>
                            <h3 className="text-lg font-medium text-slate-700">No se encontraron grupos</h3>
                            <p className="text-slate-500">Sé el primero en crear uno para este tema.</p>
                        </div>
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
