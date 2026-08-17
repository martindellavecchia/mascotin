'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Lock, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useStoreViewer } from '@/components/shop/StoreViewerProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function StoreReviewFormIsland() {
  const router = useRouter();
  const { store, viewer, refreshViewer, loginHref, requireAuth } = useStoreViewer();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const canReview = viewer.reviewEligibility === 'eligible' || viewer.reviewEligibility === 'already-reviewed';

  useEffect(() => {
    if (viewer.ownReview) {
      setRating(viewer.ownReview.rating);
      setComment(viewer.ownReview.comment || '');
    } else if (viewer.reviewEligibility !== 'already-reviewed') {
      setRating(0);
      setComment('');
    }
  }, [viewer.ownReview, viewer.reviewEligibility]);

  const saveReview = async () => {
    if (!viewer.isAuthenticated) return requireAuth();
    if (!rating) return toast.error('Elegí una calificación');
    setReviewLoading(true);
    try {
      const response = await fetch(`/api/stores/${store.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json();
      if (response.status === 401) return requireAuth();
      if (!data.success) throw new Error(data.error);
      toast.success(viewer.ownReview ? 'Reseña actualizada' : 'Gracias por compartir tu experiencia');
      await refreshViewer();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la reseña');
    } finally {
      setReviewLoading(false);
    }
  };

  const deleteReview = async () => {
    if (!viewer.ownReviewId) return;
    setReviewLoading(true);
    try {
      const response = await fetch(`/api/stores/${store.id}/reviews/${viewer.ownReviewId}`, { method: 'DELETE' });
      const data = await response.json();
      if (response.status === 401) return requireAuth();
      if (!data.success) throw new Error(data.error);
      setRating(0);
      setComment('');
      toast.success('Reseña eliminada');
      await refreshViewer();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la reseña');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 xl:sticky xl:top-24">
      <CardHeader>
        <CardTitle className="text-lg">Tu experiencia</CardTitle>
      </CardHeader>
      <CardContent>
        {viewer.isOwner ? (
          <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-800">
            <p className="font-semibold">Sos owner de este negocio</p>
            <p className="mt-1">Podés responder reseñas, pero no calificar tu propio perfil.</p>
          </div>
        ) : canReview ? (
          <div>
            <Badge className="mb-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              <BadgeCheck className="mr-1 size-3.5" aria-hidden="true" />
              Cita verificada
            </Badge>
            <p className="text-sm font-medium text-slate-700">
              {viewer.ownReview ? 'Editá tu calificación' : '¿Cómo fue el servicio?'}
            </p>
            <div className="mt-2 flex gap-1" role="group" aria-label="Calificación">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  aria-label={`${star} estrellas`}
                  className="flex size-10 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <Star
                    className={`size-8 ${star <= rating ? 'text-amber-500' : 'text-slate-200 hover:text-amber-300'}`}
                    aria-hidden="true"
                    fill={star <= rating ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
            </div>
            <Textarea
              className="mt-3"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Contá qué salió bien y qué podría mejorar (mín. 20 caracteres)"
              rows={5}
            />
            <Button
              className="mt-3 w-full bg-teal-600 hover:bg-teal-700"
              onClick={() => void saveReview()}
              disabled={reviewLoading}
            >
              {reviewLoading ? 'Guardando...' : viewer.ownReview ? 'Actualizar reseña' : 'Publicar reseña'}
            </Button>
            {viewer.ownReview && (
              <Button
                variant="ghost"
                className="mt-1 w-full text-rose-600 hover:text-rose-700"
                onClick={() => void deleteReview()}
                disabled={reviewLoading}
              >
                Eliminar mi reseña
              </Button>
            )}
          </div>
        ) : viewer.reviewEligibility === 'unauthenticated' ? (
          <div className="text-sm text-slate-600">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Lock className="size-5 text-slate-500" aria-hidden="true" />
            </div>
            <p className="font-semibold text-slate-800">Iniciá sesión para reservar o reseñar</p>
            <p className="mt-1">Las reseñas verificadas aparecen después de una cita completada.</p>
            <Button asChild className="mt-4 w-full bg-teal-600 hover:bg-teal-700">
              <Link href={loginHref}>Iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <div className="text-sm text-slate-600">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Lock className="size-5 text-slate-500" aria-hidden="true" />
            </div>
            <p className="font-semibold text-slate-800">Reseñas verificadas</p>
            <p className="mt-1">Podrás calificar cuando el negocio marque una cita tuya como completada.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
