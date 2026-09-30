'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StateFeedback } from '@/components/ui/state-feedback';
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { mergeMessagesById } from '@/lib/messages';
import { LoadingSpinner } from '@/components/ui/loading';
import type { GroupMessage } from '@/types/messages';

interface GroupMessagePageResponse {
  messages: GroupMessage[];
  latestCursor: string | null;
  hasMoreBefore: boolean;
}

interface GroupChatProps {
  groupId: string;
  currentUserId: string;
  className?: string;
}

export default function GroupChat({
  groupId,
  currentUserId,
  className,
}: GroupChatProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [latestCursor, setLatestCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [hasMoreBefore, setHasMoreBefore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { fetchWithError, abort } = useFetchWithError();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emptyConversationCursorRef = useRef<string | null>(null);
  const scrollRestoreRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  useLayoutEffect(() => {
    const node = scrollContainerRef.current;
    const snapshot = scrollRestoreRef.current;
    if (!node || !snapshot) return;
    node.scrollTop = node.scrollHeight - snapshot.scrollHeight + snapshot.scrollTop;
    scrollRestoreRef.current = null;
  }, [messages]);

  const isNearBottom = useCallback(() => {
    const node = scrollContainerRef.current;

    if (!node) {
      return true;
    }

    const distanceFromBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;

    return distanceFromBottom < 96;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const applyPage = useCallback(
    (
      page: GroupMessagePageResponse,
      options?: { replace?: boolean; autoScroll?: boolean }
    ) => {
      const nextMessages = page.messages || [];
      const shouldAutoScroll = options?.autoScroll ?? true;

      setMessages((previous) =>
        options?.replace ? nextMessages : mergeMessagesById(previous, nextMessages)
      );

      if (page.latestCursor) {
        setLatestCursor(page.latestCursor);
        emptyConversationCursorRef.current = null;
      } else if (options?.replace) {
        emptyConversationCursorRef.current = new Date().toISOString();
      }

      if (shouldAutoScroll) {
        requestAnimationFrame(() => scrollToBottom(options?.replace ? 'auto' : 'smooth'));
      }
    },
    [scrollToBottom]
  );

  const loadInitialMessages = useCallback(async () => {
    const result = await fetchWithError<GroupMessagePageResponse>(
      `/api/groups/${groupId}/messages?limit=50`,
      {
        showError: false,
      }
    );

    if (result.success && result.data) {
      setLoadError(false);
      setHasMoreBefore(Boolean(result.data.hasMoreBefore));
      applyPage(result.data, { replace: true, autoScroll: true });
    } else {
      setLoadError(true);
    }
  }, [applyPage, fetchWithError, groupId]);

  const loadOlderMessages = async () => {
    const oldest = messages.find((message) => !message.id.startsWith('temp-'));
    if (!oldest || loadingOlder) return;

    setLoadingOlder(true);
    setOlderError(false);
    const params = new URLSearchParams({ limit: '50', before: oldest.createdAt });
    const result = await fetchWithError<GroupMessagePageResponse>(
      `/api/groups/${groupId}/messages?${params.toString()}`,
      { showError: false }
    );

    if (result.success && result.data) {
      const node = scrollContainerRef.current;
      if (node) {
        scrollRestoreRef.current = { scrollHeight: node.scrollHeight, scrollTop: node.scrollTop };
      }
      setHasMoreBefore(Boolean(result.data.hasMoreBefore));
      setMessages((previous) => mergeMessagesById(previous, result.data!.messages || []));
    } else {
      setOlderError(true);
    }
    setLoadingOlder(false);
  };

  const pollForNewMessages = useCallback(async () => {
    const params = new URLSearchParams({
      limit: '50',
    });
    const cursor = latestCursor || emptyConversationCursorRef.current;

    if (cursor) {
      params.set('after', cursor);
    }

    const result = await fetchWithError<GroupMessagePageResponse>(
      `/api/groups/${groupId}/messages?${params.toString()}`,
      {
        showError: false,
      }
    );

    if (result.success && result.data) {
      const incomingMessages = result.data.messages || [];

      if (incomingMessages.length === 0) {
        if (!latestCursor && !emptyConversationCursorRef.current) {
          emptyConversationCursorRef.current = new Date().toISOString();
        }
        return;
      }

      applyPage(result.data, {
        replace: false,
        autoScroll: isNearBottom(),
      });
    }
  }, [applyPage, fetchWithError, groupId, isNearBottom, latestCursor]);

  const { markActivity } = useAdaptivePolling({
    enabled: Boolean(groupId) && !loading && !loadError,
    onPoll: pollForNewMessages,
    activeIntervalMs: 5_000,
    idleIntervalMs: 15_000,
    immediate: false,
  });

  useEffect(() => {
    if (!groupId) {
      return;
    }

    setLoading(true);
    setLoadError(false);
    setMessages([]);
    setLatestCursor(null);
    setHasMoreBefore(false);
    setOlderError(false);
    emptyConversationCursorRef.current = null;

    loadInitialMessages().finally(() => {
      setLoading(false);
    });

    return () => {
      abort();
    };
  }, [abort, groupId, loadInitialMessages, reloadKey]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newMessage.trim() || sending) return;

    markActivity();
    setSending(true);

    const messageToSend = newMessage.trim();
    const tempMessage: GroupMessage = {
      id: `temp-${Date.now()}`,
      content: messageToSend,
      senderId: currentUserId,
      groupId,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: 'Vos',
        image: null,
      },
    };

    setMessages((previous) => [...previous, tempMessage]);
    setNewMessage('');
    requestAnimationFrame(() => scrollToBottom('smooth'));

    const result = await fetchWithError<{ message: GroupMessage }>(
      `/api/groups/${groupId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content: messageToSend }),
        showError: true,
      }
    );

    if (result.success && result.data?.message) {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === tempMessage.id ? result.data!.message : message
        )
      );
      setLatestCursor(result.data.message.createdAt);
      emptyConversationCursorRef.current = null;
    } else {
      setMessages((previous) =>
        previous.filter((message) => message.id !== tempMessage.id)
      );
      setNewMessage(messageToSend);
    }

    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card className={`flex h-full min-h-0 min-w-0 items-center justify-center overflow-hidden ${className || ''}`}>
        <LoadingSpinner size="lg" />
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className={`flex h-full min-h-0 min-w-0 items-center justify-center overflow-hidden p-4 ${className || ''}`}>
        <StateFeedback
          status="error"
          title="No pudimos cargar el chat del grupo"
          description="Revisá tu conexión e intentá de nuevo."
          action={<Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>Reintentar</Button>}
        />
      </Card>
    );
  }

  return (
    <Card className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${className || ''}`}>
      <div
        ref={scrollContainerRef}
        className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-4"
      >
        {hasMoreBefore && (
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadOlderMessages()}
              disabled={loadingOlder}
            >
              {loadingOlder && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {loadingOlder ? 'Cargando…' : 'Cargar mensajes anteriores'}
            </Button>
            {olderError && (
              <p role="alert" className="text-xs text-destructive">No pudimos cargar mensajes anteriores. Intentá de nuevo.</p>
            )}
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-10">
            <p>No hay mensajes aún.</p>
            <p className="text-xs">Iniciá la conversación.</p>
          </div>
        )}
        {messages.map((message) => {
          const isMine = message.senderId === currentUserId;

          return (
            <div
              key={message.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`min-w-0 max-w-[85%] rounded-lg p-3 sm:max-w-[70%] ${
                  isMine ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {!isMine && (
                  <p className="mb-1 text-xs font-bold opacity-70 [overflow-wrap:anywhere]">
                    {message.sender.name}
                  </p>
                )}
                <p className="text-sm [overflow-wrap:anywhere]">{message.content}</p>
                <p className="text-[10px] mt-1 opacity-70 text-right">
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-4">
        <form onSubmit={handleSend} className="flex min-w-0 gap-2">
          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder="Escribí un mensaje..."
            aria-label="Mensaje para el grupo"
            autoComplete="off"
            className="h-11 min-w-0 flex-1"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Enviar mensaje"
            variant="brand"
            className="h-11 w-11 shrink-0 bg-teal-500 hover:bg-teal-600"
            disabled={sending}
          >
            {sending ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
