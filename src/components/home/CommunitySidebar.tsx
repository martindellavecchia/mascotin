'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Pet } from '@/types';
import type { HomeBootstrapSuggestion } from '@/lib/server/home';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isRenderableImage, shouldUnoptimizeImage } from '@/lib/media';

interface CommunitySidebarProps {
  session: {
    user?: {
      name?: string | null;
      image?: string | null;
      headerImage?: string | null;
    };
  } | null;
  matches: Pet[];
  suggestions: HomeBootstrapSuggestion[];
  onOpenMatches: () => void;
}

const FALLBACK_PETS = [
  { id: 'bruno', name: 'Bruno', breed: 'Bulldog francés', image: '/images/circle-french-bulldog.png', meta: 'Conectaron ayer' },
  { id: 'lola', name: 'Lola', breed: 'Caniche toy', image: '/images/circle-apricot-poodle.png', meta: 'Conectaron hace 3 días' },
  { id: 'simba', name: 'Simba', breed: 'Border collie', image: '/images/circle-border-collie.png', meta: 'Conectaron esta semana' },
];

export default function CommunitySidebar({
  session,
  matches,
  suggestions,
  onOpenMatches,
}: CommunitySidebarProps) {
  const realPets = matches.length > 0
    ? matches.slice(0, 3).map((pet) => ({
        id: pet.id,
        name: pet.name,
        breed: pet.breed || 'Nuevo amigo',
        image: (() => {
          try {
            const parsed = JSON.parse(pet.images);
            return Array.isArray(parsed) ? parsed[0] : null;
          } catch {
            return pet.images || null;
          }
        })(),
        meta: 'Conexión reciente',
      }))
    : suggestions.length > 0
      ? suggestions.slice(0, 3).map((pet) => ({
          id: pet.id,
          name: pet.name,
          breed: pet.breed || 'Mascota cercana',
          image: pet.image,
          meta: pet.matchReason,
        }))
      : FALLBACK_PETS;

  const userImage = session?.user?.headerImage || session?.user?.image;

  return (
    <div className="pt-4 lg:pt-8">
      <section aria-labelledby="circle-title">
        <div className="flex items-center justify-between">
          <h2 id="circle-title" className="text-lg font-bold tracking-tight text-slate-900">Tu círculo</h2>
          <button type="button" onClick={onOpenMatches} className="text-xs font-semibold text-teal-700 hover:text-teal-800">
            Ver todo
          </button>
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {realPets.map((pet, index) => {
            const imageSource = isRenderableImage(pet.image)
              ? pet.image
              : FALLBACK_PETS[index % FALLBACK_PETS.length].image;

            return (
            <button
              type="button"
              key={pet.id}
              onClick={onOpenMatches}
              className="flex w-full items-center gap-3 py-4 text-left group"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                {imageSource ? (
                  <Image
                    src={imageSource}
                    alt={pet.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                    unoptimized={shouldUnoptimizeImage(imageSource)}
                  />
                ) : (
                  <span className="material-symbols-rounded flex size-full items-center justify-center text-teal-600">pets</span>
                )}
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{pet.name}</span>
                <span className="block truncate text-xs text-slate-500">{pet.breed}</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-400">{pet.meta}</span>
              </span>
              <span className="material-symbols-rounded text-lg text-slate-400 transition-transform group-hover:translate-x-0.5">chevron_right</span>
            </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8 border-t border-slate-200 pt-8" aria-labelledby="message-preview-title">
        <div className="flex items-center justify-between">
          <h2 id="message-preview-title" className="text-lg font-bold tracking-tight text-slate-900">Mensajes</h2>
          <Link href="/messages" className="text-xs font-semibold text-teal-700 hover:text-teal-800">Ver todos</Link>
        </div>
        <Link href="/messages" className="mt-5 flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-white">
          <Avatar className="size-11 shrink-0 border border-slate-200">
            {userImage && <AvatarImage src={userImage} alt={session?.user?.name || 'Tu perfil'} />}
            <AvatarFallback className="bg-teal-50 font-semibold text-teal-700">
              {(session?.user?.name || 'M').slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-slate-900">Comunidad MascoTin</span>
              <span className="size-2 rounded-full bg-orange-500" aria-label="Mensaje sin leer" />
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">Tus nuevas conexiones te están esperando.</span>
          </span>
        </Link>
      </section>
    </div>
  );
}
