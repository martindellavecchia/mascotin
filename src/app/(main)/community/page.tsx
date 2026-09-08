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
            <CommunityLayout header={<PageHeader
                    title="Comunidad"
                    className="flex-row flex-wrap items-center justify-between gap-2 border-0 pb-3 sm:items-center"
                    action={<Button
                        variant="outline"
                        className="gap-2 border-destructive/35 px-3 text-destructive hover:bg-destructive/5"
                        aria-label="Reportar mascota perdida"
                        onClick={() => setLostPetFormOpen(true)}
                    >
                        <CircleAlert className="size-4" aria-hidden="true" />
                        Reportar pérdida
                    </Button>}
                />}>
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
