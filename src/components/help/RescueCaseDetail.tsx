'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FosterChat from '@/components/help/FosterChat';
import FosterAdoptionDraftForm from '@/components/help/FosterAdoptionDraftForm';
import RescueCasePublicationCard from '@/components/help/RescueCasePublicationCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RESCUE_STATUS_LABELS, SIZE_LABELS, SPECIES_LABELS } from '@/lib/foster';
import { shouldUnoptimizeImage } from '@/lib/media';
import { toast } from 'sonner';

interface OfferDetail {
  id: string;
  status: string;
  score: number;
  distanceKm: number;
  reasons: string[];
  expiresAt: string;
  fosterProfile?: {
    id: string;
    location: string;
    capacity: number;
    occupiedSlots: number;
    maxDurationDays: number;
    housingType: string;
    hasYard: boolean;
    hasKids: boolean;
    hasOtherPets: boolean;
    experience: string;
    notes: string | null;
    user: { id: string; name: string | null; image: string | null };
  };
}

interface PlacementDetail {
  id: string;
  status: string;
  requesterConfirmedAt: string | null;
  fosterConfirmedAt: string | null;
  startedAt: string | null;
  expectedEndAt: string | null;
  endedAt: string | null;
  outcome: string | null;
  foster: { id: string; name: string | null; image: string | null };
}

interface CaseDetail {
  id: string;
  status: string;
  species: string;
  size: string;
  urgency: string;
  apparentCondition: string;
  description: string;
  images: string[];
  location: string;
  searchRadiusKm: number;
  requestedDays: number;
  createdAt: string;
  createdBy?: { id: string; name: string | null; image: string | null };
  offers: OfferDetail[];
  placements: PlacementDetail[];
  events: Array<{
    id: string;
    type: string;
    createdAt: string;
    actor: { id: string; name: string | null };
  }>;
  publication: { summary: string; publicZone: string | null; isVisible: boolean } | null;
  adoptionDraft: { id: string; status: string; managedByUserId: string; listingId: string | null } | null;
  adoptionListingId: string | null;
  canExpressInterest: boolean;
  hasFosterProfile: boolean;
}

interface DetailResponse {
  viewerRole: 'CREATOR' | 'FOSTER' | 'VISITOR';
  viewerUserId: string;
  case: CaseDetail;
}

const EVENT_LABELS: Record<string, string> = {
  CASE_CREATED: 'Solicitud creada',
  MATCHING_RUN: 'Búsqueda de hogares realizada',
  RADIUS_UPDATED: 'Radio de búsqueda actualizado',
  FOSTER_INTERESTED: 'Un hogar indicó que puede ayudar',
  FOSTER_DECLINED: 'Un hogar rechazó la solicitud',
  FOSTER_SELECTED: 'Hogar seleccionado para coordinar',
  HANDOFF_CONFIRMED: 'Entrega confirmada por ambas partes',
  COORDINATION_CANCELLED: 'Coordinación cancelada',
  PLACEMENT_COMPLETED: 'Tránsito finalizado',
  CASE_CANCELLED: 'Caso cancelado',
  COMMUNITY_PUBLISHED: 'Caso publicado en Comunidad',
  COMMUNITY_PUBLICATION_UPDATED: 'Publicación comunitaria actualizada',
  COMMUNITY_UNPUBLISHED: 'Caso retirado de Comunidad',
  ADOPTION_DRAFT_CREATED: 'Borrador de adopción creado',
  ADOPTION_PUBLISHED: 'Ficha publicada en Adopciones',
  ADOPTION_APPLICATION_SELECTED: 'Postulación de adopción seleccionada',
  ADOPTION_HANDOFF_CANCELLED: 'Coordinación de adopción cancelada',
  ADOPTION_COMPLETED: 'Adopción definitiva completada',
};

function placementActive(placement: PlacementDetail) {
  return ['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'].includes(placement.status);
}

