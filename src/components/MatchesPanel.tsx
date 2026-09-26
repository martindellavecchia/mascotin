'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, CloudOff, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Pet } from '@/types';
import { getPrimaryImageUrl, isRenderableImage, shouldUnoptimizeImage } from '@/lib/media';

function MatchAvatar({
  images,
  primaryImageUrl,
  thumbnailIndex,
  name,
}: {
  images: string | string[] | null | undefined;
  primaryImageUrl?: string | null;
  thumbnailIndex?: number;
  name: string;
}) {
  const primary = isRenderableImage(primaryImageUrl)
    ? primaryImageUrl
    : getPrimaryImageUrl(images, thumbnailIndex ?? 0);
  const src = isRenderableImage(primary) ? primary : null;

  return (
    <Avatar className="h-16 w-16">
      {src ? (
        <AvatarImage asChild>
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt={name}
              fill
              className="rounded-full object-cover"
              unoptimized={shouldUnoptimizeImage(src)}
            />
          </div>
        </AvatarImage>
      ) : null}
      <AvatarFallback className="bg-teal-50 text-lg font-semibold text-teal-700">
        {name?.[0] || '?'}
      </AvatarFallback>
    </Avatar>
  );
}

interface MatchesPanelProps {
  matches: Pet[];
  currentUserId: string;
  onRefresh: () => void;
  loadError?: boolean;
}

export default function MatchesPanel({ matches, onRefresh, loadError = false }: MatchesPanelProps) {
  if (loadError) {
    return (
      <div
        role="alert"
        className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-12 text-center"
      >
        <CloudOff className="size-12 text-muted-foreground" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">No pudimos cargar tu círculo</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Revisá tu conexión y reintentá. Tus coincidencias siguen guardadas.
        </p>
        <Button type="button" onClick={onRefresh} className="mt-6">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full">
      {matches.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <Heart className="size-12 text-slate-300" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-slate-800">Todavía no hay coincidencias</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Cuando haya interés mutuo, las mascotas van a aparecer acá para chatear en Mensajes.
          </p>
          <Button asChild className="mt-6">
            <Link href="/inicio?tab=explore">Ir a Descubrir</Link>
          </Button>
        </div>
      ) : (
        <ScrollArea className="min-h-[320px] h-[calc(100dvh-220px)]">
          <ul className="grid grid-cols-1 gap-4 p-1 md:grid-cols-2 2xl:grid-cols-3">
            {matches.map((match) => {
              const content = (
                <div className="flex items-center gap-4">
                  <MatchAvatar
                    images={match.images}
                    primaryImageUrl={match.primaryImageUrl}
                    thumbnailIndex={match.thumbnailIndex}
                    name={match.name}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-slate-900">{match.name}</h3>
                    <p className="truncate text-sm text-slate-500">
                      {(match.bio || 'Nueva conexión').substring(0, 50)}
                    </p>
                    {match.matchId && (
                      <p className="mt-1 text-xs font-medium text-teal-700">Abrir chat</p>
                    )}
                  </div>
                  {match.matchId && <ChevronRight className="text-slate-400" aria-hidden="true" />}
                </div>
              );
              const cardClassName =
                'block min-w-0 rounded-xl border border-slate-200 bg-card p-4 text-card-foreground shadow-sm';

              return (
                <li key={match.matchId || match.id} className="min-w-0">
                  {match.matchId ? (
                    <Link
                      href={`/messages?matchId=${match.matchId}`}
                      aria-label={`Abrir chat con ${match.name}`}
                      className={`${cardClassName} transition-colors hover:border-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={cardClassName}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
