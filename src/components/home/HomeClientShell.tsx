'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import DashboardLayout from '@/components/DashboardLayout';
import HomeStats from '@/components/HomeStats';
import NextAppointment from '@/components/widgets/NextAppointment';
import DeferredVisibilitySection from '@/components/home/DeferredVisibilitySection';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import type { HomeAppointmentData, HomeStatsData } from '@/lib/server/home';
import type { Pet, SwipeResponse } from '@/types';

const Feed = dynamic(() => import('@/components/feed/Feed'), {
  ssr: false,
  loading: () => <SectionSkeleton rows={2} />,
});

const MatchesPanel = dynamic(() => import('@/components/MatchesPanel'), {
  ssr: false,
  loading: () => <PanelSkeleton label="Cargando matches..." />,
});

const ExploreTab = dynamic(() => import('@/components/home/ExploreTab'), {
  ssr: false,
  loading: () => <PanelSkeleton label="Preparando exploración..." tall />,
});

const SuggestedPets = dynamic(
  () => import('@/components/widgets/SuggestedPets'),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
);

const PetProfileSidebar = dynamic(
  () => import('@/components/PetProfileSidebar'),
  {
    ssr: false,
    loading: () => <SidebarSkeleton />,
  }
);

const QuickActions = dynamic(
  () => import('@/components/widgets/QuickActions'),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
);

const PetPairingWidget = dynamic(
  () => import('@/components/widgets/PetPairingWidget'),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
);

const LostPetWidget = dynamic(
  () => import('@/components/widgets/LostPetWidget'),
  {
    ssr: false,
    loading: () => <WidgetSkeleton />,
  }
);

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
}

function getValidTab(value: string | null): HomeTab {
  if (value === 'explore' || value === 'matches') {
    return value;
  }

  return 'home';
}

function SectionSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="bg-white p-4 rounded-xl shadow-sm h-40 animate-pulse"
        >
          <div className="flex gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
          <div className="h-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
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

function SidebarSkeleton() {
  return (
    <Card className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="w-24 h-24 rounded-full bg-slate-200 mx-auto" />
        <div className="h-5 bg-slate-200 rounded w-1/2 mx-auto" />
        <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-slate-200 rounded-xl" />
          <div className="h-16 bg-slate-200 rounded-xl" />
        </div>
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

export default function HomeClientShell({
  session,
  initialPets,
  initialSelectedPetId,
  initialStats,
  initialNextAppointment,
}: HomeClientShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchWithError } = useFetchWithError();
  const [activeTab, setActiveTab] = useState<HomeTab>(() =>
    getValidTab(searchParams.get('tab'))
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

  const tabParam = searchParams.get('tab');
  const petIdParam = searchParams.get('petId');
  const myPets = initialPets;
  const selectedPetId = useMemo(() => {
    if (petIdParam && myPets.some((pet) => pet.id === petIdParam)) {
      return petIdParam;
    }

    return initialSelectedPetId || myPets[0]?.id;
  }, [initialSelectedPetId, myPets, petIdParam]);

  useEffect(() => {
    const nextTab = getValidTab(tabParam);
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, tabParam]);

  const updateUrl = (nextTab: HomeTab, nextPetId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', nextTab);

    if (nextPetId) {
      params.set('petId', nextPetId);
    } else {
      params.delete('petId');
    }

    router.replace(`/?${params.toString()}`, { scroll: false });
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
    if (!selectedPetId) return;
    if (!force && lastExplorePetIdRef.current === selectedPetId) return;

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

  const rightSidebar = (
    <div className="space-y-6">
      <DeferredVisibilitySection fallback={<WidgetSkeleton />}>
        <LostPetWidget />
      </DeferredVisibilitySection>
      <QuickActions />
      <NextAppointment appointment={initialNextAppointment} />
      <PetPairingWidget />
      <DeferredVisibilitySection fallback={<WidgetSkeleton />}>
        <SuggestedPets selectedPetId={selectedPetId} />
      </DeferredVisibilitySection>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Header session={session} />

      <DashboardLayout
        leftSidebar={
          <PetProfileSidebar
            pet={myPets.find((pet) => pet.id === selectedPetId) || null}
            pets={myPets}
            selectedPetId={selectedPetId}
            onSelectPet={(petId) => updateUrl(activeTab, petId)}
            onEdit={() => router.push(`/profile?petId=${selectedPetId}`)}
          />
        }
        rightSidebar={rightSidebar}
      >
        <div className="w-full">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              const nextTab = value as HomeTab;
              setActiveTab(nextTab);
              updateUrl(nextTab, selectedPetId);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-white shadow-sm border border-slate-200 rounded-xl p-1">
              <TabsTrigger
                value="home"
                className="data-[state=active]:bg-teal-600 data-[state=active]:text-white rounded-lg transition-all gap-2"
              >
                <span className="material-symbols-rounded text-lg">home</span>
                Feed
              </TabsTrigger>
              <TabsTrigger
                value="explore"
                className="data-[state=active]:bg-teal-600 data-[state=active]:text-white rounded-lg transition-all gap-2"
              >
                <span className="material-symbols-rounded text-lg">explore</span>
                Explorar
              </TabsTrigger>
              <TabsTrigger
                value="matches"
                className="data-[state=active]:bg-teal-600 data-[state=active]:text-white rounded-lg transition-all gap-2"
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
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60]">
          <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 shadow-2xl border-none">
            <div className="flex items-center gap-3">
              <span className="material-symbols-rounded w-8 h-8 animate-pulse text-3xl filled">
                favorite
              </span>
              <div>
                <p className="text-lg font-bold">¡It's a Match!</p>
                <p className="text-sm opacity-90">
                  Conectaste con {matchNotification}
                </p>
              </div>
            </div>
          </Card>
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
