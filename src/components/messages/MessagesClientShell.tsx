'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import Header from '@/components/Header';
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

const ConversationList = dynamic(
  () => import('@/components/messages/ConversationList'),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 space-y-4">
        <div className="h-10 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex gap-3 items-center animate-pulse">
              <div className="w-12 h-12 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  }
);

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
  initialSelectedId?: string | null;
  initialSelectedType?: 'match' | 'group' | null;
}

interface GroupListItem extends MessageGroupListItem {
  isMember?: boolean;
}

export default function MessagesClientShell({
  session,
  initialMatches,
  initialGroups,
  initialSelectedId = null,
  initialSelectedType = null,
}: MessagesClientShellProps) {
  const [matches, setMatches] = useState<MatchWithPet[]>(initialMatches);
  const [groups, setGroups] = useState<MessageGroupListItem[]>(initialGroups);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [selectedType, setSelectedType] = useState<'match' | 'group' | null>(
    initialSelectedType
  );
  const { fetchWithError } = useFetchWithError();

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
  };

  const renderContent = () => {
    if (!selectedId || !selectedType) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50">
          <span className="material-symbols-rounded text-6xl mb-4 text-slate-300">
            chat_bubble
          </span>
          <h3 className="text-xl font-semibold text-slate-600 mb-2">
            Tus Mensajes
          </h3>
          <p>Selecciona una conversación o grupo para comenzar a chatear.</p>
        </div>
      );
    }

    if (selectedType === 'group') {
      const group = groups.find((item) => item.id === selectedId);

      return (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b bg-white flex items-center gap-3 shadow-sm z-10">
            <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden">
              {group?.image && (
                <Image
                  src={group.image}
                  alt={group?.name || 'Grupo'}
                  width={40}
                  height={40}
                  unoptimized={shouldUnoptimizeImage(group.image)}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <h2 className="font-bold text-slate-800">{group?.name}</h2>
              <p className="text-xs text-slate-500">Grupo de Interés</p>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-4 bg-slate-50">
            <GroupChat
              groupId={selectedId}
              currentUserId={session?.user?.id || ''}
              className="shadow-none border-0 bg-transparent"
            />
          </div>
        </div>
      );
    }

    const match = matches.find((item) => item.matchId === selectedId);

    return (
      <ChatWindow
        matchId={selectedId}
        currentUserId={session?.user?.id || ''}
        otherPet={match}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header session={session} />
      <div className="container mx-auto px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col max-h-[calc(100vh-140px)] lg:max-h-[calc(100vh-120px)]">
          <ConversationList
            matches={matches}
            groups={groups}
            selectedId={selectedId}
            selectedType={selectedType}
            onSelect={handleSelect}
          />
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col max-h-[calc(100vh-140px)] lg:max-h-[calc(100vh-120px)]">
          {renderContent()}
        </div>

        <div className="lg:col-span-1 hidden lg:block max-h-[calc(100vh-140px)] lg:max-h-[calc(100vh-120px)] overflow-y-auto">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
