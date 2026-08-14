'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Pet } from '@/types';
import type { HomeBootstrapSuggestion } from '@/lib/server/home';
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

export default function CommunitySidebar({
  matches,
  suggestions,
  onOpenMatches,
}: CommunitySidebarProps) {
  const realPets =
    matches.length > 0
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
      : suggestions.slice(0, 3).map((pet) => ({
          id: pet.id,
          name: pet.name,
          breed: pet.breed || 'Mascota cercana',
          image: pet.image,
          meta: pet.matchReason,
        }));

  return (
    <div className="pt-4 lg:pt-8">
      <section aria-labelledby="circle-title">
        <div className="flex items-center justify-between">
          <h2 id="circle-title" className="text-lg font-bold tracking-tight text-slate-900">
            Tu círculo
          </h2>
          <button
            type="button"
            onClick={onOpenMatches}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            Ver todo
          </button>
        </div>

        {realPets.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
            <span className="material-symbols-rounded text-4xl text-slate-300">pets</span>
            <p className="mt-3 text-sm font-medium text-slate-800">Todavía no tenés conexiones</p>
            <p className="mt-1 text-xs text-slate-500">Descubrí mascotas cerca y ampliá tu círculo.</p>
            <Link
              href="/?tab=explore"
              className="mt-4 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Ir a Descubrir
            </Link>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {realPets.map((pet) => {
              const imageSource = isRenderableImage(pet.image) ? pet.image : null;

              return (
                <button
                  type="button"
                  key={pet.id}
                  onClick={onOpenMatches}
                  className="group flex w-full items-center gap-3 py-4 text-left"
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
                      <span className="material-symbols-rounded flex size-full items-center justify-center text-xl text-teal-600">
                        pets
                      </span>
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{pet.name}</span>
                    <span className="block truncate text-xs text-slate-500">{pet.breed}</span>
                    {pet.meta && (
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">{pet.meta}</span>
                    )}
                  </span>
                  <span className="material-symbols-rounded text-lg text-slate-400 transition-transform group-hover:translate-x-0.5">
                    chevron_right
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8 border-t border-slate-200 pt-8" aria-labelledby="message-preview-title">
        <div className="flex items-center justify-between">
          <h2 id="message-preview-title" className="text-lg font-bold tracking-tight text-slate-900">
            Mensajes
          </h2>
          <Link href="/messages" className="text-xs font-semibold text-teal-700 hover:text-teal-800">
            Ver todos
          </Link>
        </div>
        <Link
          href="/messages"
          className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-teal-200"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <span className="material-symbols-rounded text-xl">chat_bubble</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">Abrir mensajes</span>
            <span className="mt-0.5 block text-xs text-slate-500">Chateá con tus conexiones</span>
          </span>
          <span className="material-symbols-rounded text-lg text-slate-400">chevron_right</span>
        </Link>
      </section>
    </div>
  );
}
