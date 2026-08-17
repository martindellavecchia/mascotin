import Link from 'next/link';
import type { Session } from 'next-auth';
import { CircleAlert, PawPrint, Plus } from 'lucide-react';
import HomeClientShell from '@/components/home/HomeClientShell';
import { Button } from '@/components/ui/button';
import { getFeedPage } from '@/lib/server/feed';
import { getHomeBootstrapData } from '@/lib/server/home';
import { getCachedSession } from '@/lib/session';
import type { Post } from '@/types';

function HomeError() {
  return (
    <main className="flex-1 container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md text-center px-4">
        <CircleAlert className="mb-4 size-12 text-slate-400" aria-hidden="true" />
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
          Error al cargar
        </h2>
        <p className="text-slate-600 mb-6">
          No se pudieron cargar tus mascotas. Intenta recargar la página.
        </p>
        <Button asChild className="bg-teal-700 hover:bg-teal-800 rounded-lg">
          <Link href="/inicio">Reintentar</Link>
        </Button>
      </div>
    </main>
  );
}

function NoPetsHome({ session: _session }: { session: Session }) {
  return (
    <>
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md text-center px-4">
          <PawPrint className="mb-4 size-12 text-teal-600" aria-hidden="true" fill="currentColor" />
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
            Registra tu primera mascota
          </h2>
          <p className="text-slate-600 mb-6">
            Para comenzar a encontrar amigos para tu mascota, primero necesitas
            registrarla.
          </p>
          <Button asChild className="bg-teal-700 hover:bg-teal-800 rounded-lg">
            <Link href="/create-pet">
              <Plus className="mr-2 size-5" aria-hidden="true" />
              Registrar mascota
            </Link>
          </Button>
        </div>
      </main>
      <footer className="border-t border-slate-200 py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>MascoTin — Conecta y cuida mejor a tu mascota.</p>
        </div>
      </footer>
    </>
  );
}

export default async function InicioPage() {
  const session = await getCachedSession();

  if (!session?.user?.id) {
    return <HomeError />;
  }

  try {
    const [homeData, feedPage] = await Promise.all([
      getHomeBootstrapData(session.user.id),
      getFeedPage({
        userId: session.user.id,
        limit: 10,
      }),
    ]);

    if (homeData.pets.length === 0) {
      return <NoPetsHome session={session} />;
    }

    return (
      <HomeClientShell
        session={session}
        initialPets={homeData.pets}
        initialSelectedPetId={homeData.selectedPetId}
        initialStats={homeData.stats}
        initialNextAppointment={homeData.nextAppointment}
        initialFeedPosts={feedPage.posts as unknown as Post[]}
        initialFeedNextCursor={feedPage.nextCursor}
        initialFeedHasMore={feedPage.hasMore}
        initialLostPets={homeData.lostPets}
        initialSuggestions={homeData.suggestions}
        initialHealthRecords={homeData.healthRecords}
      />
    );
  } catch (error) {
    console.error('Error loading home page:', error);
    return <HomeError />;
  }
}
