'use client';

import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
        try {
            const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Miembro eliminado');
                fetchMembers();
                return true;
            }
            const data = await res.json().catch(() => null);
            toast.error(data?.error || 'No se pudo eliminar al miembro');
            return false;
        } catch {
            toast.error('Error de conexión. Intentá de nuevo.');
            return false;
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando miembros...</div>;

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-800">Miembros del grupo ({members.length})</h3>
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
                                        <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-700">Administrador/a</Badge>
                                    )}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Se sumó el {new Date(member.joinedAt).toLocaleDateString('es-AR')}
                                </p>
                            </div>
                        </div>

                        {isCreator && member.user.id !== currentUserId && (
                            <ConfirmDialog
                                title={`¿Quitar a ${member.user.name} del grupo?`}
                                description="Dejará de ver el chat y las publicaciones del grupo. Puede volver a unirse más adelante."
                                confirmLabel="Quitar del grupo"
                                destructive
                                onConfirm={() => handleRemoveMember(member.user.id)}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        aria-label={`Quitar a ${member.user.name} del grupo`}
                                    >
                                        <LogOut className="size-5" aria-hidden="true" />
                                    </Button>
                                }
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
