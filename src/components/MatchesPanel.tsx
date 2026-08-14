'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Pet } from '@/types';
import Image from 'next/image';
import { safeParseImages } from '@/lib/utils';
import { getPrimaryImageUrl, isRenderableImage, shouldUnoptimizeImage } from '@/lib/media';
import { toast } from 'sonner';

const FALLBACK_MATCH_IMAGE = '/images/discovery-golden-retriever.png';

function matchImageSrc(images: string | string[] | null | undefined) {
  const primary = getPrimaryImageUrl(images) || safeParseImages(images)[0] || null;
  return isRenderableImage(primary) ? primary! : FALLBACK_MATCH_IMAGE;
}

interface MatchesPanelProps {
  matches: Pet[];
  currentUserId: string;
  onRefresh: () => void;
}

export default function MatchesPanel({
  matches,
  currentUserId,
}: MatchesPanelProps) {
  const [selectedMatch, setSelectedMatch] = useState<Pet | null>(null);
  const [messages, setMessages] = useState<{
    [key: string]: Array<{ content: string; senderId: string; createdAt: string }>;
  }>({});
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const handleSendMessage = async () => {
    if (sendingRef.current) return;
    if (!selectedMatch || !newMessage.trim() || !selectedMatch.matchId) return;
    const matchId = selectedMatch.matchId;

    sendingRef.current = true;
    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const message = {
          content: newMessage,
          senderId: currentUserId,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => ({
          ...prev,
          [matchId]: [...(prev[matchId] || []), message],
        }));
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      toast.error('Error al enviar mensaje');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const fetchMessages = async (matchId: string) => {
    try {
      const response = await fetch(`/api/messages?matchId=${matchId}`);
      const data = await response.json();
      setMessages((prev) => ({
        ...prev,
        [matchId]: data.messages || [],
      }));
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      toast.error('Error al cargar mensajes');
    }
  };

  const handleSelectMatch = (match: Pet) => {
    setSelectedMatch(match);
    if (match.matchId) {
      fetchMessages(match.matchId);
    }
  };

  const selectedMatchId = selectedMatch?.matchId || '';
  const selectedMessages = selectedMatchId
    ? messages[selectedMatchId] || []
    : [];

  return (
    <div className="h-full flex flex-col">
      {!selectedMatch ? (
        <div className="h-full">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Tus matches</h2>

          {matches.length === 0 ? (
            <Card className="p-8 text-center border-slate-200 shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
                  <span className="material-symbols-rounded text-3xl text-teal-600">
                    favorite
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    Aún no tienes matches
                  </h3>
                  <p className="text-slate-500">
                    Empieza a explorar para encontrar compañeros.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map((match) => (
                  <Card
                    key={match.id}
                    className="cursor-pointer hover:border-teal-200 transition-colors border-slate-200 shadow-sm"
                    onClick={() => handleSelectMatch(match)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage asChild>
                            <div className="relative w-full h-full">
                              <Image
                                src={matchImageSrc(match.images)}
                                alt={match.name}
                                fill
                                className="object-cover rounded-full"
                                unoptimized={shouldUnoptimizeImage(matchImageSrc(match.images))}
                              />
                            </div>
                          </AvatarImage>
                          <AvatarFallback className="bg-teal-50 text-teal-700 text-lg font-semibold">
                            {match.name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {match.name}
                          </h3>
                          <p className="text-sm text-slate-500 truncate">
                            {(match.bio || '').substring(0, 50)}...
                          </p>
                          <p className="text-xs text-teal-700 mt-1">
                            Toca para chatear
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedMatch(null)}
              className="hover:bg-teal-50"
              aria-label="Volver a la lista de matches"
            >
              <span className="material-symbols-rounded">arrow_back</span>
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage asChild>
                  <div className="relative w-full h-full">
                    <Image
                      src={matchImageSrc(selectedMatch.images)}
                      alt={selectedMatch.name}
                      fill
                      className="object-cover rounded-full"
                      unoptimized={shouldUnoptimizeImage(matchImageSrc(selectedMatch.images))}
                    />
                  </div>
                </AvatarImage>
                <AvatarFallback className="bg-teal-50 text-teal-700 font-semibold">
                  {selectedMatch.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {selectedMatch.name}
                </h3>
                <p className="text-xs text-teal-700">En línea</p>
              </div>
            </div>
          </div>

          <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 shadow-sm">
            <CardContent className="p-0 flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4" aria-live="polite">
                {selectedMessages.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    <p className="text-base">
                      Saluda a {selectedMatch.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          msg.senderId === currentUserId
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-lg ${
                            msg.senderId === currentUserId
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.senderId === currentUserId
                                ? 'text-white/70'
                                : 'text-slate-500'
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 rounded-lg"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-teal-700 hover:bg-teal-800 rounded-lg"
                    disabled={!newMessage.trim() || sending}
                  >
                    <span className="material-symbols-rounded">
                      {sending ? 'pending' : 'send'}
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
