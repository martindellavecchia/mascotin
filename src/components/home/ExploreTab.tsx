'use client';

import { useEffect, useState } from 'react';
import { MapPin, PawPrint, ShieldCheck, SlidersHorizontal } from 'lucide-react';
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
    <section aria-labelledby="discover-title">
      <div className="mb-7 flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-start">
        <div>
          <h1 id="discover-title" className="text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
            Descubrir
          </h1>
          <p className="mt-2 text-muted-foreground">Conocé mascotas compatibles con {activePet?.name || 'tu mascota'}.</p>
        </div>
        <Link
          href="/settings"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-white"
          aria-label="Preferencias de zona"
        >
          <MapPin className="size-6" aria-hidden="true" />
          {activePet?.location || 'Tu zona'}
          <SlidersHorizontal className="size-5" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[min(420px,calc(100dvh-14rem))] items-center justify-center rounded-lg border border-border bg-surface">
          <div className="text-center">
            <div className="mx-auto mb-4 size-11 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />
            <p className="text-sm font-medium text-slate-600">Buscando mascotas cercanas...</p>
          </div>
        </div>
      ) : currentIndex >= petsToSwipe.length || !currentPet ? (
        <div className="flex min-h-[min(420px,calc(100dvh-14rem))] items-center justify-center rounded-lg border border-border bg-surface p-8 text-center">
          <div className="max-w-sm">
            <PawPrint className="size-16 text-teal-200" fill="currentColor" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Ya conociste a todos por aquí</h2>
            <p className="mt-2 text-slate-500">Actualizá la búsqueda para descubrir nuevas mascotas cerca tuyo.</p>
            <Button onClick={onReload} className="mt-6 px-6">
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

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-5" aria-hidden="true" />
        Coordiná el primer encuentro en un espacio público y compartí el plan con alguien de confianza.
      </p>
    </section>
  );
}
