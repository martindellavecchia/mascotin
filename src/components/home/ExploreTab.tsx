'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CloudOff, MapPin, PawPrint, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import PetCard from '@/components/PetCard';
import { Button } from '@/components/ui/button';
import type { Pet } from '@/types';

interface ExploreTabProps {
  petsToSwipe: Pet[];
  currentIndex: number;
  loading: boolean;
  error?: boolean;
  activePet?: Pet;
  onReload: () => void;
  onLike: () => void | Promise<void>;
  onPass: () => void | Promise<void>;
}

const INTERACTIVE_ROLES = [
  'combobox',
  'listbox',
  'menu',
  'menuitem',
  'option',
  'radio',
  'radiogroup',
  'slider',
  'spinbutton',
  'tab',
  'tablist',
  'textbox',
];

function shouldIgnoreSwipeKey(event: KeyboardEvent) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return true;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  if (target) {
    if (target.isContentEditable) return true;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
    if (target.closest(INTERACTIVE_ROLES.map((role) => `[role="${role}"]`).join(','))) return true;
  }

  return Boolean(
    document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [aria-modal="true"]')
  );
}

export default function ExploreTab({
  petsToSwipe,
  currentIndex,
  loading,
  error = false,
  activePet,
  onReload,
  onLike,
  onPass,
}: ExploreTabProps) {
  const currentPet = petsToSwipe[currentIndex];
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const canSwipe = !loading && !error && Boolean(currentPet);

  useEffect(() => {
    setExitDirection(null);
  }, [currentIndex, currentPet?.id]);

  const handlePass = () => {
    if (exitDirection) return;
    setExitDirection('left');
    window.setTimeout(async () => {
      try { await onPass(); } finally { setExitDirection(null); }
    }, 260);
  };

  const handleLike = () => {
    if (exitDirection) return;
    setExitDirection('right');
    window.setTimeout(async () => {
      try { await onLike(); } finally { setExitDirection(null); }
    }, 260);
  };

  const swipeHandlersRef = useRef({ handlePass, handleLike });
  useEffect(() => {
    swipeHandlersRef.current = { handlePass, handleLike };
  });

  useEffect(() => {
    if (!canSwipe) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (shouldIgnoreSwipeKey(event)) return;

      event.preventDefault();
      if (event.key === 'ArrowLeft') {
        swipeHandlersRef.current.handlePass();
      } else {
        swipeHandlersRef.current.handleLike();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canSwipe]);

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
      ) : error ? (
        <div
          role="alert"
          className="flex min-h-[min(420px,calc(100dvh-14rem))] items-center justify-center rounded-lg border border-border bg-surface p-8 text-center"
        >
          <div className="max-w-sm">
            <CloudOff className="mx-auto size-14 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">No pudimos cargar mascotas</h2>
            <p className="mt-2 text-muted-foreground">Revisá tu conexión y reintentá. Tus decisiones anteriores siguen guardadas.</p>
            <Button onClick={onReload} className="mt-6 px-6">
              Reintentar
            </Button>
          </div>
        </div>
      ) : !currentPet ? (
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
        <>
          <div className={exitDirection === 'left' ? 'animate-swipe-out-left' : exitDirection === 'right' ? 'animate-swipe-out-right' : 'animate-fade-in'}>
            <PetCard
              pet={currentPet}
              activePetName={activePet?.name}
              onPass={handlePass}
              onLike={handleLike}
              actionsDisabled={Boolean(exitDirection)}
            />
          </div>
          <p className="mt-3 hidden text-xs text-muted-foreground sm:block">
            Atajos de teclado: <kbd className="rounded border border-border bg-surface px-1.5 font-sans">←</kbd> Ahora no
            {' · '}
            <kbd className="rounded border border-border bg-surface px-1.5 font-sans">→</kbd> Quiero conocer
          </p>
        </>
      )}

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-5" aria-hidden="true" />
        Coordiná el primer encuentro en un espacio público y compartí el plan con alguien de confianza.
      </p>
    </section>
  );
}
