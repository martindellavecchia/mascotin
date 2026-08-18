import Link from 'next/link';
import { CircleAlert, PawPrint, Plus } from 'lucide-react';
import HomeClientShell from '@/components/home/HomeClientShell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getFeedPage } from '@/lib/server/feed';
import { getHomeBootstrapData } from '@/lib/server/home';
import { getCachedSession } from '@/lib/session';
import type { Post } from '@/types';

function HomeError() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-1 flex-col justify-center px-4 py-6">
      <EmptyState
        icon={<CircleAlert className="size-11" aria-hidden="true" />}
        title="No pudimos cargar el inicio"
        description="No se pudieron cargar tus mascotas. Intentá recargar la página."
        action={<Button asChild variant="outline"><Link href="/inicio">Reintentar</Link></Button>}
      />
    </main>
  );
}

function NoPetsHome() {
  return (
    <>
      <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          headingLevel="h1"
          icon={<PawPrint className="size-11" aria-hidden="true" />}
          title="Registrá tu primera mascota"
          description="Necesitás crear su perfil antes de descubrir mascotas y participar con ella en la comunidad."
          action={<Button asChild><Link href="/create-pet"><Plus className="mr-2 size-5" aria-hidden="true" />Registrar mascota</Link></Button>}
        />
      </main>
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
      return <NoPetsHome />;
    }

    return (
      <HomeClientShell
        session={session}
        initialPets={homeData.pets}
        initialSelectedPetId={homeData.selectedPetId}
        initialFeedPosts={feedPage.posts as unknown as Post[]}
        initialFeedNextCursor={feedPage.nextCursor}
        initialFeedHasMore={feedPage.hasMore}
      />
    );
  } catch (error) {
    console.error('Error loading home page:', error);
    return <HomeError />;
  }
}
