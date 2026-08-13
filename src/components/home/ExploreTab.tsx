'use client';

import { useEffect, useState } from 'react';
import type { Pet } from '@/types';
import PetCard from '@/components/PetCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExploreTabProps {
  petsToSwipe: Pet[];
  currentIndex: number;
  loading: boolean;
  onReload: () => void;
  onLike: () => void;
  onPass: () => void;
}

export default function ExploreTab({
  petsToSwipe,
  currentIndex,
  loading,
  onReload,
  onLike,
  onPass,
}: ExploreTabProps) {
  const currentPet = petsToSwipe[currentIndex];
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(
    null
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Buscando mascotas cercanas...</p>
        </div>
      </div>
    );
  }

  if (currentIndex >= petsToSwipe.length || !currentPet) {
    return (
      <Card className="flex items-center justify-center h-96 p-8 text-center bg-white shadow-sm border-slate-200">
        <div>
          <span className="material-symbols-rounded text-6xl text-teal-200 mx-auto mb-4 filled">
            pets
          </span>
          <p className="text-xl font-semibold text-slate-700 mb-2">
            No hay más mascotas
          </p>
          <Button
            onClick={onReload}
            className="bg-teal-700 hover:bg-teal-800 rounded-lg px-6 mt-4"
          >
            Buscar de nuevo
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[500px]">
      <div
        className={`w-full max-w-sm relative ${
          exitDirection === 'left'
            ? 'animate-swipe-out-left'
            : exitDirection === 'right'
              ? 'animate-swipe-out-right'
              : 'animate-fade-in'
        }`}
      >
        <PetCard pet={currentPet} />
      </div>

      <div className="flex gap-6 mt-6 z-10">
        <Button
          onClick={handlePass}
          size="lg"
          disabled={Boolean(exitDirection)}
          className="rounded-full h-16 w-16 bg-white hover:bg-slate-50 text-slate-600 border-2 border-slate-200 shadow-md transition-colors"
        >
          <span className="material-symbols-rounded text-3xl">close</span>
        </Button>
        <Button
          onClick={handleLike}
          size="lg"
          disabled={Boolean(exitDirection)}
          className="rounded-full h-16 w-16 bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-colors border-4 border-white"
        >
          <span className="material-symbols-rounded text-3xl filled">
            favorite
          </span>
        </Button>
      </div>
    </div>
  );
}
