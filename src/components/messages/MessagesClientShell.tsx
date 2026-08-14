'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
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
    <div className="h-full flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

const GroupChat = dynamic(() => import('@/components/groups/GroupChat'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  ),
});

const QuickActions = dynamic(
  () => import('@/components/widgets/QuickActions'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="h-24 bg-slate-200 rounded animate-pulse" />
      </div>
    ),
  }
);

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
        <div className="flex h-full flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-400">
          <span className="material-symbols-rounded mb-4 text-6xl text-slate-300">
            chat_bubble
          </span>
          <h3 className="mb-2 text-xl font-semibold text-slate-600">
            Tus Mensajes
          </h3>
          <p>Selecciona una conversación o grupo para comenzar a chatear.</p>
        </div>
      );
    }

    if (selectedType === 'group') {
      const group = groups.find((item) => item.id === selectedId);

      return (
        <div className="flex h-full flex-col">
          <div className="z-10 flex items-center gap-3 border-b bg-white p-4 shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={clearSelection}
              aria-label="Volver a conversaciones"
            >
              <span className="material-symbols-rounded">arrow_back</span>
            </Button>
            <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-200">
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
            <div>
              <h2 className="font-bold text-slate-800">{group?.name}</h2>
              <p className="text-xs text-slate-500">Grupo de Interés</p>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-slate-50 p-4">
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
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b bg-white p-2 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            aria-label="Volver a conversaciones"
          >
            <span className="material-symbols-rounded">arrow_back</span>
          </Button>
          <span className="text-sm font-medium text-slate-700">Conversación</span>
        </div>
        <div className="min-h-0 flex-1">
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
    <div className="flex flex-col bg-slate-50">
      <div className="container mx-auto grid flex-1 grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-4">
        <div
          className={`flex max-h-[calc(100vh-140px)] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:max-h-[calc(100vh-120px)] ${
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
          className={`lg:col-span-2 max-h-[calc(100vh-140px)] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:max-h-[calc(100vh-120px)] ${
            showList ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {renderContent()}
        </div>

        <div className="lg:col-span-1 hidden max-h-[calc(100vh-140px)] overflow-y-auto lg:block lg:max-h-[calc(100vh-120px)]">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
