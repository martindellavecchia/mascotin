'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Pet } from '@/types';
import { getPrimaryImageUrl, isRenderableImage, shouldUnoptimizeImage } from '@/lib/media';

function MatchAvatar({
  images,
  primaryImageUrl,
  name,
}: {
  images: string | string[] | null | undefined;
  primaryImageUrl?: string | null;
  name: string;
}) {
  const primary = isRenderableImage(primaryImageUrl)
    ? primaryImageUrl
    : getPrimaryImageUrl(images);
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
}

export default function MatchesPanel({ matches }: MatchesPanelProps) {
  const router = useRouter();

  const openChat = (match: Pet) => {
    if (!match.matchId) return;
    router.push(`/messages?matchId=${match.matchId}`);
  };

  return (
    <div className="h-full">
      {matches.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <span className="material-symbols-rounded text-5xl text-slate-300">favorite</span>
          <h3 className="mt-4 text-lg font-semibold text-slate-800">Todavía no hay coincidencias</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Cuando hagas match, van a aparecer acá para chatear en Mensajes.
          </p>
          <button
            type="button"
            onClick={() => router.push('/?tab=explore')}
            className="mt-6 min-h-11 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Ir a Descubrir
          </button>
        </div>
      ) : (
        <ScrollArea className="min-h-[320px] h-[calc(100dvh-220px)]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {matches.map((match) => (
              <Card
                key={match.id}
                className="min-w-0 cursor-pointer border-slate-200 shadow-sm transition-colors hover:border-teal-200"
                onClick={() => openChat(match)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <MatchAvatar
                      images={match.images}
                      primaryImageUrl={match.primaryImageUrl}
                      name={match.name}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-slate-900">{match.name}</h3>
                      <p className="truncate text-sm text-slate-500">
                        {(match.bio || 'Nueva conexión').substring(0, 50)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-teal-700">Abrir chat</p>
                    </div>
                    <span className="material-symbols-rounded text-slate-400">chevron_right</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
