'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Heart, MapPin, PawPrint } from 'lucide-react';
import type { Pet } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getImageUrlsWithPrimaryFirst, shouldUnoptimizeImage } from '@/lib/media';
import { getPetTypeLabel } from '@/lib/petTypeIcon';
import { safeParseActivities } from '@/lib/utils';

interface PetCardProps {
  pet: Pet;
  activePetName?: string;
  onLike?: () => void;
  onPass?: () => void;
  actionsDisabled?: boolean;
}

const ACTIVITY_LABELS: Record<string, string> = {
  walk: 'Paseos tranquilos',
  walking: 'Paseos tranquilos',
  play: 'Juguetona',
  playing: 'Juguetona',
  fetch: 'Le gusta buscar',
  socialize: 'Sociable',
  swim: 'Le gusta nadar',
  training: 'Entrenamiento',
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

export default function PetCard({
  pet,
  activePetName,
  onLike,
  onPass,
  actionsDisabled = false,
}: PetCardProps) {
  const images = getImageUrlsWithPrimaryFirst(pet.images, pet.thumbnailIndex);
  const activities = Array.isArray(pet.activities)
    ? pet.activities
    : safeParseActivities(pet.activities);
  const [imageIndex, setImageIndex] = useState(0);

  const displayImages = images;
  const mainImage = displayImages[Math.min(imageIndex, Math.max(displayImages.length - 1, 0))];
  const hasImage = Boolean(mainImage);

  const traits = [
    pet.goodWithKids === 'yes' ? 'Bien con niños' : null,
    pet.goodWithDogs === 'yes' ? 'Bien con perros' : null,
    ...activities.map((activity) => ACTIVITY_LABELS[activity.toLowerCase()]),
    pet.vaccinated ? 'Vacunas al día' : null,
  ]
    .filter((trait): trait is string => Boolean(trait))
    .filter((trait, index, list) => list.indexOf(trait) === index);

  const nextImage = () => {
    if (displayImages.length === 0) return;
    setImageIndex((current) => (current + 1) % displayImages.length);
  };

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid min-h-0 lg:min-h-[520px] lg:grid-cols-[47%_53%] 2xl:min-h-[640px]">
        <div className="relative min-h-[200px] overflow-hidden bg-muted sm:min-h-[240px] lg:min-h-full">
          {hasImage ? (
            <Image
              src={mainImage}
              alt={`${pet.name} en su foto de perfil`}
              fill
              className="object-cover"
              sizes="(min-width: 1536px) 30vw, (min-width: 1024px) 42vw, 100vw"
              priority
              unoptimized={shouldUnoptimizeImage(mainImage)}
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center sm:min-h-[240px]">
              <PawPrint className="size-16 text-primary/25" aria-hidden="true" />
            </div>
          )}

          {displayImages.length > 1 && (
            <span className="absolute left-4 top-4 rounded-md bg-foreground/75 px-2.5 py-1 text-xs font-semibold text-white">
              {imageIndex + 1} / {displayImages.length}
            </span>
          )}

          {displayImages.length > 1 && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={nextImage}
              className="absolute bottom-4 right-4 size-11 rounded-md bg-surface/90 text-foreground hover:bg-surface"
              aria-label="Ver siguiente foto"
            >
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          )}
        </div>

        <div className="flex min-w-0 flex-col px-5 py-6 sm:px-8 sm:py-8 2xl:px-10">
          <div>
            <h2 className="break-words text-3xl font-bold leading-tight tracking-[-0.035em] text-foreground sm:text-4xl">
              {pet.name}{pet.age > 0 ? `, ${pet.age} años` : ''}
            </h2>
            <p className="mt-1.5 text-lg text-muted-foreground">{pet.breed || getPetTypeLabel(pet.petType)}</p>
            <p className="mt-3 flex min-w-0 items-start gap-1.5 break-words text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {pet.location || pet.owner?.location || 'Cerca tuyo'}
            </p>
            {(pet.size || pet.energy) && (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground" aria-label="Características">
                {pet.size && (
                  <li>
                    Tamaño <span className="font-semibold text-foreground">{getSizeLabel(pet.size)}</span>
                  </li>
                )}
                {pet.energy && (
                  <li>
                    Energía <span className="font-semibold text-foreground">{getEnergyLabel(pet.energy)}</span>
                  </li>
                )}
              </ul>
            )}
          </div>

          <p className="mt-6 min-w-0 break-words text-[15px] leading-7 text-foreground">
            {pet.bio || `Todavía no completaron la historia de ${pet.name}.`}
          </p>

          {traits.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Rasgos">
              {traits.slice(0, 5).map((trait) => (
                <li key={trait} className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                  {trait}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
            <Avatar className="size-10">
              {pet.owner?.image && <AvatarImage src={pet.owner.image} alt={pet.owner.name} />}
              <AvatarFallback className="text-sm">
                {(pet.owner?.name || 'Huella').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">
                {pet.owner?.name || 'Comunidad Huella'}
              </p>
              <p className="text-sm text-muted-foreground">Responsable en Huella</p>
            </div>
          </div>

          <div className="sr-only">
            <span>Nivel {pet.level}</span>
            {activities.map((activity) => <span key={activity}>{activity}</span>)}
            {pet.vaccinated && <span>Vacunado</span>}
          </div>

          <div className="min-h-6 flex-1" aria-hidden="true" />
          <div className="border-t border-border pt-5">
            <p className="mb-5 break-words text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Por qué podría llevarse bien</span>
              {activePetName ? ` con ${activePetName}` : ''}
              {pet.matchReason ? `: ${pet.matchReason}` : ': revisá su perfil y preferencias antes de decidir.'}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <Button
                type="button"
                variant="outline"
                onClick={onPass}
                disabled={actionsDisabled}
                aria-keyshortcuts="ArrowLeft"
                className="h-12 text-sm"
              >
                Ahora no
              </Button>
              <Button
                type="button"
                onClick={onLike}
                disabled={actionsDisabled}
                aria-keyshortcuts="ArrowRight"
                className="h-12 text-sm"
              >
                <Heart className="size-5" aria-hidden="true" />
                Quiero conocer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
