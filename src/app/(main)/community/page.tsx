'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CommunityLayout from '@/components/community/CommunityLayout';
import EventsFeed from '@/components/community/EventsFeed';
import LostPetForm from '@/components/community/LostPetForm';
import { Button } from '@/components/ui/button';

export default function CommunityPage() {
    const { data: session } = useSession();
    const [lostPetFormOpen, setLostPetFormOpen] = useState(false);
    const [feedRefreshKey, setFeedRefreshKey] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('report') === 'lost') {
            setLostPetFormOpen(true);
            params.delete('report');
            const next = params.toString();
            window.history.replaceState(
                null,
                '',
                next ? `/community?${next}` : '/community'
            );
        }
    }, []);

    return (
        <div className="bg-slate-50">
            <CommunityLayout>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Comunidad</h1>
                        <p className="text-slate-600">Eventos, grupos y debates cercanos</p>
                    </div>
                    <Button
                        className="w-full bg-red-500 text-white hover:bg-red-600 sm:w-auto"
                        onClick={() => setLostPetFormOpen(true)}
                    >
                        <span className="material-symbols-rounded mr-2">emergency</span>
                        Reportar Mascota Perdida
                    </Button>
                </div>
                <EventsFeed refreshKey={feedRefreshKey} />
            </CommunityLayout>

            <LostPetForm
                open={lostPetFormOpen}
                onOpenChange={setLostPetFormOpen}
                onSuccess={() => setFeedRefreshKey((prev) => prev + 1)}
            />
        </div>
    );
}