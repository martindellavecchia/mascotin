'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Pet } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { safeParseActivities, safeParseImages } from '@/lib/utils';

interface PetCardProps {
  pet: Pet;
  activePetName?: string;
  onLike?: () => void;
  onPass?: () => void;
  actionsDisabled?: boolean;
}

const ACTIVITY_LABELS: Record<string, { icon: string; label: string }> = {
  walk: { icon: 'eco', label: 'Paseos tranquilos' },
  walking: { icon: 'eco', label: 'Paseos tranquilos' },
  play: { icon: 'sports_baseball', label: 'Juguetona' },
  playing: { icon: 'sports_baseball', label: 'Juguetona' },
  fetch: { icon: 'sports_baseball', label: 'Le gusta buscar' },
  socialize: { icon: 'group', label: 'Sociable' },
  swim: { icon: 'pool', label: 'Le gusta nadar' },
  training: { icon: 'school', label: 'Entrenamiento' },
};

function getSizeLabel(size: string) {
  switch (size) {
    case 'small': return 'Pequeño';
    case 'medium': return 'Mediano';
    case 'large': return 'Grande';
    case 'xlarge': return 'Extra Grande';
    default: return size;
  }
}

function getEnergyLabel(energy: string) {
  if (energy === 'high') return 'Alta';
  if (energy === 'low') return 'Baja';
  return 'Media';
}

function isRenderableImage(source: string) {
  if (source.startsWith('/')) return true;

  try {
    const hostname = new URL(source).hostname;
    return hostname === 'images.unsplash.com' || hostname.endsWith('.neon.tech');
  } catch {
    return false;
  }
}

export default function PetCard({
  pet,
  activePetName,
  onLike,
  onPass,
  actionsDisabled = false,
}: PetCardProps) {
  const images = safeParseImages(typeof pet.images === 'string' ? pet.images : null)
    .filter((image): image is string => typeof image === 'string' && image.length > 0);
  const activities = Array.isArray(pet.activities)
    ? pet.activities
    : safeParseActivities(pet.activities);
  const [imageIndex, setImageIndex] = useState(0);

  const supportedImages = images.filter(isRenderableImage);
  const displayImages = supportedImages.length > 0
    ? supportedImages
    : ['/images/discovery-golden-retriever.png'];
  const mainImage = displayImages[Math.min(imageIndex, displayImages.length - 1)];

  const traits = activities
    .map((activity) => ACTIVITY_LABELS[activity.toLowerCase()])
    .filter((trait): trait is { icon: string; label: string } => Boolean(trait))
    .filter((trait, index, list) => list.findIndex((item) => item.label === trait.label) === index);

  if (!traits.some((trait) => trait.label === 'Sociable')) {
    traits.push({ icon: 'group', label: 'Sociable' });
  }
  if (pet.vaccinated) {
    traits.push({ icon: 'verified_user', label: 'Vacunas al día' });
  }

  const nextImage = () => {
    setImageIndex((current) => (current + 1) % displayImages.length);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid min-h-[650px] md:grid-cols-[47%_53%] 2xl:min-h-[720px]">
        <div className="relative min-h-[440px] overflow-hidden bg-slate-100 md:min-h-full">
          <Image
            src={mainImage}
            alt={`${pet.name} en su foto de perfil`}
            fill
            className="object-cover"
            sizes="(min-width: 1280px) 34vw, (min-width: 768px) 45vw, 100vw"
            priority
          />

          <span className="absolute left-5 top-5 rounded-lg bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-white">
            {imageIndex + 1} / {displayImages.length}
          </span>

          {displayImages.length > 1 && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={nextImage}
              className="absolute bottom-5 right-5 size-11 rounded-full border border-white/50 bg-white/90 text-slate-900 hover:bg-white"
              aria-label="Ver siguiente foto"
            >
              <span className="material-symbols-rounded">arrow_forward</span>
            </Button>
          )}
        </div>

        <div className="flex min-w-0 flex-col px-6 py-7 sm:px-8 sm:py-9 2xl:px-10">
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[38px]">
              {pet.name}, {pet.age} años
            </h2>
            <p className="mt-2 text-lg text-slate-700">{pet.breed || 'Mestizo'}</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="material-symbols-rounded text-xl">location_on</span>
              {pet.location || pet.owner?.location || 'Cerca de ti'}
            </p>
          </div>

          <div className="mt-7 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 border border-slate-200">
                {pet.owner?.image && <AvatarImage src={pet.owner.image} alt={pet.owner.name} />}
                <AvatarFallback className="bg-teal-50 text-sm font-bold text-teal-700">
                  {(pet.owner?.name || 'MascoTin').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <span className="truncate">{pet.owner?.name || 'Comunidad MascoTin'}</span>
                  <span className="material-symbols-rounded filled text-lg text-teal-600" aria-label="Perfil verificado">
                    verified
                  </span>
                </p>
                <p className="text-sm text-slate-500">Perfil verificado</p>
              </div>
            </div>
          </div>

          <div className="mt-7 flex gap-3 text-slate-700">
            <span className="material-symbols-rounded mt-0.5 text-2xl text-slate-400">favorite</span>
            <p className="text-[15px] leading-7">
              {pet.bio || `${pet.name} disfruta los paseos y conocer nuevos amigos.`}
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {pet.goodWithKids === 'yes' && (
              <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Bien con niños</Badge>
            )}
            {pet.goodWithDogs === 'yes' && (
              <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Bien con perros</Badge>
            )}
            {traits.slice(0, 3).map((trait) => (
              <span
                key={trait.label}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-slate-700"
              >
                <span className="material-symbols-rounded text-base text-teal-700">{trait.icon}</span>
                {trait.label}
              </span>
            ))}
          </div>

          <div className="sr-only">
            <span>{getSizeLabel(pet.size)}</span>
            <span>{getEnergyLabel(pet.energy)}</span>
            <span>Nivel {pet.level}</span>
            {activities.map((activity) => <span key={activity}>{activity}</span>)}
            {pet.vaccinated && <span>Vacunado</span>}
          </div>

          <div className="mt-auto border-t border-slate-200 pt-6">
            <p className="mb-5 text-sm text-slate-500">
              <span className="font-semibold text-slate-800">
                {pet.matchReason?.includes('paseo') ? 'Compañero de paseo' : 'Buena afinidad'}
              </span>
              {activePetName ? ` con ${activePetName}` : ''}
              {pet.matchReason ? `: ${pet.matchReason}` : ': comparten ritmo de paseo y sociabilidad.'}
            </p>
            <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onPass}
                disabled={actionsDisabled}
                className="h-12 rounded-xl border-slate-300 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Ahora no
              </Button>
              <Button
                type="button"
                onClick={onLike}
                disabled={actionsDisabled}
                className="h-12 rounded-xl bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <span className="material-symbols-rounded mr-2 text-lg filled">pets</span>
                Quiero conocer{pet.gender === 'female' ? 'la' : 'lo'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
