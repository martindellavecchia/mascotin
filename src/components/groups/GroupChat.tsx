'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { LoadingSpinner } from '@/components/ui/loading';

interface GroupMessage {
    id: string;
    content: string;
    senderId: string;
    sender: {
        id: string;
        name: string;
        image?: string | null;
    };
    createdAt: string;
}

interface GroupChatProps {
    groupId: string;
    currentUserId: string;
    className?: string;
}

export default function GroupChat({ groupId, currentUserId, className }: GroupChatProps) {
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const { fetchWithError, abort } = useFetchWithError();
    const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pollIntervalMs = useRef(2000);
    const previousMessageCountRef = useRef(0);
    const isTabVisibleRef = useRef(true);

    const POLL_INTERVALS = useMemo(() => [2000, 5000, 10000, 15000] as const, []);

    const clearPollTimeout = useCallback(() => {
        if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
        }
    }, []);

    const schedulePoll = useCallback((fetchFn: () => Promise<void>) => {
        clearPollTimeout();
        if (!isTabVisibleRef.current) return;
        pollTimeoutRef.current = setTimeout(async () => {
            await fetchFn();
            schedulePoll(fetchFn);
        }, pollIntervalMs.current);
    }, [clearPollTimeout]);

    const resetPollInterval = useCallback(() => {
        pollIntervalMs.current = POLL_INTERVALS[0];
    }, [POLL_INTERVALS]);

    const backOffPollInterval = useCallback(() => {
        const currentIndex = POLL_INTERVALS.indexOf(pollIntervalMs.current as typeof POLL_INTERVALS[number]);
        const nextIndex = Math.min(currentIndex + 1, POLL_INTERVALS.length - 1);
        pollIntervalMs.current = POLL_INTERVALS[nextIndex];
    }, [POLL_INTERVALS]);

    const fetchMessages = useCallback(async () => {
        const result = await fetchWithError<{ messages: GroupMessage[] }>(`/api/groups/${groupId}/messages`, {
            showError: false
        });

        if (result.success && result.data) {
            const newMessages = result.data.messages || [];
            const hasNewMessages = newMessages.length > previousMessageCountRef.current;
            previousMessageCountRef.current = newMessages.length;

            if (hasNewMessages) {
                resetPollInterval();
            } else {
                backOffPollInterval();
            }

            setMessages(newMessages);
        }
    }, [fetchWithError, groupId, resetPollInterval, backOffPollInterval]);

    useEffect(() => {
        if (!groupId) return;

        setLoading(true);
        pollIntervalMs.current = POLL_INTERVALS[0];
        previousMessageCountRef.current = 0;
        isTabVisibleRef.current = !document.hidden;

        fetchMessages().finally(() => setLoading(false));
        schedulePoll(fetchMessages);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                isTabVisibleRef.current = false;
                clearPollTimeout();
            } else {
                isTabVisibleRef.current = true;
                resetPollInterval();
                fetchMessages();
                schedulePoll(fetchMessages);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearPollTimeout();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            abort();
        };
    }, [groupId, fetchMessages, abort, schedulePoll, clearPollTimeout, resetPollInterval, POLL_INTERVALS]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        resetPollInterval();
        schedulePoll(fetchMessages);
        setSending(true);
        const tempContent = newMessage.trim();
        setNewMessage('');

        const result = await fetchWithError<{ message: GroupMessage }>(`/api/groups/${groupId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content: tempContent }),
            showError: true
        });

        if (result.success && result.data?.message) {
            setMessages(prev => [...prev, result.data!.message]);
        } else {
            setNewMessage(tempContent);
        }

        setSending(false);
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <Card className={`h-full flex items-center justify-center ${className}`}>
                <LoadingSpinner size="lg" />
            </Card>
        );
    }

    return (
        <Card className={`h-full flex flex-col ${className}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-slate-400 py-10">
                        <p>No hay mensajes aún.</p>
                        <p className="text-xs">¡Inicia la conversación!</p>
                    </div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-lg p-3 ${isMe ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                {!isMe && <p className="text-xs font-bold mb-1 opacity-70">{msg.sender.name}</p>}
                                <p className="text-sm">{msg.content}</p>
                                <p className="text-[10px] mt-1 opacity-70 text-right">
                                    {formatTime(msg.createdAt)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="p-4 border-t bg-white">
                <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1"
                        disabled={sending}
                    />
                    <Button type="submit" size="icon" className="bg-teal-500 hover:bg-teal-600" disabled={sending}>
                        <span className="material-symbols-rounded">{sending ? 'pending' : 'send'}</span>
                    </Button>
                </form>
            </div>
        </Card>
    );
}
