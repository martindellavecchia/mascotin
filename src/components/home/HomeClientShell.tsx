'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Compass, Heart, PawPrint } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Feed from '@/components/feed/Feed';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import type { Pet, SwipeResponse } from '@/types';
import type { Post } from '@/types';

const MatchesPanel = dynamic(() => import('@/components/MatchesPanel'), {
  ssr: false,
  loading: () => <PanelSkeleton label="Cargando matches..." />,
});

const ExploreTab = dynamic(() => import('@/components/home/ExploreTab'), {
  ssr: false,
  loading: () => <PanelSkeleton label="Preparando exploración..." tall />,
});

type HomeTab = 'home' | 'explore' | 'matches';

interface HomeClientShellProps {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      headerImage?: string | null;
    };
  } | null;
  initialPets: Pet[];
  initialSelectedPetId?: string;
  initialFeedPosts: Post[];
  initialFeedNextCursor: string | null;
  initialFeedHasMore: boolean;
}

function getValidTab(value: string | null): HomeTab {
  if (value === 'explore' || value === 'matches') {
    return value;
  }

  return 'home';
}

function readHomeUrlState(pets: Pet[], fallbackPetId?: string) {
  if (typeof window === 'undefined') {
    return {
      tab: 'home' as HomeTab,
      petId: fallbackPetId || pets[0]?.id,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const petFromUrl = params.get('petId');
  const petId =
    petFromUrl && pets.some((pet) => pet.id === petFromUrl)
      ? petFromUrl
      : fallbackPetId || pets[0]?.id;

  return {
    tab: getValidTab(params.get('tab')),
    petId,
  };
}

function PanelSkeleton({
  label,
  tall = false,
}: {
  label: string;
  tall?: boolean;
}) {
  return (
    <Card
      className={`flex items-center justify-center ${
        tall ? 'h-96' : 'h-64'
      }`}
    >
      <div className="text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p>{label}</p>
      </div>
    </Card>
  );
}

function writeShallowHomeUrl(nextTab: HomeTab, nextPetId?: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', nextTab);

  if (nextPetId) {
    params.set('petId', nextPetId);
  } else {
    params.delete('petId');
  }

  const query = params.toString();
  const pathname = window.location.pathname || '/';
  window.history.replaceState(
    window.history.state,
    '',
    query ? `${pathname}?${query}` : pathname
  );
  window.dispatchEvent(new Event('huella:home-tab'));
}

export default function HomeClientShell({
  session,
  initialPets,
  initialSelectedPetId,
  initialFeedPosts,
  initialFeedNextCursor,
  initialFeedHasMore,
}: HomeClientShellProps) {
  const { fetchWithError } = useFetchWithError();
  const myPets = initialPets;
  const [activeTab, setActiveTab] = useState<HomeTab>('home');
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>(
    initialSelectedPetId || initialPets[0]?.id
  );
  const [petsToSwipe, setPetsToSwipe] = useState<Pet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<Pet[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [hasLoadedMatches, setHasLoadedMatches] = useState(false);
  const [matchNotification, setMatchNotification] = useState<string | null>(null);
  const swipingRef = useRef(false);
  const lastExplorePetIdRef = useRef<string | null>(null);
  const urlHydratedRef = useRef(false);
  const activePet = myPets.find((pet) => pet.id === selectedPetId) || myPets[0];

  useEffect(() => {
    if (urlHydratedRef.current) return;
    urlHydratedRef.current = true;
    const fromUrl = readHomeUrlState(myPets, initialSelectedPetId);
    setActiveTab(fromUrl.tab);
    setSelectedPetId(fromUrl.petId);
  }, [initialSelectedPetId, myPets]);

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = readHomeUrlState(myPets, initialSelectedPetId);
      setActiveTab(fromUrl.tab);
      setSelectedPetId(fromUrl.petId);
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('huella:home-tab', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('huella:home-tab', onPopState);
    };
  }, [initialSelectedPetId, myPets]);

  useEffect(() => {
    const prefetch = () => {
      void import('@/components/home/ExploreTab');
      void import('@/components/MatchesPanel');
    };

    const timer = window.setTimeout(prefetch, 800);
    return () => window.clearTimeout(timer);
  }, []);

  const syncHomeState = (nextTab: HomeTab, nextPetId?: string) => {
    setActiveTab(nextTab);
    if (nextPetId) {
      setSelectedPetId(nextPetId);
    }

    if (nextTab === 'explore') {
      setExploreLoading(true);
    }
    if (nextTab === 'matches' && !hasLoadedMatches) {
      setMatchesLoading(true);
    }

    writeShallowHomeUrl(nextTab, nextPetId ?? selectedPetId);
  };

  const fetchMatches = async () => {
    setMatchesLoading(true);
    const result = await fetchWithError<{ matches: Pet[] }>('/api/matches');

    if (result.success && result.data) {
      setMatches(result.data.matches || []);
      setHasLoadedMatches(true);
    }

    setMatchesLoading(false);
  };

  const fetchPetsForSwipe = async (force = false) => {
    if (!selectedPetId) {
      setExploreLoading(false);
      return;
    }
    if (!force && lastExplorePetIdRef.current === selectedPetId) {
      setExploreLoading(false);
      return;
    }

    setExploreLoading(true);
    const result = await fetchWithError<{ pets: Pet[] }>(
      `/api/pets?currentPetId=${selectedPetId}`
    );

    if (result.success && result.data) {
      setPetsToSwipe(result.data.pets || []);
      setCurrentIndex(0);
      lastExplorePetIdRef.current = selectedPetId;
    }

    setExploreLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'matches' && !hasLoadedMatches) {
      void fetchMatches();
    }
  }, [activeTab, hasLoadedMatches]);

  useEffect(() => {
    if (activeTab === 'explore' && selectedPetId) {
      void fetchPetsForSwipe();
    }
  }, [activeTab, selectedPetId]);

  const handleSwipe = async (isLike: boolean) => {
    if (swipingRef.current) return;
    if (currentIndex >= petsToSwipe.length || !selectedPetId) return;

    swipingRef.current = true;
    const currentPet = petsToSwipe[currentIndex];

    try {
      const result = await fetchWithError<SwipeResponse>('/api/swipe', {
        method: 'POST',
        body: JSON.stringify({
          fromPetId: selectedPetId,
          toPetId: currentPet.id,
          isLike,
        }),
      });

      if (result.success && result.data?.matched) {
        setMatchNotification(currentPet.name);
        setTimeout(() => setMatchNotification(null), 3000);

        if (hasLoadedMatches) {
          void fetchMatches();
        }
      }

      setCurrentIndex((previous) => previous + 1);
    } finally {
      swipingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardLayout>
        <div className="min-w-0 w-full">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              syncHomeState(value as HomeTab, selectedPetId);
            }}
            className="w-full"
          >
            <TabsContent value="home" className="min-w-0 space-y-6 mt-0">
              <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">Inicio</h1>
                  <p className="mt-2 text-muted-foreground">Novedades de tu comunidad y de {activePet?.name}.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="tonal" onClick={() => syncHomeState('matches', selectedPetId)}>
                    <Heart className="size-4" aria-hidden="true" />
                    Tu círculo
                  </Button>
                  {activePet && (
                    <Select value={selectedPetId} onValueChange={(petId) => syncHomeState(activeTab, petId)}>
                      <SelectTrigger aria-label="Mascota activa" className="w-[min(15rem,70vw)]">
                        <PawPrint className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {myPets.map((pet) => <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <Feed
                currentUserId={session?.user?.id}
                currentUserImage={
                  session?.user?.headerImage || session?.user?.image || null
                }
                pets={myPets}
                selectedPetId={selectedPetId}
                initialPosts={initialFeedPosts}
                initialNextCursor={initialFeedNextCursor}
                initialHasMore={initialFeedHasMore}
              />
            </TabsContent>

            <TabsContent value="explore" className="min-w-0 mt-0">
              <ExploreTab
                petsToSwipe={petsToSwipe}
                currentIndex={currentIndex}
                loading={exploreLoading}
                activePet={activePet}
                onReload={() => void fetchPetsForSwipe(true)}
                onLike={() => void handleSwipe(true)}
                onPass={() => void handleSwipe(false)}
              />
            </TabsContent>

            <TabsContent value="matches" className="min-w-0 mt-0">
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                  <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">Tu círculo</h1>
                  <p className="mt-2 text-muted-foreground">Mascotas con las que hubo interés mutuo.</p>
                </div>
                <Button variant="tonal" onClick={() => syncHomeState('explore', selectedPetId)}>
                  <Compass className="size-4" aria-hidden="true" />
                  Seguir descubriendo
                </Button>
              </div>
              {matchesLoading && !hasLoadedMatches ? (
                <PanelSkeleton label="Cargando matches..." />
              ) : (
                <MatchesPanel
                  matches={matches}
                  currentUserId={session?.user?.id || ''}
                  onRefresh={fetchMatches}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>

      {matchNotification && (
        <div className="fixed left-1/2 top-20 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-match-in">
          <div className="rounded-lg border border-teal-600 bg-teal-700 px-5 py-3.5 text-white shadow-lg sm:px-6">
            <div className="flex items-center gap-3">
              <Heart className="size-7" fill="currentColor" aria-hidden="true" />
              <div>
                <p className="text-base font-semibold">¡Es un match!</p>
                <p className="text-sm text-teal-100">
                  Conectaste con {matchNotification}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
