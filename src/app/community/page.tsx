'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import CommunityLayout from '@/components/community/CommunityLayout';
import EventsFeed from '@/components/community/EventsFeed';
import LostPetForm from '@/components/community/LostPetForm';
import { Button } from '@/components/ui/button';

export default function CommunityPage() {
    const { data: session } = useSession();
    const [lostPetFormOpen, setLostPetFormOpen] = useState(false);
    const [feedRefreshKey, setFeedRefreshKey] = useState(0);

    return (
        <div className="min-h-screen bg-[#f8fcfa]">
            <Header session={session} />
            <CommunityLayout>
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Comunidad</h1>
                        <p className="text-gray-600">Eventos, grupos y debates cercanos</p>
                    </div>
                    <Button
                        className="bg-red-500 hover:bg-red-600 text-white"
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