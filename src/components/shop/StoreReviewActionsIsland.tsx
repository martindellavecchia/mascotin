'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useStoreViewer } from '@/components/shop/StoreViewerProvider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ReviewActionProps } from '@/lib/server/stores';

export default function StoreReviewActionsIsland({
  review,
  hasBusinessReply,
}: {
  review: ReviewActionProps;
  hasBusinessReply: boolean;
}) {
  const router = useRouter();
  const { store, viewer, setViewer, requireAuth } = useStoreViewer();
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate');
  const [reportDescription, setReportDescription] = useState('');
  const [reply, setReply] = useState('');

  useEffect(() => {
    setHelpfulCount(review.helpfulCount);
  }, [review.helpfulCount]);

  const isMine = review.id === viewer.ownReviewId;
  const isHelpful = viewer.helpfulReviewIds.includes(review.id);

  const toggleHelpful = async () => {
    if (!viewer.isAuthenticated) return requireAuth();
    const response = await fetch(`/api/stores/${store.id}/reviews/${review.id}/helpful`, { method: 'POST' });
    if (response.status === 401) return requireAuth();
    const data = await response.json();
    if (!data.success) return toast.error(data.error);
    setViewer((current) => ({
      ...current,
      helpfulReviewIds: data.isHelpful
        ? Array.from(new Set([...current.helpfulReviewIds, review.id]))
        : current.helpfulReviewIds.filter((id) => id !== review.id),
    }));
    setHelpfulCount(data.helpfulCount);
  };

  const submitReport = async () => {
    if (!viewer.isAuthenticated) return requireAuth();
    const response = await fetch(`/api/stores/${store.id}/reviews/${review.id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reportReason, description: reportDescription }),
    });
    if (response.status === 401) return requireAuth();
    const data = await response.json();
    if (!data.success) return toast.error(data.error);
    toast.success('Reporte enviado para moderación');
    setReportOpen(false);
    setReportDescription('');
  };

  const submitReply = async () => {
    if (!reply.trim()) return;
    const response = await fetch(`/api/stores/${store.id}/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessReply: reply }),
    });
    const data = await response.json();
    if (!data.success) return toast.error(data.error);
    toast.success('Respuesta publicada');
    setReply('');
    router.refresh();
  };

  return (
    <>
      {!isMine && (
        <>
          <button
            onClick={() => void toggleHelpful()}
            className={`min-h-10 px-2 font-medium ${isHelpful ? 'text-teal-700' : 'text-slate-500 hover:text-teal-700'}`}
          >
            Útil ({helpfulCount})
          </button>
          <button
            onClick={() => (viewer.isAuthenticated ? setReportOpen(true) : requireAuth())}
            className="min-h-10 px-2 text-slate-500 hover:text-rose-600"
          >
            Reportar
          </button>
        </>
      )}

      {viewer.isOwner && !hasBusinessReply && (
        <div className="mt-4 flex w-full basis-full flex-col gap-2 sm:flex-row">
          <Textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Responder públicamente con respeto..."
            rows={2}
          />
          <Button variant="outline" onClick={() => void submitReply()}>
            Responder
          </Button>
        </div>
      )}

      <Dialog open={reportOpen} onOpenChange={(open) => !open && setReportOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar reseña</DialogTitle>
            <DialogDescription>Indicá el motivo para que el equipo de moderación pueda revisarla.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inappropriate">Contenido inapropiado</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="conflict_of_interest">Conflicto de interés</SelectItem>
                <SelectItem value="other">Otro motivo</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={reportDescription}
              onChange={(event) => setReportDescription(event.target.value)}
              placeholder="Agregá contexto para moderación (opcional)"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancelar</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => void submitReport()}>
              Enviar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
