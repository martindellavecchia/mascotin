'use client';

import EditGroupModal from './EditGroupModal';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
                toast.success(isMember ? 'Has salido del grupo' : 'Te has unido al grupo');
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
            <section className="mb-6 min-w-0 overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="relative h-36 bg-slate-200 sm:h-48">
                    {group.image ? (
                        <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-teal-100">
                            <span className="material-symbols-rounded text-6xl text-teal-300">groups</span>
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
                                    <span className="material-symbols-rounded">person</span>
                                    {group._count.members} miembros
                                </span>
                                {isMember && (
                                    <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-200 border-0">
                                        Eres miembro
                                    </Badge>
                                )}
                                {isCreator && (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0">
                                        Creador
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto lg:shrink-0">
                            {isCreator ? (
                                <>
                                    <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setIsEditOpen(true)}>
                                        <span className="material-symbols-rounded mr-2">edit</span>
                                        Editar
                                    </Button>
                                    <Button variant="destructive" className="min-h-11 w-full sm:w-auto" onClick={handleDelete}>
                                        <span className="material-symbols-rounded mr-2">delete</span>
                                        Eliminar
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={handleJoinLeave}
                                    variant={isMember ? "outline" : "default"}
                                    className={`col-span-2 min-h-11 w-full sm:w-auto ${!isMember ? "bg-teal-500 hover:bg-teal-600" : ""}`}
                                    disabled={loading}
                                >
                                    {loading ? 'Procesando...' : isMember ? 'Salir del Grupo' : 'Unirse al Grupo'}
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
