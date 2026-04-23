import Link from 'next/link';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import Header from '@/components/Header';
import HomeClientShell from '@/components/home/HomeClientShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authOptions } from '@/lib/auth';
import { getFeedPage } from '@/lib/server/feed';
import { getHomeBootstrapData } from '@/lib/server/home';
import type { Post } from '@/types';

function GuestHome() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-rounded text-5xl text-white filled">
              pets
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Bienvenido a MascoTin
        </h2>
        <p className="text-slate-600 mb-6">
          Inicia sesión para encontrar amigos peludos para tu mascota
        </p>
        <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
          <Link href="/login">Iniciar Sesión</Link>
        </Button>
        <p className="mt-4 text-sm text-slate-600">
          ¿No tienes cuenta?{' '}
          <Link
            href="/register"
            className="text-rose-500 hover:underline font-semibold"
          >
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  );
}

function HomeError({ session }: { session: Session }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header session={session} />
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-rounded text-4xl text-white filled">
                error
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Error al cargar
          </h2>
          <p className="text-slate-600 mb-6">
            No se pudieron cargar tus mascotas. Intenta recargar la página.
          </p>
          <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
            <Link href="/">Reintentar</Link>
          </Button>
        </Card>
      </main>
    </div>
  );
}

function NoPetsHome({ session }: { session: Session }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header session={session} />
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-rounded text-4xl text-white filled">
                pets
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            ¡Registra tu Primera Mascota!
          </h2>
          <p className="text-slate-600 mb-6">
            Para comenzar a encontrar amigos para tu mascota, primero necesitas
            registrarla.
          </p>
          <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
            <Link href="/create-pet">
              <span className="material-symbols-rounded mr-2">add_circle</span>
              Registrar Mascota
            </Link>
          </Button>
        </Card>
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>MascoTin - Conecta y cuida mejor a tu mascota.</p>
        </div>
      </footer>
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ petId?: string; tab?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <GuestHome />;
  }

  try {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const [homeData, feedPage] = await Promise.all([
      getHomeBootstrapData(session.user.id, resolvedSearchParams?.petId),
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
      />
    );
  } catch (error) {
    console.error('Error loading home page:', error);
    return <HomeError session={session} />;
  }
}
