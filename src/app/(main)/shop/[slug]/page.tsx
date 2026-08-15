'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import BusinessOwnerBadge from '@/components/business/BusinessOwnerBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { STORE_PLACE_TAG_LABELS, type StorePlaceTag } from '@/lib/places';

interface StoreService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
}

interface StoreReview {
  id: string;
  rating: number;
  comment: string | null;
  businessReply: string | null;
  businessReplyAt: string | null;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null; isBusinessOwner: boolean };
  helpfulCount: number;
  isHelpful: boolean;
  isMine: boolean;
}

interface StoreDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  image: string | null;
  tags?: string[];
  category: { id: string; name: string };
  owner: { id: string; name: string | null; image: string | null } | null;
  ratingAverage: number;
  reviewCount: number;
  trust: { label: string; description: string; tone: string };
  services: StoreService[];
  reviews: StoreReview[];
}

interface ViewerState {
  isOwner: boolean;
  isAuthenticated: boolean;
  canReview: boolean;
  hasCompletedAppointment: boolean;
  userReview: { id: string; rating: number; comment: string | null } | null;
}

interface Pet { id: string; name: string }

const trustClasses: Record<string, string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
};

export default function StoreDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [bookingService, setBookingService] = useState<StoreService | null>(null);
  const [petId, setPetId] = useState('');
  const [date, setDate] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reportReview, setReportReview] = useState<StoreReview | null>(null);
  const [reportReason, setReportReason] = useState('inappropriate');
  const [reportDescription, setReportDescription] = useState('');
  const [replies, setReplies] = useState<Record<string, string>>({});

  const fetchStore = async () => {
    try {
      const response = await fetch(`/api/stores/${slug}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setStore(data.store);
      setViewer(data.viewer);
      if (data.viewer.userReview) {
        setRating(data.viewer.userReview.rating);
        setComment(data.viewer.userReview.comment || '');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el negocio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStore();
    fetch('/api/pet/mine')
      .then((response) => response.json())
      .then((data) => data.success && setPets(data.pets || []))
      .catch((error) => console.error('Error fetching pets:', error));
  }, [slug]);

  const nextDays = Array.from({ length: 7 }, (_, index) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + index + 1);
    nextDate.setHours(10, 0, 0, 0);
    return {
      value: nextDate.toISOString(),
      label: nextDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · 10:00',
    };
  });

  const saveReview = async () => {
    if (!store || !rating) return toast.error('Elegí una calificación');
    setReviewLoading(true);
    try {
      const response = await fetch(`/api/stores/${store.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      toast.success(viewer?.userReview ? 'Reseña actualizada' : 'Gracias por compartir tu experiencia');
      await fetchStore();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la reseña');
    } finally {
      setReviewLoading(false);
    }
  };

  const deleteReview = async () => {
    if (!store || !viewer?.userReview) return;
    setReviewLoading(true);
    try {
      const response = await fetch(`/api/stores/${store.id}/reviews/${viewer.userReview.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setRating(0);
      setComment('');
      toast.success('Reseña eliminada');
      await fetchStore();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la reseña');
    } finally {
      setReviewLoading(false);
    }
  };

  const toggleHelpful = async (review: StoreReview) => {
    if (!store) return;
    const response = await fetch(`/api/stores/${store.id}/reviews/${review.id}/helpful`, { method: 'POST' });
    const data = await response.json();
    if (!data.success) return toast.error(data.error);
    setStore((current) => current && ({
      ...current,
      reviews: current.reviews.map((item) => item.id === review.id
        ? { ...item, isHelpful: data.isHelpful, helpfulCount: data.helpfulCount }
        : item),
    }));
  };

  const submitReport = async () => {
    if (!store || !reportReview) return;
    const response = await fetch(`/api/stores/${store.id}/reviews/${reportReview.id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reportReason, description: reportDescription }),
    });
    const data = await response.json();
    if (!data.success) return toast.error(data.error);
    toast.success('Reporte enviado para moderación');
    setReportReview(null);
    setReportDescription('');
  };

  const submitReply = async (review: StoreReview) => {
    if (!store || !replies[review.id]?.trim()) return;
    const response = await fetch(`/api/stores/${store.id}/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessReply: replies[review.id] }),
    });
    const data = await response.json();
    if (!data.success) return toast.error(data.error);
    toast.success('Respuesta publicada');
    setReplies((current) => ({ ...current, [review.id]: '' }));
    await fetchStore();
  };

  const bookService = async () => {
    if (!bookingService || !petId || !date) return toast.error('Completá mascota y fecha');
    setBookingLoading(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: bookingService.id, petId, date }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Cita reservada exitosamente');
      setBookingService(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo reservar');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8" aria-label="Cargando negocio">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-7 w-36 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-[160px_1fr]">
            <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
            <div className="space-y-4 py-2">
              <div className="h-7 w-2/5 animate-pulse rounded bg-slate-200" />
              <div className="h-9 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="h-52 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-52 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!store || !viewer) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">No encontramos este negocio</h1>
        <Button asChild className="mt-5"><Link href="/shop">Volver a negocios</Link></Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-14">
      <section className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-4 py-8">
          <Link href="/shop" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
            <span className="material-symbols-rounded text-lg">arrow_back</span>
            Todos los negocios
          </Link>
          <div className="mt-5 grid min-w-0 gap-6 sm:grid-cols-[160px_1fr] sm:items-center xl:grid-cols-[160px_1fr_auto]">
            <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-teal-100 to-orange-50 sm:h-40 sm:w-40">
              {store.image ? <img src={store.image} alt={store.name} className="h-full w-full object-cover" /> : <span className="material-symbols-rounded text-7xl text-teal-700/35">storefront</span>}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">{store.category.name}</Badge>
                <Badge variant="outline" className={trustClasses[store.trust.tone] || trustClasses.slate}>{store.trust.label}</Badge>
                {(store.tags || []).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {STORE_PLACE_TAG_LABELS[tag as StorePlaceTag] || tag}
                  </Badge>
                ))}
              </div>
              <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">{store.name}</h1>
              <p className="mt-2 max-w-2xl break-words text-slate-600 [overflow-wrap:anywhere]">{store.description}</p>
              {store.address && <p className="mt-3 flex min-w-0 items-start gap-1 break-words text-sm text-slate-500 [overflow-wrap:anywhere]"><span className="material-symbols-rounded shrink-0 text-lg">location_on</span>{store.address}</p>}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-center sm:col-span-2 xl:col-span-1">
              <p className="flex items-center justify-center gap-1 text-3xl font-bold text-slate-900"><span className="material-symbols-rounded text-3xl text-amber-500">star</span>{store.reviewCount ? store.ratingAverage.toFixed(1) : '—'}</p>
              <p className="mt-1 text-sm text-slate-500">{store.reviewCount} reseñas verificadas</p>
              <p className="mt-2 max-w-48 text-xs leading-relaxed text-slate-500">{store.trust.description}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto grid min-w-0 gap-7 px-4 py-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-7">
          <section>
            <h2 className="text-xl font-bold text-slate-900">Servicios disponibles</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {store.services.length ? store.services.map((service) => (
                <Card key={service.id} className="border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-bold text-slate-900 [overflow-wrap:anywhere]">{service.name}</h3>
                        <p className="mt-1 line-clamp-2 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">{service.description}</p>
                      </div>
                      <Badge variant="outline">{service.duration} min</Badge>
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xl font-bold text-teal-700">${service.price.toLocaleString('es-AR')}</span>
                      <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => { setBookingService(service); setPetId(pets[0]?.id || ''); setDate(''); }}>Reservar</Button>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card className="sm:col-span-2"><CardContent className="p-8 text-center text-slate-500">Este negocio todavía no publicó servicios reservables.</CardContent></Card>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Experiencias de la comunidad</h2>
                <p className="mt-1 text-sm text-slate-500">Sólo cuentan citas marcadas como completadas.</p>
              </div>
              <Badge variant="outline">{store.reviewCount} reseñas</Badge>
            </div>
            <div className="mt-4 space-y-4">
              {store.reviews.length ? store.reviews.map((review) => (
                <Card key={review.id} className="border-slate-200">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="relative shrink-0">
                        <Avatar className="h-10 w-10"><AvatarImage src={review.author.image || undefined} /><AvatarFallback>{review.author.name?.[0] || 'U'}</AvatarFallback></Avatar>
                        {review.author.isBusinessOwner && <BusinessOwnerBadge />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{review.author.name || 'Usuario de MascoTin'}</p>
                            <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: es })}</p>
                          </div>
                          <div className="flex" aria-label={`${review.rating} de 5 estrellas`}>
                            {[1, 2, 3, 4, 5].map((star) => <span key={star} className={`material-symbols-rounded text-lg ${star <= review.rating ? 'text-amber-500' : 'text-slate-200'}`}>star</span>)}
                          </div>
                        </div>
                        {review.comment && <p className="mt-3 break-words text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{review.comment}</p>}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><span className="material-symbols-rounded mr-1 text-sm">verified</span>Cita verificada</Badge>
                          {!review.isMine && <button onClick={() => void toggleHelpful(review)} className={`min-h-10 px-2 font-medium ${review.isHelpful ? 'text-teal-700' : 'text-slate-500 hover:text-teal-700'}`}>Útil ({review.helpfulCount})</button>}
                          {!review.isMine && <button onClick={() => setReportReview(review)} className="min-h-10 px-2 text-slate-500 hover:text-rose-600">Reportar</button>}
                        </div>
                        {review.businessReply && (
                          <div className="mt-4 rounded-xl border-l-4 border-teal-500 bg-teal-50 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Respuesta del negocio</p>
                            <p className="mt-1 break-words text-sm text-slate-700 [overflow-wrap:anywhere]">{review.businessReply}</p>
                          </div>
                        )}
                        {viewer.isOwner && !review.businessReply && (
                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <Textarea value={replies[review.id] || ''} onChange={(event) => setReplies((current) => ({ ...current, [review.id]: event.target.value }))} placeholder="Responder públicamente con respeto..." rows={2} />
                            <Button variant="outline" onClick={() => void submitReply(review)}>Responder</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card className="border-dashed"><CardContent className="p-10 text-center"><span className="material-symbols-rounded text-5xl text-slate-300">reviews</span><h3 className="mt-2 font-semibold text-slate-800">Todavía no hay reseñas</h3><p className="mt-1 text-sm text-slate-500">La primera aparecerá después de una cita completada.</p></CardContent></Card>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <Card className="border-slate-200 xl:sticky xl:top-24">
            <CardHeader><CardTitle className="text-lg">Tu experiencia</CardTitle></CardHeader>
            <CardContent>
              {viewer.isOwner ? (
                <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-800"><p className="font-semibold">Sos owner de este negocio</p><p className="mt-1">Podés responder reseñas, pero no calificar tu propio perfil.</p></div>
              ) : viewer.canReview ? (
                <div>
                  <Badge className="mb-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><span className="material-symbols-rounded mr-1 text-sm">verified</span>Cita verificada</Badge>
                  <p className="text-sm font-medium text-slate-700">{viewer.userReview ? 'Editá tu calificación' : '¿Cómo fue el servicio?'}</p>
                  <div className="mt-2 flex gap-1" role="group" aria-label="Calificación">
                    {[1, 2, 3, 4, 5].map((star) => <button key={star} onClick={() => setRating(star)} aria-label={`${star} estrellas`} className="flex size-10 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><span className={`material-symbols-rounded text-3xl ${star <= rating ? 'text-amber-500' : 'text-slate-200 hover:text-amber-300'}`}>star</span></button>)}
                  </div>
                  <Textarea className="mt-3" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Contá qué salió bien y qué podría mejorar (mín. 20 caracteres)" rows={5} />
                  <Button className="mt-3 w-full bg-teal-600 hover:bg-teal-700" onClick={() => void saveReview()} disabled={reviewLoading}>{reviewLoading ? 'Guardando...' : viewer.userReview ? 'Actualizar reseña' : 'Publicar reseña'}</Button>
                  {viewer.userReview && <Button variant="ghost" className="mt-1 w-full text-rose-600 hover:text-rose-700" onClick={() => void deleteReview()} disabled={reviewLoading}>Eliminar mi reseña</Button>}
                </div>
              ) : (
                <div className="text-sm text-slate-600"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100"><span className="material-symbols-rounded text-slate-500">lock</span></div><p className="font-semibold text-slate-800">Reseñas verificadas</p><p className="mt-1">Podrás calificar cuando el negocio marque una cita tuya como completada.</p></div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={Boolean(bookingService)} onOpenChange={(open) => !open && setBookingService(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reservar cita</DialogTitle><DialogDescription>Elegí la mascota y un horario disponible para confirmar la reserva.</DialogDescription></DialogHeader>
          {bookingService && <div className="space-y-4 py-3"><div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">{bookingService.name}</p><p className="mt-1 text-lg font-bold text-teal-700">${bookingService.price.toLocaleString('es-AR')}</p></div><div><label className="mb-1.5 block text-sm font-medium text-slate-700">Mascota</label><Select value={petId} onValueChange={setPetId}><SelectTrigger><SelectValue placeholder="Seleccioná una mascota" /></SelectTrigger><SelectContent>{pets.map((pet) => <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>)}</SelectContent></Select></div><div><label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha y hora</label><Select value={date} onValueChange={setDate}><SelectTrigger><SelectValue placeholder="Seleccioná fecha" /></SelectTrigger><SelectContent>{nextDays.map((day) => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}</SelectContent></Select></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setBookingService(null)}>Cancelar</Button><Button className="bg-teal-600 hover:bg-teal-700" onClick={() => void bookService()} disabled={!petId || !date || bookingLoading}>{bookingLoading ? 'Reservando...' : 'Confirmar reserva'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reportReview)} onOpenChange={(open) => !open && setReportReview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reportar reseña</DialogTitle><DialogDescription>Indicá el motivo para que el equipo de moderación pueda revisarla.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-3"><Select value={reportReason} onValueChange={setReportReason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inappropriate">Contenido inapropiado</SelectItem><SelectItem value="spam">Spam</SelectItem><SelectItem value="conflict_of_interest">Conflicto de interés</SelectItem><SelectItem value="other">Otro motivo</SelectItem></SelectContent></Select><Textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} placeholder="Agregá contexto para moderación (opcional)" rows={4} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setReportReview(null)}>Cancelar</Button><Button className="bg-rose-600 hover:bg-rose-700" onClick={() => void submitReport()}>Enviar reporte</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
