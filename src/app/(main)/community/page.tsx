'use client';

import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import CommunityLayout from '@/components/community/CommunityLayout';
import EventsFeed from '@/components/community/EventsFeed';
import LostPetForm from '@/components/community/LostPetForm';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

export default function CommunityPage() {
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
        <div>
            <CommunityLayout>
                <PageHeader
                    title="Comunidad"
                    description="Publicaciones, grupos y encuentros cerca tuyo."
                    action={<Button
                        variant="outline"
                        className="border-destructive/35 text-destructive hover:bg-destructive/5"
                        onClick={() => setLostPetFormOpen(true)}
                    >
                        <CircleAlert className="mr-2 size-5" aria-hidden="true" />
                        Reportar mascota perdida
                    </Button>}
                />
                <div className="mt-6">
                    <EventsFeed refreshKey={feedRefreshKey} />
                </div>
            </CommunityLayout>

            <LostPetForm
                open={lostPetFormOpen}
                onOpenChange={setLostPetFormOpen}
                onSuccess={() => setFeedRefreshKey((prev) => prev + 1)}
            />
        </div>
    );
}
