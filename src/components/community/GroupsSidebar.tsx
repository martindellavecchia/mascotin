'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Group {
    id: string;
    name: string;
    image: string | null;
}

export default function GroupsSidebar() {
    const { data: session } = useSession();
    const [myGroups, setMyGroups] = useState<Group[]>([]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchMyGroups();
        }
    }, [session?.user?.id]);

    const fetchMyGroups = async () => {
        try {
            const res = await fetch(`/api/groups?userId=${session?.user?.id}`);
            const data = await res.json();
            if (data.success) {
                setMyGroups(data.groups.filter((g: any) => g.isMember));
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-800">Mis Grupos</h3>
                <Link href="/community/groups">
                    <span className="text-xs text-teal-600 hover:underline cursor-pointer">Ver todos</span>
                </Link>
            </div>

            <div className="space-y-3">
                {myGroups.length === 0 ? (
                    <p className="text-sm text-slate-500">No te has unido a ningún grupo aún.</p>
                ) : (
                    myGroups.map(group => (
                        <Link key={group.id} href={`/community/groups/${group.id}`} className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                                {group.image ? (
                                    <img src={group.image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-teal-100">
                                        <span className="material-symbols-rounded text-teal-300">groups</span>
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-slate-900 text-sm truncate">{group.name}</p>
                            </div>
                        </Link>
                    ))
                )}

                <Link href="/community/groups">
                    <Button variant="outline" className="w-full mt-2 text-xs">
                        Explorar Grupos
                    </Button>
                </Link>
            </div>
        </div>
    );
}
