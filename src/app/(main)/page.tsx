import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import HomeClientShell from '@/components/home/HomeClientShell';
import { Button } from '@/components/ui/button';
import { authOptions } from '@/lib/auth';
import { getFeedPage } from '@/lib/server/feed';
import { getHomeBootstrapData } from '@/lib/server/home';
import type { Post } from '@/types';

function GuestHome() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-[100svh] flex flex-col">
        <Image
          src="/images/hero-dogs.jpg"
          alt="Dos perros jugando al aire libre"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/30" />

        <header className="relative z-10 px-6 sm:px-10 pt-6 sm:pt-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-rounded text-white text-2xl filled">
                pets
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-bold tracking-tight">
              MascoTin
            </span>
          </div>
        </header>

        <div className="relative z-10 flex-1 flex flex-col justify-end px-6 sm:px-10 pb-16 sm:pb-20 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-4 animate-fade-in">
            Compañía real para tu mascota
          </h1>
          <p className="text-lg sm:text-xl text-white/85 max-w-xl mb-8 leading-relaxed">
            Empareja, comparte en comunidad y encuentra servicios — todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              className="h-12 px-8 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-base"
            >
              <Link href="/register">Crear cuenta</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 px-8 rounded-lg border-white/40 bg-white/5 text-white hover:bg-white/15 hover:text-white font-semibold text-base"
            >
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="relative bg-slate-50 text-slate-900">
        <div className="container mx-auto px-6 sm:px-10 py-16 sm:py-20 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Un espacio pensado para dueños y mascotas
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Descubre perfiles cercanos, conversa tras un match y participa en una
              comunidad que entiende el día a día con animales.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <Image
              src="/images/community-dog.jpg"
              alt="Persona con su perro en casa"
              fill
              className="object-cover"
            />
          </div>
        </div>
        <footer className="border-t border-slate-200 py-6">
          <div className="container mx-auto px-6 text-center text-slate-500 text-sm">
            © {new Date().getFullYear()} MascoTin
          </div>
        </footer>
      </section>
    </div>
  );
}

function HomeError({ session: _session }: { session: Session }) {
  return (
    <main className="flex-1 container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md text-center px-4">
        <span className="material-symbols-rounded text-5xl text-slate-400 mb-4">
          error
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
          Error al cargar
        </h2>
        <p className="text-slate-600 mb-6">
          No se pudieron cargar tus mascotas. Intenta recargar la página.
        </p>
        <Button asChild className="bg-teal-700 hover:bg-teal-800 rounded-lg">
          <Link href="/">Reintentar</Link>
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
          <span className="material-symbols-rounded text-5xl text-teal-600 mb-4 filled">
            pets
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">
            Registra tu primera mascota
          </h2>
          <p className="text-slate-600 mb-6">
            Para comenzar a encontrar amigos para tu mascota, primero necesitas
            registrarla.
          </p>
          <Button asChild className="bg-teal-700 hover:bg-teal-800 rounded-lg">
            <Link href="/create-pet">
              <span className="material-symbols-rounded mr-2">add</span>
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

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <GuestHome />;
  }

  try {
    // Intentionally ignore URL searchParams here: reading them opts this RSC
    // into refetching on every ?tab= / ?petId= change and freezes tab switches.
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
    return <HomeError session={session} />;
  }
}
