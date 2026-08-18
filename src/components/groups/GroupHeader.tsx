'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import EditGroupModal from './EditGroupModal';

interface GroupHeaderProps {
    group: {
        id: string;
        name: string;
        description: string;
        image: string | null;
        creatorId: string;
        _count: { members: number };
    };
    isMember: boolean;
    isCreator: boolean;
    onJoinChange: () => void;
}

export default function GroupHeader({ group, isMember, isCreator, onJoinChange }: GroupHeaderProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleJoinLeave = async () => {
        setLoading(true);
        try {
            const method = isMember ? 'DELETE' : 'POST';
            const res = await fetch(`/api/groups/${group.id}/join`, { method });

            if (res.ok) {
                toast.success(isMember ? 'Saliste del grupo' : 'Te uniste al grupo');
                onJoinChange();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Error al actualizar membresía');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este grupo? Esta acción no se puede deshacer.')) return;

        try {
            const res = await fetch(`/api/groups/${group.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Grupo eliminado');
                router.push('/community/groups');
            } else {
                toast.error('Error al eliminar grupo');
            }
        } catch (error) {
            toast.error('Error al eliminar grupo');
        }
    };

    return (
        <>
            <section className="mb-6 min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
                <div className="relative h-36 bg-slate-200 sm:h-48">
                    {group.image ? (
                        <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-teal-100">
                            <Users className="size-16 text-teal-300" aria-hidden="true" />
                        </div>
                    )}
                </div>

                <div className="px-4 py-4 sm:px-6">
                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                            <h1 className="mb-2 text-2xl font-bold text-slate-900 [overflow-wrap:anywhere] sm:text-3xl">{group.name}</h1>
                            <p className="mb-4 max-w-2xl text-slate-600 [overflow-wrap:anywhere]">{group.description}</p>

                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 sm:gap-4">
                                <span className="flex items-center gap-1">
                                    <UserRound className="size-5" aria-hidden="true" />
                                    {group._count.members} miembros
                                </span>
                                {isMember && (
                                    <Badge variant="verified">
                                        Sos miembro
                                    </Badge>
                                )}
                                {isCreator && (
                                    <Badge variant="warning">
                                        Creador
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto lg:shrink-0">
                            {isCreator ? (
                                <>
                                    <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setIsEditOpen(true)}>
                                        <Pencil className="mr-2 size-5" aria-hidden="true" />
                                        Editar
                                    </Button>
                                    <Button variant="destructive" className="min-h-11 w-full sm:w-auto" onClick={handleDelete}>
                                        <Trash2 className="mr-2 size-5" aria-hidden="true" />
                                        Eliminar
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={handleJoinLeave}
                                    variant={isMember ? "outline" : "default"}
                                    className="col-span-2 min-h-11 w-full sm:w-auto"
                                    disabled={loading}
                                >
                                    {loading ? 'Procesando...' : isMember ? 'Salir del grupo' : 'Unirse al grupo'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <EditGroupModal
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={() => {
                    onJoinChange(); // Refresh data
                    router.refresh();
                }}
                group={group}
            />
        </>
    );
}