export default function RescueCaseDetail({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [radius, setRadius] = useState('5');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/rescue-cases/${caseId}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        toast.error(payload.error || 'No se pudo cargar el caso');
        return;
      }
      const nextData = payload as DetailResponse & { success: true };
      setData(nextData);
      setRadius(String(nextData.case.searchRadiusKm));
    } catch {
      toast.error('No se pudo cargar el caso');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (url: string, options: RequestInit = { method: 'POST' }, successMessage?: string) => {
    setActing(true);
    try {
      const response = await fetch(url, options);
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        toast.error(payload.error || 'No se pudo completar la acción');
        return false;
      }
      if (successMessage) toast.success(successMessage);
      await load();
      return true;
    } catch {
      toast.error('No se pudo completar la acción');
      return false;
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-6xl space-y-4 px-4 py-8"><div className="h-10 w-40 animate-pulse rounded bg-slate-200" /><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /></div>;
  }
  if (!data) {
    return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-xl font-semibold">No pudimos abrir el caso</h1><Button asChild variant="outline" className="mt-4"><Link href="/hogares-de-transito">Volver a Hogares de tránsito</Link></Button></div>;
  }

  const rescueCase = data.case;
  const image = rescueCase.images[0];
  const placement = rescueCase.placements.find(placementActive) || rescueCase.placements[0];
  const myOffer = data.viewerRole === 'FOSTER' ? rescueCase.offers[0] : undefined;
  const canChangeRadius = data.viewerRole === 'CREATOR' && ['SEARCHING', 'INTERESTED'].includes(rescueCase.status);
  const needsMyConfirmation = placement?.status === 'COORDINATING' && (
    data.viewerRole === 'CREATOR' ? !placement.requesterConfirmedAt : !placement.fosterConfirmedAt
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost"><Link href="/hogares-de-transito"><span className="material-symbols-rounded mr-2" aria-hidden="true">arrow_back</span>Volver a Hogares de tránsito</Link></Button>
        <Badge className="bg-teal-100 text-teal-800">{RESCUE_STATUS_LABELS[rescueCase.status] || rescueCase.status}</Badge>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            {image && (
              <div className="relative aspect-[16/9] max-h-[480px] bg-slate-100">
                <Image src={image} alt="Animal que necesita ayuda" fill sizes="(max-width: 1024px) 100vw, 65vw" unoptimized={shouldUnoptimizeImage(image)} className="object-cover" priority />
              </div>
            )}
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-950">{SPECIES_LABELS[rescueCase.species]} · {SIZE_LABELS[rescueCase.size]}</h1>
                  <p className="mt-1 text-sm text-slate-500">{rescueCase.location}{rescueCase.createdBy ? ` · publicado por ${rescueCase.createdBy.name || 'Usuario de MascoTin'}` : ''}</p>
                </div>
                {rescueCase.urgency !== 'NORMAL' && <Badge className={rescueCase.urgency === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>{rescueCase.urgency === 'CRITICAL' ? 'Situación crítica' : 'Alta urgencia'}</Badge>}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Estado aparente</p>
                <p className="mt-1 text-sm text-slate-600">{rescueCase.apparentCondition}</p>
              </div>
              <p className="whitespace-pre-wrap text-slate-700 [overflow-wrap:anywhere]">{rescueCase.description}</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                <span className="rounded-full bg-slate-100 px-3 py-1.5">{rescueCase.requestedDays} días estimados</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">{rescueCase.searchRadiusKm} km de búsqueda</span>
              </div>
            </CardContent>
          </Card>

          {data.viewerRole === 'VISITOR' && (
            <Card className="border-orange-200 bg-orange-50/40">
              <CardContent className="space-y-3 p-5">
                <h2 className="font-semibold text-slate-900">¿Podés ofrecer un hogar de tránsito?</h2>
                <p className="text-sm text-slate-600">La ubicación exacta y el chat se habilitan sólo cuando participás y la persona responsable te selecciona.</p>
                {rescueCase.adoptionListingId ? (
                  <Button asChild><Link href={`/adoptions/${rescueCase.adoptionListingId}`}>Ver ficha de adopción</Link></Button>
                ) : !rescueCase.hasFosterProfile ? (
                  <Button asChild><Link href="/hogares-de-transito?create=profile">Crear perfil de hogar</Link></Button>
                ) : rescueCase.canExpressInterest ? (
                  <Button disabled={acting} onClick={() => void mutate(`/api/rescue-cases/${caseId}/interest`, { method: 'POST' }, 'Avisamos que podés ayudar')}>Quiero ofrecer tránsito</Button>
                ) : (
                  <p className="rounded-lg bg-white p-3 text-sm text-slate-600">Tu perfil no tiene cupo, está fuera del radio o no coincide con este caso.</p>
                )}
              </CardContent>
            </Card>
          )}

          {placement && (
            <Card>
              <CardHeader><CardTitle className="text-lg">{placement.status === 'COORDINATING' ? 'Coordinar la entrega' : placement.status === 'ACTIVE' ? 'Tránsito en curso' : placement.status === 'AWAITING_ADOPTION' ? 'Cuidado durante la adopción' : 'Último tránsito'}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-xl border p-4 ${placement.requesterConfirmedAt ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}><p className="font-medium text-slate-800">Persona que rescató</p><p className="mt-1 text-sm text-slate-500">{placement.requesterConfirmedAt ? 'Entrega confirmada' : 'Falta confirmar la entrega'}</p></div>
                  <div className={`rounded-xl border p-4 ${placement.fosterConfirmedAt ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}><p className="font-medium text-slate-800">Hogar de tránsito</p><p className="mt-1 text-sm text-slate-500">{placement.fosterConfirmedAt ? 'Recepción confirmada' : 'Falta confirmar la recepción'}</p></div>
                </div>
                {needsMyConfirmation && <Button disabled={acting} onClick={() => void mutate(`/api/foster/placements/${placement.id}/confirm`, { method: 'POST' }, 'Confirmación guardada')}>Confirmar {data.viewerRole === 'CREATOR' ? 'que entregué al animal' : 'que recibí al animal'}</Button>}
                {placement.status === 'COORDINATING' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="outline" disabled={acting}>Cancelar coordinación</Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cancelar esta coordinación?</AlertDialogTitle><AlertDialogDescription>El caso volverá a buscar otros hogares cercanos.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Volver</AlertDialogCancel><AlertDialogAction onClick={() => void mutate(`/api/foster/placements/${placement.id}/cancel`, { method: 'POST' }, 'El caso volvió a la búsqueda')}>Cancelar coordinación</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                  </AlertDialog>
                )}
                {placement.status === 'ACTIVE' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="font-medium text-emerald-900">El hogar asumió el cuidado desde la entrega confirmada.</p>
                    <p className="mt-1 text-sm text-emerald-800">Cuando termine, indicá si el caso se resolvió o si continúa hacia adopción.</p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button disabled={acting} onClick={() => void mutate(`/api/foster/placements/${placement.id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome: 'RESOLVED' }) }, 'Tránsito finalizado')}>Marcar resuelto</Button>
                      <Button variant="outline" disabled={acting} onClick={() => void mutate(`/api/foster/placements/${placement.id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome: 'NEEDS_ADOPTION' }) }, 'El caso pasó a adopción')}>Necesita adopción</Button>
                    </div>
                  </div>
                )}
                {placement.status === 'AWAITING_ADOPTION' && (
                  <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="font-medium text-orange-900">El animal continúa bajo cuidado del hogar y mantiene un cupo ocupado.</p>
                    <p className="text-sm text-orange-800">El cupo se liberará cuando hogar y adoptante confirmen la entrega definitiva.</p>
                    {data.viewerRole === 'FOSTER' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" disabled={acting}>Ya no puedo continuar alojándolo</Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Volver a buscar un hogar de tránsito?</AlertDialogTitle><AlertDialogDescription>La ficha de adopción quedará pausada y se avisará a la persona responsable del caso.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Volver</AlertDialogCancel><AlertDialogAction onClick={() => void mutate(`/api/foster/placements/${placement.id}/cancel`, { method: 'POST' }, 'El caso volvió a buscar tránsito')}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {placement && <FosterChat placementId={placement.id} currentUserId={data.viewerUserId} enabled={['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'].includes(placement.status)} />}

          {rescueCase.adoptionDraft && <FosterAdoptionDraftForm caseId={caseId} />}

          {data.viewerRole === 'CREATOR' && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Hogares contactados</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {rescueCase.offers.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Todavía no encontramos hogares compatibles. Podés ampliar el radio.</p> : rescueCase.offers.map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-medium text-slate-900">{offer.fosterProfile?.user.name || 'Hogar de tránsito'}</p><p className="text-sm text-slate-500">{offer.fosterProfile?.location} · {offer.distanceKm.toFixed(1)} km</p></div>
                      <Badge variant="outline">{offer.status === 'INTERESTED' ? 'Puede ayudar' : offer.status === 'SELECTED' ? 'Seleccionado' : offer.status === 'PENDING' ? 'Sin responder' : offer.status === 'DECLINED' ? 'No disponible' : 'Cerrado'}</Badge>
                    </div>
                    {offer.status === 'INTERESTED' && !placement && <Button className="mt-3" disabled={acting} onClick={() => void mutate(`/api/foster/offers/${offer.id}/select`, { method: 'POST' }, 'Hogar seleccionado. Ya pueden coordinar.')}>Elegir este hogar</Button>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {data.viewerRole === 'FOSTER' && myOffer?.status === 'PENDING' && (
            <Card><CardContent className="space-y-4 p-5"><h2 className="font-semibold text-slate-900">¿Podés recibir a este animal?</h2><p className="text-sm text-slate-600">Responder que sí todavía no inicia el tránsito. La persona que creó el caso deberá elegirte.</p><div className="grid grid-cols-2 gap-2"><Button disabled={acting} onClick={() => void mutate(`/api/foster/offers/${myOffer.id}/respond`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: 'INTERESTED' }) }, 'Avisamos que podés ayudar')}>Puedo ayudar</Button><Button variant="outline" disabled={acting} onClick={() => void mutate(`/api/foster/offers/${myOffer.id}/respond`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: 'DECLINED' }) }, 'Respuesta guardada')}>Esta vez no</Button></div></CardContent></Card>
          )}
        </div>

        <aside className="min-w-0 space-y-5">
          {data.viewerRole === 'CREATOR' && (
            <RescueCasePublicationCard
              caseId={caseId}
              description={rescueCase.description}
              images={rescueCase.images}
              publication={rescueCase.publication}
              onChanged={load}
            />
          )}

          {canChangeRadius && (
            <Card><CardHeader><CardTitle className="text-base">Radio de búsqueda</CardTitle></CardHeader><CardContent className="space-y-3"><Label>Distancia máxima</Label><Select value={radius} onValueChange={setRadius}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[5, 10, 20, 50].map((value) => <SelectItem key={value} value={String(value)}>{value} km</SelectItem>)}</SelectContent></Select><Button variant="outline" className="w-full" disabled={acting || Number(radius) === rescueCase.searchRadiusKm} onClick={() => void mutate(`/api/rescue-cases/${caseId}/radius`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchRadiusKm: Number(radius) }) }, 'Radio actualizado')}>Actualizar búsqueda</Button></CardContent></Card>
          )}

          <Card><CardHeader><CardTitle className="text-base">Actividad</CardTitle></CardHeader><CardContent>{rescueCase.events.length === 0 ? <p className="text-sm text-slate-500">Sin actividad registrada.</p> : <ol className="space-y-4">{rescueCase.events.map((event) => <li key={event.id} className="relative border-l border-slate-200 pl-4"><span className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-white bg-teal-500" /><p className="text-sm font-medium text-slate-800">{EVENT_LABELS[event.type] || event.type}</p><p className="mt-0.5 text-xs text-slate-600">{new Date(event.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</p></li>)}</ol>}</CardContent></Card>

          {data.viewerRole === 'CREATOR' && ['SEARCHING', 'INTERESTED'].includes(rescueCase.status) && (
            <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700">Cancelar caso</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cancelar la solicitud?</AlertDialogTitle><AlertDialogDescription>Se cerrarán las solicitudes enviadas a los hogares. Esta acción no puede deshacerse.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Volver</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => { const ok = await mutate(`/api/rescue-cases/${caseId}/cancel`, { method: 'POST' }, 'Caso cancelado'); if (ok) router.push('/hogares-de-transito'); }}>Cancelar caso</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          )}
        </aside>
      </div>
    </main>
  );
}
