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

function NoPetsHome({ requestedTab }: { requestedTab: string | undefined }) {
  const isDiscover = requestedTab === 'explore';

  return (
    <>
      <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-1 flex-col justify-center px-4 py-6">
        <EmptyState
          headingLevel="h1"
          icon={<PawPrint className="size-11" aria-hidden="true" />}
          title={isDiscover ? 'Creá una mascota para empezar a descubrir' : 'Tu primer plan empieza con una mascota'}
          description={isDiscover
            ? 'Solo te vamos a pedir el nombre y el tipo. No necesitás foto y después volvés directo a Descubrir.'
            : 'Registrá el nombre y el tipo en menos de un minuto. Después vas a poder conocer mascotas, eventos y hogares.'}
          action={<Button asChild><Link href="/create-pet"><Plus className="mr-2 size-5" aria-hidden="true" />Crear perfil básico</Link></Button>}
        />
      </main>
    </>
  );
}

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getCachedSession();
  const { tab } = await searchParams;

  if (!session?.user?.id) {
    return <HomeError />;
  }

  try {
    const homeData = await getHomeBootstrapData(session.user.id);

    if (homeData.pets.length === 0) {
      return <NoPetsHome requestedTab={tab} />;
    }

    const showCommunityFeed = homeData.stats.totalMatches > 0 || homeData.hasOwnPosts;
    const feedPage = showCommunityFeed
      ? await getFeedPage({
        userId: session.user.id,
        limit: 10,
      })
      : { posts: [], nextCursor: null, hasMore: false };

    return (
      <HomeClientShell
        session={session}
        initialPets={homeData.pets}
        initialSelectedPetId={homeData.selectedPetId}
        initialSuggestions={homeData.suggestions}
        showCommunityFeed={showCommunityFeed}
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
