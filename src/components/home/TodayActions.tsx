import Link from 'next/link';
import { getHomeHref, handleHomeLink } from '@/lib/home-navigation';
import { CalendarDays, ChevronRight, Compass, HeartHandshake, Pencil } from 'lucide-react';
import { PetTypeIcon } from '@/components/PetTypeIcon';
import { getRenderableImageUrls } from '@/lib/media';
import type { HomeBootstrapSuggestion } from '@/lib/server/home';
import type { Pet } from '@/types';

interface TodayActionsProps {
  activePet?: Pet;
  suggestion?: Pick<HomeBootstrapSuggestion, 'name'>;
}

export default function TodayActions({ activePet, suggestion }: TodayActionsProps) {
  const needsProfile = Boolean(
    activePet && (
      !activePet.bio?.trim() ||
      !activePet.location?.trim() ||
      getRenderableImageUrls(activePet.images).length === 0
    )
  );
  const actions = [
    {
      href: getHomeHref('explore', activePet?.id),
      title: suggestion ? `Conocé a ${suggestion.name}` : 'Conocé una mascota',
      description: `Una compañía compatible con ${activePet?.name || 'tu mascota'}.`,
      icon: Compass,
    },
    {
      href: '/community/events',
      title: 'Encontrá un evento',
      description: 'Paseos, ferias y actividades cerca tuyo.',
      icon: CalendarDays,
    },
    {
      href: '/hogares-de-transito',
      title: 'Ayudá a un hogar',
      description: 'Casos concretos y distintas formas de dar una mano.',
      icon: HeartHandshake,
    },
  ];

  return (
    <section aria-labelledby="today-title" className="space-y-3">
      <h2 id="today-title" className="text-lg font-semibold text-foreground">
        Para hoy con {activePet?.name || 'tu mascota'}
      </h2>

      <div className="grid gap-3 md:grid-cols-3">
        {actions.map((action, index) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              onClick={handleHomeLink}
              className="group flex min-w-0 items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-control hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:flex-col"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                {index === 0 && activePet ? (
                  <PetTypeIcon petType={activePet.petType} className="size-5" />
                ) : (
                  <Icon className="size-5" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">{action.title}</span>
                <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">{action.description}</span>
              </span>
              <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 md:hidden" aria-hidden="true" />
            </Link>
          );
        })}
      </div>

      {needsProfile && activePet && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">El perfil básico de {activePet.name} ya está listo.</p>
            <p className="mt-1 text-sm text-muted-foreground">Sumá foto, ubicación e historia para mejorar las recomendaciones.</p>
          </div>
          <Link
            href={`/profile?petId=${activePet.id}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Completar perfil
          </Link>
        </div>
      )}
    </section>
  );
}
