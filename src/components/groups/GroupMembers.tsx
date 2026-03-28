'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface GroupMembersProps {
    groupId: string;
    isCreator: boolean;
    currentUserId: string;
}

interface Member {
    id: string; // Membership ID
    role: 'ADMIN' | 'MEMBER';
    user: {
        id: string;
        name: string;
        image: string | null;
    };
    joinedAt: string;
}

export default function GroupMembers({ groupId, isCreator, currentUserId }: GroupMembersProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMembers = async () => {
        try {
            const res = await fetch(`/api/groups/${groupId}/members`);
            const data = await res.json();
            if (data.success) {
                setMembers(data.members);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [groupId]);

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('¿Estás seguro de eliminar a este miembro?')) return;

        try {
            const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Miembro eliminado');
                fetchMembers(); // Refresh list
            } else {
                toast.error('Error al eliminar miembro');
            }
        } catch (error) {
            toast.error('Error al eliminar miembro');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando miembros...</div>;

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-800">Miembros del Grupo ({members.length})</h3>
            <div className="grid gap-4">
                {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={member.user.image || undefined} />
                                <AvatarFallback>{member.user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-slate-900 flex items-center gap-2">
                                    {member.user.name}
                                    {member.role === 'ADMIN' && (
                                        <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-700">Admin</Badge>
                                    )}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Unido el {new Date(member.joinedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {isCreator && member.user.id !== currentUserId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleRemoveMember(member.user.id)}
                            >
                                <span className="material-symbols-rounded text-lg">logout</span>
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
