'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Hand, LoaderCircle, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { mergeMessagesById } from '@/lib/messages';
import { LoadingSpinner } from '@/components/ui/loading';
import type { MatchWithPet, Message } from '@/types/messages';

interface MessagePageResponse {
  messages: Message[];
  latestCursor: string | null;
  hasMoreBefore: boolean;
}

interface ChatWindowProps {
  matchId: string;
  currentUserId: string;
  otherPet?: MatchWithPet;
}

export default function ChatWindow({
  matchId,
  currentUserId,
  otherPet,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [latestCursor, setLatestCursor] = useState<string | null>(null);
  const { fetchWithError, abort } = useFetchWithError();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emptyConversationCursorRef = useRef<string | null>(null);

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

      if (shouldAutoScroll) {
        requestAnimationFrame(() => scrollToBottom(options?.replace ? 'auto' : 'smooth'));
      }
    },
    [scrollToBottom]
  );

  const loadInitialMessages = useCallback(async () => {
    const result = await fetchWithError<MessagePageResponse>(
      `/api/messages?matchId=${matchId}&limit=50`,
      {
        showError: false,
      }
    );

    if (result.success && result.data) {
      applyPage(result.data, { replace: true, autoScroll: true });
    }
  }, [applyPage, fetchWithError, matchId]);

  const pollForNewMessages = useCallback(async () => {
    const params = new URLSearchParams({
      matchId,
      limit: '50',
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
  }, [applyPage, fetchWithError, isNearBottom, latestCursor, matchId]);

  const { markActivity } = useAdaptivePolling({
    enabled: Boolean(matchId) && !loading,
    onPoll: pollForNewMessages,
    activeIntervalMs: 5_000,
    idleIntervalMs: 15_000,
    immediate: false,
  });

  useEffect(() => {
    if (!matchId) {
      return;
    }

    setLoading(true);
    setMessages([]);
    setLatestCursor(null);
    emptyConversationCursorRef.current = null;

    loadInitialMessages().finally(() => {
      setLoading(false);
    });

    return () => {
      abort();
    };
  }, [abort, loadInitialMessages, matchId]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    markActivity();
    setSending(true);

    const messageToSend = newMessage.trim();
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: 'pending',
      content: messageToSend,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((previous) => [...previous, tempMessage]);
    setNewMessage('');
    requestAnimationFrame(() => scrollToBottom('smooth'));

    const result = await fetchWithError<{ message: Message }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ matchId, content: messageToSend }),
      showError: true,
    });

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

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex min-w-0 shrink-0 items-center gap-3 border-b border-slate-100 p-3 sm:p-4">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={otherPet?.primaryImageUrl || undefined} />
          <AvatarFallback className="bg-teal-100 text-teal-700">
            {otherPet?.name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{otherPet?.name || 'Chat'}</p>
          <p className="truncate text-xs text-teal-600">{otherPet?.breed || 'Mascota'}</p>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50/50 p-3 sm:p-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Hand className="mb-2 size-10" aria-hidden="true" />
              <p className="text-sm">¡Envía el primer mensaje!</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUserId
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-2 sm:max-w-[70%] ${
                  message.senderId === currentUserId
                    ? 'bg-teal-500 text-white rounded-br-md'
                    : 'bg-white text-slate-800 rounded-bl-md shadow-sm'
                }`}
              >
                <p className="text-sm [overflow-wrap:anywhere]">{message.content}</p>
                <div
                  className={`flex items-center gap-1 mt-1 ${
                    message.senderId === currentUserId ? 'justify-end' : ''
                  }`}
                >
                  <span
                    className={`text-[10px] ${
                      message.senderId === currentUserId
                        ? 'text-teal-100'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </span>
                  {message.senderId === currentUserId && (
                    <span
                      className={`text-[10px] ${
                        index === messages.length - 1
                          ? 'text-teal-200'
                          : 'text-teal-100'
                      }`}
                    >
                      ✓✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
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
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            aria-label="Mensaje"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-full border-none bg-slate-100 focus-visible:ring-teal-500"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Enviar mensaje"
            className="h-11 w-11 shrink-0 rounded-full bg-teal-500 text-white hover:bg-teal-600"
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
