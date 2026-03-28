'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/Header';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Pet, SwipeResponse } from '@/types';
import PetCard from '@/components/PetCard';
import DashboardLayout from '@/components/DashboardLayout';
import PetProfileSidebar from '@/components/PetProfileSidebar';
import Feed from '@/components/feed/Feed';
import MatchesPanel from '@/components/MatchesPanel';
import HomeStats from '@/components/HomeStats';
import TrendingPets from '@/components/TrendingPets';
import QuickActions from '@/components/widgets/QuickActions';
import NextAppointment from '@/components/widgets/NextAppointment';
import SuggestedPets from '@/components/widgets/SuggestedPets';
import PetPairingWidget from '@/components/widgets/PetPairingWidget';
import LostPetWidget from '@/components/widgets/LostPetWidget';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { toast } from 'sonner';

function HomeContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pets, setPets] = useState<Pet[]>([]);
  const [petsToSwipe, setPetsToSwipe] = useState<Pet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMyPets, setLoadingMyPets] = useState(false);
  const [errorLoadingPets, setErrorLoadingPets] = useState(false);
  const [matchNotification, setMatchNotification] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'matches'>('home');
  const { fetchWithError } = useFetchWithError();
  const swipingRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  const tabParam = searchParams.get('tab');
  const petIdParam = searchParams.get('petId');

  const myPets = pets;
  const selectedPetId = petIdParam || (myPets.length > 0 ? myPets[0].id : undefined);

  useEffect(() => {
    if (tabParam === 'home' || tabParam === 'explore' || tabParam === 'matches') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchMyPets();
    }
  }, [status, session?.user?.id]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchMatches();
    }
  }, [status, session?.user?.id]);

  const fetchMyPets = async () => {
    setLoadingMyPets(true);
    setErrorLoadingPets(false);
    const result = await fetchWithError<{ pets: Pet[] }>('/api/pet/mine', {
      timeout: 60000,
      retries: 2,
      retryDelay: 800
    });
    if (result.success && result.data) {
      setPets(result.data.pets || []);
    } else if (!result.success) {
      setErrorLoadingPets(true);
    }
    setLoadingMyPets(false);
  };

  const fetchPetsForSwipe = async () => {
    if (!selectedPetId) return;
    setLoading(true);
    const result = await fetchWithError<{ pets: Pet[] }>(`/api/pets?currentPetId=${selectedPetId}`);
    if (result.success && result.data) {
      setPetsToSwipe(result.data.pets || []);
      setCurrentIndex(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedPetId) {
      fetchPetsForSwipe();
    }
  }, [selectedPetId]);

  const fetchMatches = async () => {
    const result = await fetchWithError<{ matches: Pet[] }>('/api/matches');
    if (result.success && result.data) {
      setMatches(result.data.matches || []);
    }
  };

  const handleSwipe = async (isLike: boolean) => {
    if (swipingRef.current) return;
    if (currentIndex >= petsToSwipe.length || !selectedPetId) return;

    swipingRef.current = true;
    const currentPetToSwipe = petsToSwipe[currentIndex];

    try {
      const result = await fetchWithError<SwipeResponse>('/api/swipe', {
        method: 'POST',
        body: JSON.stringify({
          fromPetId: selectedPetId,
          toPetId: currentPetToSwipe.id,
          isLike
        })
      });

      if (result.success && result.data?.matched) {
        setMatchNotification(currentPetToSwipe.name);
        setTimeout(() => setMatchNotification(null), 3000);
        fetchMatches();
      }

      setSwipeDirection(isLike ? 'right' : 'left');
      setCurrentIndex(prev => prev + 1);
    } finally {
      swipingRef.current = false;
    }
  };

  const handleLike = () => handleSwipe(true);
  const handlePass = () => handleSwipe(false);

  const currentPet = petsToSwipe[currentIndex];

  const RightSidebar = (
    <div className="space-y-6">
      <LostPetWidget />
      <QuickActions />
      <NextAppointment />
      <PetPairingWidget />
      <SuggestedPets selectedPetId={selectedPetId} />
    </div>
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-rounded w-12 h-12 text-teal-500 animate-spin mx-auto mb-4">progress_activity</span>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-rounded text-5xl text-white filled">pets</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Bienvenido a MascoTin</h2>
          <p className="text-slate-600 mb-6">
            Inicia sesión para encontrar amigos peludos para tu mascota
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            Iniciar Sesión
          </Button>
          <p className="mt-4 text-sm text-slate-600">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-rose-500 hover:underline font-semibold">
              Regístrate
            </Link>
          </p>
        </Card>
      </div>
    );
  }

  if (errorLoadingPets) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header session={session} />
        <main className="flex-1 container mx-auto px-4 py-6 flex flex-col items-center justify-center">
          <Card className="w-full max-w-md shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="material-symbols-rounded text-4xl text-white filled">error</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Error al cargar</h2>
            <p className="text-slate-600 mb-6">
              No se pudieron cargar tus mascotas. Por favor, intenta de nuevo.
            </p>
            <Button
              onClick={() => fetchMyPets()}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              <span className="material-symbols-rounded mr-2">refresh</span>
              Reintentar
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

  if (myPets.length === 0 && !loadingMyPets) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header session={session} />
        <main className="flex-1 container mx-auto px-4 py-6 flex flex-col items-center justify-center">
          <Card className="w-full max-w-md shadow-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="material-symbols-rounded text-4xl text-white filled">pets</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">¡Registra tu Primera Mascota!</h2>
            <p className="text-slate-600 mb-6">
              Para comenzar a encontrar amigos para tu mascota, primero necesitas registrarla.
            </p>
            <Button
              onClick={() => router.push('/create-pet')}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              <span className="material-symbols-rounded mr-2">add_circle</span>
              Registrar Mascota
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Header session={session} />

      <DashboardLayout
        leftSidebar={
          <PetProfileSidebar
            pet={myPets.find(p => p.id === selectedPetId) || null}
            pets={myPets}
            selectedPetId={selectedPetId}
            onSelectPet={(petId) => router.push(`/?petId=${petId}&tab=${activeTab}`)}
            onEdit={() => router.push(`/profile?petId=${selectedPetId}`)}
          />
        }
        rightSidebar={RightSidebar}
      >
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'home' | 'explore' | 'matches')} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-white shadow-sm border border-slate-200 rounded-xl p-1">
              <TabsTrigger value="home" onClick={() => setActiveTab('home')} className="data-[state=active]:bg-teal-600 data-[state=active]:text-white rounded-lg transition-all gap-2">
                <span className="material-symbols-rounded text-lg">home</span>
                Feed
              </TabsTrigger>
              <TabsTrigger value="explore" onClick={() => setActiveTab('explore')} className="data-[state=active]:bg-teal-600 data-[state=active]:text-white rounded-lg transition-all gap-2">
                <span className="material-symbols-rounded text-lg">explore</span>
                Explorar
              </TabsTrigger>
              <TabsTrigger value="matches" onClick={() => setActiveTab('matches')} className="data-[state=active]:bg-teal-600 data-[state=active]:text-white rounded-lg transition-all gap-2">
                <span className="material-symbols-rounded text-lg">favorite</span>
                Matches
              </TabsTrigger>
            </TabsList>

            {/* Tab Inicio - Stats y Feed */}
            <TabsContent value="home" className="space-y-6 mt-0">
              <HomeStats />
              <Feed
                currentUserId={session?.user?.id}
                currentUserImage={session?.user?.image || null}
                pets={myPets}
                selectedPetId={selectedPetId}
              />
            </TabsContent>

            {/* Tab Explorar - Swipe */}
            <TabsContent value="explore" className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Buscando mascotas cercanas...</p>
                  </div>
                </div>
              ) : currentIndex >= petsToSwipe.length ? (
                <Card className="flex items-center justify-center h-96 p-8 text-center bg-white shadow-sm border-slate-200">
                  <div>
                    <span className="material-symbols-rounded text-6xl text-teal-200 mx-auto mb-4 filled">pets</span>
                    <p className="text-xl font-semibold text-slate-700 mb-2">
                      ¡No hay más mascotas!
                    </p>
                    <Button onClick={fetchPetsForSwipe} className="bg-teal-600 hover:bg-teal-700 rounded-full px-6 mt-4">
                      Buscar de nuevo
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col items-center min-h-[500px]">
                  <div className="w-full max-w-sm relative">
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={currentPet?.id}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: swipeDirection === 'right' ? 200 : -200 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }}
                      >
                        {currentPet && <PetCard pet={currentPet} />}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="flex gap-6 mt-6 z-10">
                    <Button
                      onClick={handlePass}
                      size="lg"
                      className="rounded-full h-16 w-16 bg-white hover:bg-rose-50 text-rose-500 border-2 border-rose-100 shadow-lg hover:shadow-xl hover:scale-110 transition-all"
                    >
                      <span className="material-symbols-rounded text-3xl">close</span>
                    </Button>
                    <Button
                      onClick={handleLike}
                      size="lg"
                      className="rounded-full h-16 w-16 bg-teal-500 hover:bg-teal-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all border-4 border-white"
                    >
                      <span className="material-symbols-rounded text-3xl filled">favorite</span>
                    </Button>
                  </div>
                </div>
              )
              }
            </TabsContent>

            {/* Tab Matches */}
            <TabsContent value="matches" className="mt-0">
              <MatchesPanel matches={matches as Pet[]} currentUserId={session?.user?.id || ''} onRefresh={fetchMatches} />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>

      <AnimatePresence>
        {matchNotification && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -50 }}
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60]"
          >
            <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 shadow-2xl border-none">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded w-8 h-8 animate-pulse text-3xl filled">favorite</span>
                <div>
                  <p className="text-lg font-bold">¡It's a Match!</p>
                  <p className="text-sm opacity-90">Conectaste con {matchNotification}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} MascoTin. Plataforma para el bienestar de tu mascota.</p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex items-center justify-center">
        <span className="material-symbols-rounded w-12 h-12 text-teal-500 animate-spin">progress_activity</span>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
