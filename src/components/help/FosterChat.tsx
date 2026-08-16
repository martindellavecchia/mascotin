'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface FosterMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface FosterChatProps {
  placementId: string;
  currentUserId: string;
  enabled: boolean;
}

export default function FosterChat({ placementId, currentUserId, enabled }: FosterChatProps) {
  const [messages, setMessages] = useState<FosterMessage[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/foster/placements/${placementId}/messages?limit=50`);
    const data = await response.json();
    if (response.ok && data.success) setMessages(data.messages || []);
  }, [placementId]);

  useEffect(() => {
    void load();
    if (!enabled) return;
    const interval = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(interval);
  }, [enabled, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const message = content.trim();
    if (!message) return;
    setSending(true);
    try {
      const response = await fetch(`/api/foster/placements/${placementId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error || 'No se pudo enviar el mensaje');
        return;
      }
      setContent('');
      setMessages((current) => [...current, data.message]);
    } catch {
      toast.error('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">Conversación privada</h2>
        <p className="text-xs text-slate-500">Usen este espacio para coordinar la entrega y los cuidados.</p>
      </div>
      <div className="max-h-80 min-h-48 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-600">Todavía no hay mensajes.</p>
        ) : messages.map((message) => {
          const own = message.senderId === currentUserId;
          return (
            <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${own ? 'bg-teal-700 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
                <p className={`mt-1 text-[10px] ${own ? 'text-teal-100' : 'text-slate-600'}`}>
                  {new Date(message.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {enabled ? (
        <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Escribí un mensaje"
            rows={2}
            maxLength={2000}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <Button className="self-end" onClick={() => void send()} disabled={sending || !content.trim()}>
            {sending ? 'Enviando…' : 'Enviar'}
          </Button>
        </div>
      ) : (
        <p className="border-t border-slate-100 p-3 text-center text-xs text-slate-500">La conversación quedó cerrada.</p>
      )}
    </div>
  );
}
