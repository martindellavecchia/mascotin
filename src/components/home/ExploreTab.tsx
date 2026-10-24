'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CloudOff, PawPrint, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import PetCard from '@/components/PetCard';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
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
      <div className="mb-6 flex flex-col justify-between gap-3 border-b border-border pb-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 id="discover-title" className="text-2xl font-bold tracking-[-0.035em] text-foreground sm:text-3xl">
            Descubrir
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">Conocé mascotas compatibles con {activePet?.name || 'tu mascota'}.</p>
        </div>
        <Button asChild variant="outline" className="w-fit shrink-0">
          <Link
            href={'/settings?' + new URLSearchParams({ tab: 'mascotas', from: 'discover', ...(activePet ? { petId: activePet.id } : {}) }).toString() + '#preferencias-matching'}
            aria-label="Preferencias de búsqueda"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Preferencias de búsqueda
          </Link>
        </Button>
      </div>

      {loading ? (
        <div role="status" className="flex min-h-[min(420px,calc(100dvh-14rem))] items-center justify-center rounded-lg border border-border bg-surface">
          <div className="text-center">
            <LoadingSpinner className="mb-3" />
            <p className="text-sm text-muted-foreground">Buscando mascotas cercanas…</p>
          </div>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex min-h-[min(420px,calc(100dvh-14rem))] items-center justify-center rounded-lg border border-border bg-surface p-8 text-center"
        >
          <div className="max-w-sm">
            <CloudOff className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">No pudimos cargar mascotas</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Revisá tu conexión y reintentá. Tus decisiones anteriores siguen guardadas.</p>
            <Button onClick={onReload} variant="outline" className="mt-5">
              Reintentar
            </Button>
          </div>
        </div>
      ) : !currentPet ? (
        <div className="flex min-h-[min(420px,calc(100dvh-14rem))] items-center justify-center rounded-lg border border-border bg-surface p-8 text-center">
          <div className="max-w-sm">
            <PawPrint className="mx-auto size-10 text-primary/35" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Ya conociste a todos por aquí</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Actualizá la búsqueda para descubrir nuevas mascotas cerca tuyo.</p>
            <Button onClick={onReload} variant="outline" className="mt-5">
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

      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Coordiná el primer encuentro en un espacio público y compartí el plan con alguien de confianza.
      </p>
    </section>
  );
}
