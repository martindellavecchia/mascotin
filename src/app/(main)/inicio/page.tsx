import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import HomeClientShell from '@/components/home/HomeClientShell';
import NoPetsHome from '@/components/home/NoPetsHome';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getHomeBootstrapData } from '@/lib/server/home';
import { getCachedSession } from '@/lib/session';
import type { Post } from '@/types';

export const metadata = { title: 'Inicio' };

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

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; petId?: string }>;
}) {
  const session = await getCachedSession();
  const { petId } = await searchParams;

  if (!session?.user?.id) {
    return <HomeError />;
  }

  try {
    const homeData = await getHomeBootstrapData(session.user.id, petId);

    if (homeData.pets.length === 0) {
      return <NoPetsHome />;
    }

    const showCommunityFeed = homeData.hasMatches || homeData.hasOwnPosts;
    const feedPage = homeData.feedPage;

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
