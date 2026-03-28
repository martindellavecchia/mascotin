'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Pet } from '@/types';
import Image from 'next/image';
import { safeParseImages } from '@/lib/utils';
import { toast } from 'sonner';

interface MatchesPanelProps {
  matches: Pet[];
  currentUserId: string;
  onRefresh: () => void;
}



export default function MatchesPanel({ matches, currentUserId, onRefresh }: MatchesPanelProps) {
  const [selectedMatch, setSelectedMatch] = useState<Pet | null>(null);
  const [messages, setMessages] = useState<{ [key: string]: Array<{ content: string; senderId: string; createdAt: string }> }>({});
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
          content: newMessage
        })
      });

      if (response.ok) {
        const message = {
          content: newMessage,
          senderId: currentUserId,
          createdAt: new Date().toISOString()
        };

        setMessages(prev => ({
          ...prev,
          [matchId]: [...(prev[matchId] || []), message]
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
      setMessages(prev => ({
        ...prev,
        [matchId]: data.messages || []
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
  const selectedMessages = selectedMatchId ? (messages[selectedMatchId] || []) : [];

  return (
    <div className="h-full flex flex-col">
      {!selectedMatch ? (
        // Matches List View
        <div className="h-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Matches</h2>

          {matches.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
                  <span className="material-symbols-rounded w-8 h-8 text-rose-500">person</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No matches yet</h3>
                  <p className="text-gray-500">Start swiping to find your perfect match!</p>
                </div>
              </div>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map((match) => (
                  <Card
                    key={match.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                    onClick={() => handleSelectMatch(match)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                         <Avatar className="w-16 h-16">
                           <AvatarImage asChild>
                              <div className="relative w-full h-full">
                                <Image
                                  src={safeParseImages(match.images)[0] || '/placeholder.svg'}
                                  alt={match.name}
                                  fill
                                  className="object-cover rounded-full"
                                />
                              </div>
                           </AvatarImage>
                          <AvatarFallback className="bg-rose-100 text-rose-600 text-lg font-semibold">
                            {match.name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{match.name}</h3>
                          <p className="text-sm text-gray-500 truncate">{(match.bio || '').substring(0, 50)}...</p>
                          <p className="text-xs text-rose-500 mt-1">Tap to chat</p>
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
        // Chat View
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedMatch(null)}
              className="hover:bg-rose-100"
              aria-label="Volver a la lista de matches"
            >
              <span className="material-symbols-rounded w-5 h-5">arrow_back</span>
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage asChild>
                  <div className="relative w-full h-full">
                    <Image
                      src={safeParseImages(selectedMatch.images)[0] || '/placeholder.svg'}
                      alt={selectedMatch.name}
                      fill
                      className="object-cover rounded-full"
                    />
                  </div>
                </AvatarImage>
                <AvatarFallback className="bg-rose-100 text-rose-600 font-semibold">
                  {selectedMatch.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedMatch.name}</h3>
                <p className="text-xs text-teal-500">Online</p>
              </div>
            </div>
          </div>

          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4" aria-live="polite">
                {selectedMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-lg">Say hi to {selectedMatch.name}! 👋</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            msg.senderId === currentUserId
                              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.senderId === currentUserId ? 'text-white/70' : 'text-gray-500'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                    disabled={!newMessage.trim() || sending}
                  >
                    <span className="material-symbols-rounded w-4 h-4">{sending ? 'pending' : 'send'}</span>
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
