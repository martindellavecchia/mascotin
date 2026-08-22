import Link from 'next/link';
import { ArrowRight, CalendarDays, Compass, HeartHandshake, Pencil } from 'lucide-react';
import { PetTypeIcon } from '@/components/PetTypeIcon';
import { getRenderableImageUrls } from '@/lib/media';
import type { HomeBootstrapSuggestion } from '@/lib/server/home';
import type { Pet } from '@/types';

interface TodayActionsProps {
  activePet?: Pet;
  suggestion?: HomeBootstrapSuggestion;
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
      href: '/inicio?tab=explore',
      title: suggestion ? `Conocé a ${suggestion.name}` : 'Conocé una mascota',
      description: `Descubrí una compañía compatible con ${activePet?.name || 'tu mascota'}.`,
      icon: Compass,
    },
    {
      href: '/community/events',
      title: 'Encontrá un evento',
      description: 'Buscá un paseo, una feria o una actividad cerca tuyo.',
      icon: CalendarDays,
    },
    {
      href: '/hogares-de-transito',
      title: 'Ayudá a un hogar',
      description: 'Conocé casos concretos y elegí cómo dar una mano.',
      icon: HeartHandshake,
    },
  ];

  return (
    <section aria-labelledby="today-title" className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Para hoy</p>
        <h2 id="today-title" className="mt-1 text-2xl font-bold tracking-[-0.03em] text-foreground">
          Elegí una acción con {activePet?.name || 'tu mascota'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Tres caminos claros para empezar, sin ruido alrededor.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {actions.map((action, index) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex min-h-44 flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/35 hover:bg-primary-soft/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className={`flex size-11 items-center justify-center rounded-lg ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-primary-soft text-primary'}`}>
                {index === 0 && activePet ? (
                  <PetTypeIcon petType={activePet.petType} className="size-6" />
                ) : (
                  <Icon className="size-6" aria-hidden="true" />
                )}
              </span>
              <h3 className="mt-5 font-semibold text-foreground">{action.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{action.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Ir ahora <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      {needsProfile && activePet && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">El perfil básico de {activePet.name} ya está listo.</p>
            <p className="mt-1 text-sm text-muted-foreground">Sumá foto, ubicación e historia cuando quieras para mejorar las recomendaciones.</p>
          </div>
          <Link
            href={`/profile?petId=${activePet.id}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Completar perfil
          </Link>
        </div>
      )}
    </section>
  );
}
