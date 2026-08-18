'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import ConversationList from '@/components/messages/ConversationList';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { shouldUnoptimizeImage } from '@/lib/media';
import type { MessageGroupListItem } from '@/lib/server/messages';
import type { MatchWithPet } from '@/types/messages';

const ChatWindow = dynamic(() => import('@/components/messages/ChatWindow'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-0 min-w-0 items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

const GroupChat = dynamic(() => import('@/components/groups/GroupChat'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-0 min-w-0 items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

interface MessagesClientShellProps {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      headerImage?: string | null;
    };
  } | null;
  initialMatches: MatchWithPet[];
  initialGroups: MessageGroupListItem[];
}

interface GroupListItem extends MessageGroupListItem {
  isMember?: boolean;
}

function readMessagesUrlState() {
  if (typeof window === 'undefined') {
    return { selectedId: null as string | null, selectedType: null as 'match' | 'group' | null };
  }

  const params = new URLSearchParams(window.location.search);
  const groupId = params.get('groupId');
  const matchId = params.get('matchId');

  if (groupId) {
    return { selectedId: groupId, selectedType: 'group' as const };
  }

  if (matchId) {
    return { selectedId: matchId, selectedType: 'match' as const };
  }

  return { selectedId: null, selectedType: null };
}

export default function MessagesClientShell({
  session,
  initialMatches,
  initialGroups,
}: MessagesClientShellProps) {
  const [matches, setMatches] = useState<MatchWithPet[]>(initialMatches);
  const [groups, setGroups] = useState<MessageGroupListItem[]>(initialGroups);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'match' | 'group' | null>(null);
  const urlHydratedRef = useRef(false);
  const { fetchWithError } = useFetchWithError();

  useEffect(() => {
    if (urlHydratedRef.current) return;
    urlHydratedRef.current = true;
    const fromUrl = readMessagesUrlState();
    setSelectedId(fromUrl.selectedId);
    setSelectedType(fromUrl.selectedType);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = readMessagesUrlState();
      setSelectedId(fromUrl.selectedId);
      setSelectedType(fromUrl.selectedType);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const fetchDirectory = async () => {
    const [matchesResult, groupsResult] = await Promise.all([
      fetchWithError<{ matches: MatchWithPet[] }>('/api/matches', {
        showError: false,
      }),
      fetchWithError<{ groups: GroupListItem[] }>(
        `/api/groups?userId=${session?.user?.id}`,
        {
          showError: false,
        }
      ),
    ]);

    if (matchesResult.success && matchesResult.data) {
      setMatches(matchesResult.data.matches || []);
    }

    if (groupsResult.success && groupsResult.data) {
      setGroups(groupsResult.data.groups.filter((group) => group.isMember));
    }
  };

  useAdaptivePolling({
    enabled: Boolean(session?.user?.id),
    onPoll: fetchDirectory,
    activeIntervalMs: 60_000,
    idleIntervalMs: 60_000,
    immediate: false,
  });

  const handleSelect = (id: string, type: 'match' | 'group') => {
    setSelectedId(id);
    setSelectedType(type);
    const params = new URLSearchParams();
    if (type === 'group') {
      params.set('groupId', id);
    } else {
      params.set('matchId', id);
    }
    window.history.replaceState(null, '', `/messages?${params.toString()}`);
  };

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedType(null);
    window.history.replaceState(null, '', '/messages');
  };

  const renderContent = () => {
    if (!selectedId || !selectedType) {
      return (
        <div className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center bg-background p-6 text-center text-muted-foreground sm:p-8">
          <MessageCircle className="mb-4 size-12 text-primary/30" aria-hidden="true" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Tus mensajes
          </h3>
          <p className="max-w-md [overflow-wrap:anywhere]">Elegí una conversación o un grupo para empezar a chatear.</p>
        </div>
      );
    }

    if (selectedType === 'group') {
      const group = groups.find((item) => item.id === selectedId);

      return (
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="z-10 flex min-w-0 shrink-0 items-center gap-3 border-b border-border bg-surface p-3 sm:p-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={clearSelection}
              aria-label="Volver a conversaciones"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Button>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
              {group?.image && (
                <Image
                  src={group.image}
                  alt={group?.name || 'Grupo'}
                  width={40}
                  height={40}
                  unoptimized={shouldUnoptimizeImage(group.image)}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-bold text-slate-800">{group?.name}</h2>
              <p className="text-xs text-slate-500">Grupo de Interés</p>
            </div>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-background p-2 sm:p-4">
            <GroupChat
              groupId={selectedId}
              currentUserId={session?.user?.id || ''}
              className="border-0 bg-transparent shadow-none"
            />
          </div>
        </div>
      );
    }

    const match = matches.find((item) => item.matchId === selectedId);

    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface p-2 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            aria-label="Volver a conversaciones"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
          <span className="text-sm font-medium text-slate-700">Conversación</span>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ChatWindow
            matchId={selectedId}
            currentUserId={session?.user?.id || ''}
            otherPet={match}
          />
        </div>
      </div>
    );
  };

  const showList = !selectedId;
  const showChat = Boolean(selectedId);

  return (
    <div className="h-[calc(100dvh-8rem)] min-h-0 min-w-0 bg-background lg:h-dvh">
      <div className="mx-auto grid h-full max-w-6xl min-w-0 grid-cols-1 gap-0 p-0 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:p-8">
        <div
          className={`h-full min-h-0 min-w-0 flex-col overflow-hidden border-x-0 border-y border-border bg-surface sm:rounded-xl sm:border ${
            showChat ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <ConversationList
            matches={matches}
            groups={groups}
            selectedId={selectedId}
            selectedType={selectedType}
            onSelect={handleSelect}
          />
        </div>

        <div
          className={`h-full min-h-0 min-w-0 flex-col overflow-hidden border-x-0 border-y border-border bg-surface sm:rounded-xl sm:border ${
            showList ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
