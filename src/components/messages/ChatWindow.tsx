'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFetchWithError } from '@/hooks/useFetchWithError';
import { LoadingSpinner, LoadingDots } from '@/components/ui/loading';
import { toast } from 'sonner';

interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
}

interface MatchWithPet {
    id: string;
    matchId: string;
    name: string;
    breed?: string;
    images: string;
}

interface ChatWindowProps {
    matchId: string;
    currentUserId: string;
    otherPet?: MatchWithPet;
}

export default function ChatWindow({ matchId, currentUserId, otherPet }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const { fetchWithError, abort } = useFetchWithError();
    const messagesEndRef = useRef<HTMLDivElement>(null);
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
        const result = await fetchWithError<{ messages: Message[] }>(`/api/messages?matchId=${matchId}`, {
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
    }, [fetchWithError, matchId, resetPollInterval, backOffPollInterval]);

    useEffect(() => {
        if (!matchId) return;

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
    }, [matchId, fetchMessages, abort, schedulePoll, clearPollTimeout, resetPollInterval, POLL_INTERVALS]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;

        resetPollInterval();
        schedulePoll(fetchMessages);
        setSending(true);
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            senderId: currentUserId,
            receiverId: 'pending',
            content: newMessage.trim(),
            createdAt: new Date().toISOString(),
        };

        setMessages(prev => [...prev, tempMessage]);
        const messageToSend = newMessage.trim();
        setNewMessage('');

        const result = await fetchWithError<{ message: Message }>('/api/messages', {
            method: 'POST',
            body: JSON.stringify({ matchId, content: messageToSend }),
            showError: true
        });

        if (result.success && result.data?.message) {
            setMessages(prev => prev.map(m =>
                m.id === tempMessage.id ? result.data!.message : m
            ));
        } else {
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            setNewMessage(messageToSend);
        }

        setSending(false);
    };

    const getFirstImage = (images?: string): string | undefined => {
        if (!images) return undefined;
        try {
            const parsed = JSON.parse(images);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : undefined;
        } catch {
            return undefined;
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={getFirstImage(otherPet?.images)} />
                    <AvatarFallback className="bg-teal-100 text-teal-700">{otherPet?.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold text-slate-900">{otherPet?.name || 'Chat'}</p>
                    {isTyping ? (
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-teal-600">Escribiendo</span>
                            <LoadingDots />
                        </div>
                    ) : (
                        <p className="text-xs text-teal-600">{otherPet?.breed || 'Mascota'}</p>
                    )}
                </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50" aria-live="polite">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        <div className="text-center">
                            <span className="material-symbols-rounded text-4xl mb-2">waving_hand</span>
                            <p className="text-sm">¡Envía el primer mensaje!</p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={msg.id} className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[70%] px-4 py-2 rounded-2xl ${msg.senderId === currentUserId
                                    ? 'bg-teal-500 text-white rounded-br-md'
                                    : 'bg-white text-slate-800 rounded-bl-md shadow-sm'
                                    }`}
                            >
                                <p className="text-sm">{msg.content}</p>
                                <div className={`flex items-center gap-1 mt-1 ${msg.senderId === currentUserId ? 'justify-end' : ''}`}>
                                    <span className={`text-[10px] ${msg.senderId === currentUserId ? 'text-teal-100' : 'text-slate-400'}`}>
                                        {formatTime(msg.createdAt)}
                                    </span>
                                    {msg.senderId === currentUserId && (
                                        <span className={`text-[10px] ${idx === messages.length - 1 ? 'text-teal-200' : 'text-teal-100'}`}>
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

            <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                    <Input
                        placeholder="Escribe un mensaje..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="flex-1 bg-slate-100 border-none rounded-full focus-visible:ring-teal-500"
                        disabled={sending}
                    />
                    <Button
                        onClick={handleSend}
                        size="icon"
                        className="rounded-full bg-teal-500 hover:bg-teal-600 text-white shrink-0"
                        disabled={!newMessage.trim() || sending}
                    >
                        <span className="material-symbols-rounded">{sending ? 'pending' : 'send'}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
