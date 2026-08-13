'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import HomeStats from '@/components/HomeStats';
import Feed from '@/components/feed/Feed';
import PetProfileSidebar from '@/components/PetProfileSidebar';
import NextAppointment from '@/components/widgets/NextAppointment';
import LostPetWidget from '@/components/widgets/LostPetWidget';
import SuggestedPets from '@/components/widgets/SuggestedPets';
import DeferredVisibilitySection from '@/components/home/DeferredVisibilitySection';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import type {
  HomeAppointmentData,
  HomeBootstrapSuggestion,
  HomeLostPetPreview,
  HomePetHealthSummary,
  HomeStatsData,
} from '@/lib/server/home';
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
  initialStats: HomeStatsData;
  initialNextAppointment: HomeAppointmentData | null;
  initialFeedPosts: Post[];
  initialFeedNextCursor: string | null;
  initialFeedHasMore: boolean;
  initialLostPets?: HomeLostPetPreview[];
  initialSuggestions?: HomeBootstrapSuggestion[];
  initialHealthRecords?: HomePetHealthSummary[];
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

function WidgetSkeleton() {
  return (
    <Card className="p-5">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        <div className="h-16 bg-slate-200 rounded"></div>
      </div>
    </Card>
  );
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
  const params = new URLSearchParams();
  params.set('tab', nextTab);

  if (nextPetId) {
    params.set('petId', nextPetId);
  }

  const query = params.toString();
  window.history.replaceState(window.history.state, '', query ? `/?${query}` : '/');
}

export default function HomeClientShell({
  session,
  initialPets,
  initialSelectedPetId,
  initialStats,
  initialNextAppointment,
  initialFeedPosts,
  initialFeedNextCursor,
  initialFeedHasMore,
  initialLostPets = [],
  initialSuggestions = [],
  initialHealthRecords = [],
}: HomeClientShellProps) {
  const router = useRouter();
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
    return () => window.removeEventListener('popstate', onPopState);
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

  const rightSidebar = useMemo(
    () => (
      <div className="space-y-6">
        <DeferredVisibilitySection fallback={<WidgetSkeleton />}>
          <LostPetWidget initialPets={initialLostPets as never} />
        </DeferredVisibilitySection>
        <NextAppointment appointment={initialNextAppointment} />
        <DeferredVisibilitySection fallback={<WidgetSkeleton />}>
          <SuggestedPets
            selectedPetId={selectedPetId}
            initialSuggestions={initialSuggestions}
          />
        </DeferredVisibilitySection>
      </div>
    ),
    [
      initialLostPets,
      initialNextAppointment,
      selectedPetId,
      initialSuggestions,
    ]
  );

  return (
    <div className="bg-slate-50">
      <DashboardLayout
        leftSidebar={
          <PetProfileSidebar
            pet={myPets.find((pet) => pet.id === selectedPetId) || null}
            pets={myPets}
            selectedPetId={selectedPetId}
            initialHealthRecords={initialHealthRecords}
            onSelectPet={(petId) => syncHomeState(activeTab, petId)}
            onEdit={() => router.push(`/profile?petId=${selectedPetId}`)}
          />
        }
        rightSidebar={rightSidebar}
      >
        <div className="w-full">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              syncHomeState(value as HomeTab, selectedPetId);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-white border border-slate-200 rounded-lg p-1 h-auto">
              <TabsTrigger
                value="home"
                className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-none rounded-md transition-colors gap-2"
              >
                <span className="material-symbols-rounded text-lg">home</span>
                Feed
              </TabsTrigger>
              <TabsTrigger
                value="explore"
                className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-none rounded-md transition-colors gap-2"
              >
                <span className="material-symbols-rounded text-lg">explore</span>
                Explorar
              </TabsTrigger>
              <TabsTrigger
                value="matches"
                className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-none rounded-md transition-colors gap-2"
              >
                <span className="material-symbols-rounded text-lg">favorite</span>
                Matches
              </TabsTrigger>
            </TabsList>

            <TabsContent value="home" className="space-y-6 mt-0">
              <HomeStats stats={initialStats} />
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

            <TabsContent value="explore" className="mt-0">
              <ExploreTab
                petsToSwipe={petsToSwipe}
                currentIndex={currentIndex}
                loading={exploreLoading}
                onReload={() => void fetchPetsForSwipe(true)}
                onLike={() => void handleSwipe(true)}
                onPass={() => void handleSwipe(false)}
              />
            </TabsContent>

            <TabsContent value="matches" className="mt-0">
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
        <div className="fixed top-20 left-1/2 z-[60] animate-match-in">
          <div className="bg-teal-700 text-white px-6 py-3.5 rounded-lg shadow-lg border border-teal-600">
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded text-2xl filled">
                favorite
              </span>
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

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>
            © {new Date().getFullYear()} MascoTin. Plataforma para el bienestar
            de tu mascota.
          </p>
        </div>
      </footer>
    </div>
  );
}
