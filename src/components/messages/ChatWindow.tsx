'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, CheckCheck, CircleAlert, CloudOff, Hand, LoaderCircle, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import MeetupPanel from '@/components/messages/MeetupPanel';
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { mergeMessagesById } from '@/lib/messages';
import { getPrimaryImageUrl } from '@/lib/media';
import type { MatchWithPet, Message } from '@/types/messages';

interface MessagePageResponse {
  messages: Message[];
  latestCursor: string | null;
  hasMoreBefore: boolean;
  markedRead?: number;
  lastSeenAt?: string | null;
}

type ChatMessage = Message & { status?: 'sending' | 'failed' };

interface ChatWindowProps {
  matchId: string;
  currentUserId: string;
  otherPet?: MatchWithPet;
  onMessagesRead?: (matchId: string) => void;
}

const PAGE_SIZE = 50;

export default function ChatWindow({
  matchId,
  currentUserId,
  otherPet,
  onMessagesRead,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMoreBefore, setHasMoreBefore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [latestCursor, setLatestCursor] = useState<string | null>(null);
  const { fetchWithError, abort } = useFetchWithError();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emptyConversationCursorRef = useRef<string | null>(null);
  const initialRequestRef = useRef(0);
  const scrollRestoreRef = useRef<{ height: number; top: number } | null>(null);
  const onMessagesReadRef = useRef(onMessagesRead);

  useEffect(() => {
    onMessagesReadRef.current = onMessagesRead;
  }, [onMessagesRead]);

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
    messagesEndRef.current?.scrollIntoView?.({ behavior });
  }, []);

  const applyReadState = useCallback((page: MessagePageResponse) => {
    if (page.markedRead && page.markedRead > 0) {
      onMessagesReadRef.current?.(matchId);
    }

    const lastSeenAt = page.lastSeenAt ? new Date(page.lastSeenAt).getTime() : null;
    if (!lastSeenAt) return;

    setMessages((previous) => {
      let changed = false;
      const next = previous.map((message) => {
        if (
          message.senderId !== currentUserId ||
          message.read ||
          message.status ||
          new Date(message.createdAt).getTime() > lastSeenAt
        ) {
          return message;
        }
        changed = true;
        return { ...message, read: true };
      });
      return changed ? next : previous;
    });
  }, [currentUserId, matchId]);

  const applyPage = useCallback(
    (page: MessagePageResponse, options?: { replace?: boolean; autoScroll?: boolean }) => {
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

      applyReadState(page);

      if (shouldAutoScroll) {
        requestAnimationFrame(() => scrollToBottom(options?.replace ? 'auto' : 'smooth'));
      }
    },
    [applyReadState, scrollToBottom]
  );

  const loadInitialMessages = useCallback(async () => {
    const requestId = ++initialRequestRef.current;
    setLoading(true);
    setLoadError(false);
    setMessages([]);
    setLatestCursor(null);
    setHasMoreBefore(false);
    emptyConversationCursorRef.current = null;

    const result = await fetchWithError<MessagePageResponse>(
      `/api/messages?matchId=${encodeURIComponent(matchId)}&limit=${PAGE_SIZE}`,
      {
        showError: false,
      }
    );

    if (requestId !== initialRequestRef.current) return;

    if (result.success && result.data) {
      applyPage(result.data, { replace: true, autoScroll: true });
      setHasMoreBefore(Boolean(result.data.hasMoreBefore));
    } else {
      setLoadError(true);
    }

    setLoading(false);
  }, [applyPage, fetchWithError, matchId]);

  const pollForNewMessages = useCallback(async () => {
    const params = new URLSearchParams({
      matchId,
      limit: String(PAGE_SIZE),
    });
    const cursor = latestCursor || emptyConversationCursorRef.current;

    if (cursor) {
      params.set('after', cursor);
    }

    const result = await fetchWithError<MessagePageResponse>(
      `/api/messages?${params.toString()}`,
      {
        showError: false,
      }
    );

    if (result.success && result.data) {
      const incomingMessages = result.data.messages || [];

      if (incomingMessages.length === 0) {
        applyReadState(result.data);
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
  }, [applyPage, applyReadState, fetchWithError, isNearBottom, latestCursor, matchId]);

  const { markActivity } = useAdaptivePolling({
    enabled: Boolean(matchId) && !loading && !loadError,
    onPoll: pollForNewMessages,
    activeIntervalMs: 5_000,
    idleIntervalMs: 15_000,
    immediate: false,
  });

  useEffect(() => {
    if (!matchId) {
      return;
    }

    void loadInitialMessages();

    return () => {
      initialRequestRef.current += 1;
      abort();
    };
  }, [abort, loadInitialMessages, matchId]);

  useLayoutEffect(() => {
    const restore = scrollRestoreRef.current;
    const node = scrollContainerRef.current;
    if (!restore || !node) return;

    node.scrollTop = node.scrollHeight - restore.height + restore.top;
    scrollRestoreRef.current = null;
  }, [messages]);

  const loadOlderMessages = async () => {
    const oldest = messages.find((message) => !message.status);
    if (!oldest || loadingOlder) return;

    setLoadingOlder(true);
    const params = new URLSearchParams({
      matchId,
      limit: String(PAGE_SIZE),
      before: oldest.createdAt,
    });
    const result = await fetchWithError<MessagePageResponse>(`/api/messages?${params.toString()}`, {
      showError: true,
    });

    if (result.success && result.data) {
      const node = scrollContainerRef.current;
      if (node) {
        scrollRestoreRef.current = { height: node.scrollHeight, top: node.scrollTop };
      }
      const olderMessages = result.data.messages || [];
      setMessages((previous) => mergeMessagesById(previous, olderMessages));
      setHasMoreBefore(Boolean(result.data.hasMoreBefore));
    }

    setLoadingOlder(false);
  };

  const sendMessage = async (content: string, existingId?: string) => {
    markActivity();
    setSending(true);

    const tempId = existingId || `temp-${Date.now()}`;

    if (existingId) {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === existingId ? { ...message, status: 'sending' } : message
        )
      );
    } else {
      const tempMessage: ChatMessage = {
        id: tempId,
        senderId: currentUserId,
        receiverId: 'pending',
        content,
        read: false,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };
      setMessages((previous) => [...previous, tempMessage]);
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }

    const result = await fetchWithError<{ message: Message }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ matchId, content }),
      showError: true,
    });

    if (result.success && result.data?.message) {
      const saved = result.data.message;
      setMessages((previous) =>
        previous
          .filter((message) => message.id !== saved.id)
          .map((message) => (message.id === tempId ? saved : message))
      );
      setLatestCursor(saved.createdAt);
      emptyConversationCursorRef.current = null;
    } else {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === tempId ? { ...message, status: 'failed' } : message
        )
      );
    }

    setSending(false);
  };

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || sending) return;

    setNewMessage('');
    await sendMessage(content);
  };

  const discardFailedMessage = (id: string) => {
    setMessages((previous) => previous.filter((message) => message.id !== id));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-0 min-w-0 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <CloudOff className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-semibold text-foreground">No pudimos cargar esta conversación</p>
        <p className="max-w-xs text-sm text-muted-foreground">Revisá tu conexión y reintentá.</p>
        <Button type="button" onClick={() => void loadInitialMessages()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const petName = otherPet?.name || 'Conversación';

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <MeetupPanel key={matchId} matchId={matchId} userId={currentUserId} />
      <div className="flex min-w-0 shrink-0 items-center gap-3 border-b border-slate-100 p-3 sm:p-4">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage
            src={otherPet?.primaryImageUrl || getPrimaryImageUrl(otherPet?.images, otherPet?.thumbnailIndex ?? 0) || undefined}
            alt={otherPet?.name ? `Foto de ${otherPet.name}` : ''}
          />
          <AvatarFallback className="bg-teal-100 text-teal-700">
            {otherPet?.name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{petName}</p>
          {otherPet?.breed && <p className="truncate text-xs text-teal-600">{otherPet.breed}</p>}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50/50 p-3 sm:p-4"
        aria-live="polite"
      >
        {hasMoreBefore && (
          <div className="flex justify-center">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void loadOlderMessages()}
              disabled={loadingOlder}
            >
              {loadingOlder && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              Cargar mensajes anteriores
            </Button>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Hand className="mx-auto mb-2 size-10" aria-hidden="true" />
              <p className="text-sm">Enviá el primer mensaje</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            const failed = message.status === 'failed';

            return (
              <div
                key={message.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`min-w-0 max-w-[85%] rounded-xl px-4 py-2 sm:max-w-[70%] ${
                    isOwn
                      ? `rounded-br-md bg-primary text-primary-foreground ${failed ? 'opacity-70' : ''}`
                      : 'rounded-bl-md border border-border bg-surface text-slate-800'
                  }`}
                >
                  <p className="text-sm [overflow-wrap:anywhere]">{message.content}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] ${isOwn ? 'text-teal-100' : 'text-slate-400'}`}>
                      {formatTime(message.createdAt)}
                    </span>
                    {isOwn && !message.status && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-teal-100">
                        {message.read ? (
                          <CheckCheck className="size-3" aria-hidden="true" />
                        ) : (
                          <Check className="size-3" aria-hidden="true" />
                        )}
                        <span className="sr-only">{message.read ? 'Visto' : 'Enviado'}</span>
                      </span>
                    )}
                    {message.status === 'sending' && (
                      <span className="inline-flex text-[10px] text-teal-100">
                        <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
                        <span className="sr-only">Enviando</span>
                      </span>
                    )}
                  </div>
                </div>
                {failed && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-destructive">
                    <CircleAlert className="size-3.5" aria-hidden="true" />
                    <span>No se envió.</span>
                    <button
                      type="button"
                      className="font-semibold underline underline-offset-2 disabled:opacity-50"
                      onClick={() => void sendMessage(message.content, message.id)}
                      disabled={sending}
                    >
                      Reintentar
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground underline underline-offset-2"
                      onClick={() => discardFailedMessage(message.id)}
                    >
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
          className="flex min-w-0 items-center gap-2 sm:gap-3"
        >
          <Input
            placeholder="Escribí un mensaje"
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            aria-label="Mensaje"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 bg-background"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Enviar mensaje"
            className="h-11 w-11 shrink-0"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
