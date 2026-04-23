'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
      applyPage(result.data, { replace: true, autoScroll: true });
    }
  }, [applyPage, fetchWithError, groupId]);

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
    enabled: Boolean(groupId) && !loading,
    onPoll: pollForNewMessages,
    activeIntervalMs: 5_000,
    idleIntervalMs: 15_000,
  });

  useEffect(() => {
    if (!groupId) {
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
  }, [abort, groupId, loadInitialMessages]);

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
        name: 'Tú',
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
      <Card className={`h-full flex items-center justify-center ${className || ''}`}>
        <LoadingSpinner size="lg" />
      </Card>
    );
  }

  return (
    <Card className={`h-full flex flex-col ${className || ''}`}>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-10">
            <p>No hay mensajes aún.</p>
            <p className="text-xs">¡Inicia la conversación!</p>
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
                className={`max-w-[70%] rounded-lg p-3 ${
                  isMine ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {!isMine && (
                  <p className="text-xs font-bold mb-1 opacity-70">
                    {message.sender.name}
                  </p>
                )}
                <p className="text-sm">{message.content}</p>
                <p className="text-[10px] mt-1 opacity-70 text-right">
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-teal-500 hover:bg-teal-600"
            disabled={sending}
          >
            <span className="material-symbols-rounded">
              {sending ? 'pending' : 'send'}
            </span>
          </Button>
        </form>
      </div>
    </Card>
  );
}
