'use client';

import { useEffect, useState } from 'react';
import type { Pet } from '@/types';
import PetCard from '@/components/PetCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ExploreTabProps {
  petsToSwipe: Pet[];
  currentIndex: number;
  loading: boolean;
  activePet?: Pet;
  onReload: () => void;
  onLike: () => void;
  onPass: () => void;
}

export default function ExploreTab({
  petsToSwipe,
  currentIndex,
  loading,
  activePet,
  onReload,
  onLike,
  onPass,
}: ExploreTabProps) {
  const currentPet = petsToSwipe[currentIndex];
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    setExitDirection(null);
  }, [currentIndex, currentPet?.id]);

  const handlePass = () => {
    if (exitDirection) return;
    setExitDirection('left');
    window.setTimeout(() => onPass(), 260);
  };

  const handleLike = () => {
    if (exitDirection) return;
    setExitDirection('right');
    window.setTimeout(() => onLike(), 260);
  };

  return (
    <section aria-labelledby="plaza-social-title">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 id="plaza-social-title" className="text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Plaza social
          </h1>
          <p className="mt-2 text-slate-500">Conoce mascotas cerca de ti y amplía su mundo.</p>
        </div>
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
          aria-label="Preferencias de zona"
        >
          <span className="material-symbols-rounded text-xl">location_on</span>
          {activePet?.location || 'Tu zona'}
          <span className="material-symbols-rounded text-lg">tune</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[min(420px,calc(100dvh-14rem))] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <div className="mx-auto mb-4 size-11 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />
            <p className="text-sm font-medium text-slate-600">Buscando mascotas cercanas...</p>
          </div>
        </div>
      ) : currentIndex >= petsToSwipe.length || !currentPet ? (
        <div className="flex min-h-[min(420px,calc(100dvh-14rem))] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="max-w-sm">
            <span className="material-symbols-rounded filled text-6xl text-teal-200">pets</span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Ya conociste a todos por aquí</h2>
            <p className="mt-2 text-slate-500">Actualiza la plaza para descubrir nuevas mascotas cerca de ti.</p>
            <Button onClick={onReload} className="mt-6 h-11 rounded-xl bg-teal-600 px-6 hover:bg-teal-700">
              Buscar de nuevo
            </Button>
          </div>
        </div>
      ) : (
        <div className={exitDirection === 'left' ? 'animate-swipe-out-left' : exitDirection === 'right' ? 'animate-swipe-out-right' : 'animate-fade-in'}>
          <PetCard
            pet={currentPet}
            activePetName={activePet?.name}
            onPass={handlePass}
            onLike={handleLike}
            actionsDisabled={Boolean(exitDirection)}
          />
        </div>
      )}

      <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
        <span className="material-symbols-rounded text-lg">verified_user</span>
        Perfiles verificados para tu tranquilidad. Conecta siempre en espacios seguros.
      </p>
    </section>
  );
}
