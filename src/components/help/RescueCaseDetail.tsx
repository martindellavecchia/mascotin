'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FosterChat from '@/components/help/FosterChat';
import FosterAdoptionDraftForm from '@/components/help/FosterAdoptionDraftForm';
import RescueContactSheet, { type ContactOption, type ContactReference } from '@/components/help/RescueContactSheet';
import RescueCasePublicationCard from '@/components/help/RescueCasePublicationCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RESCUE_STATUS_LABELS, SIZE_LABELS, SPECIES_LABELS } from '@/lib/foster';
import { shouldUnoptimizeImage } from '@/lib/media';
import { RESCUE_NEED_LABELS, RESCUE_NEED_STATUS_LABELS } from '@/lib/rescue';
import { VOLUNTEER_ROLE_LABELS } from '@/lib/volunteer';
import { toast } from 'sonner';
import type { RescueNeedTypeValue, RescueNeedView } from '@/components/help/types';

interface OfferDetail {
  id: string;
  status: string;
  source: string;
  unreadCount: number;
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
  offerId: string;
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
  contactOptions: ContactOption[];
  needs: RescueNeedView[];
  volunteerOffers?: Array<{
    id: string;
    needId?: string;
    needType?: RescueNeedTypeValue;
    role: keyof typeof VOLUNTEER_ROLE_LABELS;
    status: string;
    source: string;
    unreadCount: number;
    distanceKm: number;
    score: number;
    reasons: string[];
    expiresAt: string;
    volunteer?: { id: string; name: string | null; image: string | null };
  }>;
  volunteerAssignments?: Array<{
    id: string;
    offerId: string;
    needId: string;
    needType: RescueNeedTypeValue;
    status: string;
    startedAt: string;
    completedAt: string | null;
    cancelledAt: string | null;
    volunteer: { id: string; name: string | null; image: string | null };
  }>;
}

interface DetailResponse {
  viewerRole: 'CREATOR' | 'FOSTER' | 'VOLUNTEER' | 'VISITOR';
  viewerUserId: string;
  case: CaseDetail;
}

const EVENT_LABELS: Record<string, string> = {
  CASE_CREATED: 'Solicitud creada',
  MATCHING_RUN: 'Búsqueda de hogares realizada',
  RADIUS_UPDATED: 'Radio de búsqueda actualizado',
  FOSTER_INTERESTED: 'Un hogar indicó que puede ayudar',
  FOSTER_CONTACT_OPENED: 'Un hogar abrió una conversación desde el muro',
  FOSTER_CONTACT_WITHDRAWN: 'El hogar retiró su interés',
  FOSTER_CONTACT_CLOSED: 'El contacto con el hogar fue cerrado',
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
  VOLUNTEER_MATCHING_RUN: 'Búsqueda de voluntariado realizada',
  VOLUNTEER_INTERESTED: 'Una persona indicó que puede ayudar',
  VOLUNTEER_CONTACT_OPENED: 'Una persona voluntaria abrió una conversación desde el muro',
  VOLUNTEER_CONTACT_WITHDRAWN: 'La persona voluntaria retiró su interés',
  VOLUNTEER_CONTACT_CLOSED: 'El contacto de voluntariado fue cerrado',
  VOLUNTEER_DECLINED: 'Una persona rechazó la tarea',
  VOLUNTEER_ASSIGNED: 'Tarea de voluntariado asignada',
  VOLUNTEER_COMPLETED: 'Tarea de voluntariado completada',
  VOLUNTEER_CANCELLED: 'Tarea cancelada y búsqueda reabierta',
};

function placementActive(placement: PlacementDetail) {
  return ['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'].includes(placement.status);
}

const RESCUE_NEED_TYPES: RescueNeedTypeValue[] = ['FOSTER', 'VETERINARY', 'TRANSPORT', 'SUPPLIES', 'FIELD_SUPPORT'];

interface RescueCaseDetailProps {
  caseId: string;
  initialContactOpen?: boolean;
  initialNeedType?: string;
  initialContactKind?: string;
  initialOfferId?: string;
}

export default function RescueCaseDetail({ caseId, initialContactOpen = false, initialNeedType, initialContactKind, initialOfferId }: RescueCaseDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [radius, setRadius] = useState('5');
  const [cancelReason, setCancelReason] = useState('');
  const [veterinarians, setVeterinarians] = useState<Array<{ id: string; name: string; slug: string; address: string | null; distanceKm: number; ratingAverage: number; link: string }> | null>(null);
  const [contactSheetOpen, setContactSheetOpen] = useState(initialContactOpen);
  const [contactTarget, setContactTarget] = useState<ContactReference | null>(null);
  const requestedNeedType = RESCUE_NEED_TYPES.includes(initialNeedType as RescueNeedTypeValue)
    ? initialNeedType as RescueNeedTypeValue
    : null;

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
      if (initialOfferId && ['foster', 'volunteer'].includes(initialContactKind || '')) {
        const offer = initialContactKind === 'foster'
          ? nextData.case.offers.find((item) => item.id === initialOfferId)
          : nextData.case.volunteerOffers?.find((item) => item.id === initialOfferId);
        if (offer) {
          setContactTarget({
            kind: initialContactKind === 'foster' ? 'FOSTER' : 'VOLUNTEER',
            offerId: offer.id,
            status: offer.status,
            expiresAt: offer.expiresAt,
          });
        }
      }
    } catch {
      toast.error('No se pudo cargar el caso');
    } finally {
      setLoading(false);
    }
  }, [caseId, initialContactKind, initialOfferId]);

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

  const loadVeterinarians = async () => {
    setActing(true);
    try {
      const response = await fetch(`/api/rescue-cases/${caseId}/nearby-veterinarians`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'No se pudieron buscar veterinarias');
      setVeterinarians(payload.veterinarians || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron buscar veterinarias');
    } finally {
      setActing(false);
    }
  };

  const showContact = (contact?: ContactReference | null) => {
    setContactTarget(contact || null);
    setContactSheetOpen(true);
  };

  if (loading) {
    return <div className="mx-auto max-w-6xl space-y-4 px-4 py-8"><div className="h-10 w-40 animate-pulse rounded bg-slate-200" /><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /></div>;
  }
  if (!data) {
    return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-xl font-semibold">No pudimos abrir el caso</h1><Button asChild variant="outline" className="mt-4"><Link href="/hogares-de-transito">Volver a Hogares de tránsito</Link></Button></div>;
  }

  const rescueCase = data.case;
  const contactOptions = rescueCase.contactOptions || [];
  const image = rescueCase.images[0];
  const placement = rescueCase.placements.find(placementActive) || rescueCase.placements[0];
  const isCreator = data.viewerRole === 'CREATOR';
  const myOffer = isCreator ? undefined : rescueCase.offers[0];
  const primaryNeed = rescueCase.needs.find((need) => need.isPrimary) || rescueCase.needs[0];
  const canChangeRadius = data.viewerRole === 'CREATOR' && rescueCase.needs.some((need) => ['OPEN', 'INTERESTED'].includes(need.status));
  const volunteerAssignment = rescueCase.volunteerAssignments?.find((assignment) => assignment.status === 'ACTIVE') || rescueCase.volunteerAssignments?.[0];
  const myVolunteerOffer = !isCreator
    ? rescueCase.volunteerOffers?.find((offer) => offer.needType === requestedNeedType)
      || rescueCase.volunteerOffers?.find((offer) => offer.status === 'INTERESTED')
      || rescueCase.volunteerOffers?.[0]
    : undefined;
  const isViewerFoster = !isCreator && Boolean(myOffer || placement);
  const isViewerVolunteer = !isCreator && Boolean(myVolunteerOffer || volunteerAssignment);
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
              <div className="space-y-3 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
                <p className="text-sm font-semibold text-slate-900">Necesidades del caso</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rescueCase.needs.map((need) => (
                    <div key={need.id} className="rounded-lg border border-teal-100 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{RESCUE_NEED_LABELS[need.type]}{need.isPrimary ? ' · Principal' : ''}</p>
                        <Badge variant="outline">{RESCUE_NEED_STATUS_LABELS[need.status]}</Badge>
                      </div>
                      {need.details && <p className="mt-2 text-xs text-slate-600">{need.details}</p>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                <span className="rounded-full bg-slate-100 px-3 py-1.5">{rescueCase.requestedDays} días estimados</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">{rescueCase.searchRadiusKm} km de búsqueda</span>
              </div>
            </CardContent>
          </Card>

          {data.viewerRole === 'VISITOR' && (
            <Card className="border-orange-200 bg-orange-50/40">
              <CardContent className="space-y-3 p-5">
                <h2 className="font-semibold text-slate-900">{primaryNeed ? `Ayudar con ${RESCUE_NEED_LABELS[primaryNeed.type].toLowerCase()}` : 'Acompañar este caso'}</h2>
                <p className="text-sm text-slate-600">Confirmá tu interés para abrir un chat privado antes de la selección. La ubicación exacta y los datos personales no se exponen.</p>
                {rescueCase.adoptionListingId ? (
                  <Button asChild><Link href={`/adoptions/${rescueCase.adoptionListingId}`}>Ver ficha de adopción</Link></Button>
                ) : (
                  <Button disabled={contactOptions.length === 0} onClick={() => showContact()}>
                    {primaryNeed?.type === 'FOSTER' ? 'Ofrecer tránsito' : 'Quiero ayudar'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {rescueCase.needs.some((need) => need.type === 'VETERINARY') && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Veterinarias cercanas</CardTitle><p className="text-sm text-slate-500">Se calcula con la ubicación privada del caso y sólo muestra información pública del directorio. No realiza diagnósticos, pagos ni reservas.</p></CardHeader>
              <CardContent className="space-y-3">
                {veterinarians === null ? <Button variant="outline" disabled={acting} onClick={() => void loadVeterinarians()}>Ver hasta cinco veterinarias</Button> : veterinarians.length === 0 ? <p className="text-sm text-slate-500">No encontramos veterinarias con ubicación registrada.</p> : veterinarians.map((veterinarian) => (
                  <div key={veterinarian.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-slate-900">{veterinarian.name}</p><p className="mt-1 text-sm text-slate-500">{veterinarian.address || 'Dirección disponible en la ficha'} · {veterinarian.distanceKm.toFixed(1)} km</p></div><Button asChild variant="outline"><Link href={veterinarian.link}>Ver directorio</Link></Button></div>
                ))}
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
                    {isViewerFoster && (
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

          {placement && !contactSheetOpen && <FosterChat fosterOfferId={placement.offerId} currentUserId={data.viewerUserId} enabled={['COORDINATING', 'ACTIVE', 'AWAITING_ADOPTION'].includes(placement.status)} />}

          {!placement && !contactSheetOpen && isViewerFoster && myOffer?.status === 'INTERESTED' && (
            <div className="space-y-3"><FosterChat fosterOfferId={myOffer.id} currentUserId={data.viewerUserId} enabled /><Button variant="outline" onClick={() => showContact({ kind: 'FOSTER', offerId: myOffer.id, status: myOffer.status, expiresAt: myOffer.expiresAt })}>Opciones del contacto</Button></div>
          )}

          {volunteerAssignment && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Tarea de voluntariado · {RESCUE_NEED_LABELS[volunteerAssignment.needType]}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium text-slate-900">Responsable: {volunteerAssignment.volunteer.name || 'Persona voluntaria'}</p><p className="text-sm text-slate-500">Aceptó únicamente esta tarea coordinada.</p></div><Badge className={volunteerAssignment.status === 'ACTIVE' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'}>{volunteerAssignment.status === 'ACTIVE' ? 'Activa' : volunteerAssignment.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}</Badge></div>
                {volunteerAssignment.status === 'ACTIVE' && (
                  <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                    {data.viewerRole === 'CREATOR' && <Button disabled={acting} onClick={() => void mutate(`/api/volunteer/assignments/${volunteerAssignment.id}/complete`, { method: 'POST' }, 'Tarea completada')}>Marcar tarea completada</Button>}
                    <div className="space-y-2"><Label htmlFor="volunteer-cancel-reason">Motivo para cancelar</Label><div className="flex flex-col gap-2 sm:flex-row"><Input id="volunteer-cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ej. cambió la disponibilidad" /><Button variant="outline" disabled={acting || cancelReason.trim().length < 3} onClick={() => void mutate(`/api/volunteer/assignments/${volunteerAssignment.id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: cancelReason }) }, 'Tarea cancelada y búsqueda reabierta')}>Cancelar tarea</Button></div></div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {volunteerAssignment && !contactSheetOpen && (isCreator || isViewerVolunteer) && (
            <FosterChat volunteerOfferId={volunteerAssignment.offerId} currentUserId={data.viewerUserId} enabled={volunteerAssignment.status === 'ACTIVE'} context="volunteer" />
          )}

          {!volunteerAssignment && !contactSheetOpen && isViewerVolunteer && myVolunteerOffer?.status === 'INTERESTED' && (
            <div className="space-y-3"><FosterChat volunteerOfferId={myVolunteerOffer.id} currentUserId={data.viewerUserId} enabled context="volunteer" /><Button variant="outline" onClick={() => showContact({ kind: 'VOLUNTEER', offerId: myVolunteerOffer.id, status: myVolunteerOffer.status, expiresAt: myVolunteerOffer.expiresAt })}>Opciones del contacto</Button></div>
          )}

          {rescueCase.adoptionDraft && <FosterAdoptionDraftForm caseId={caseId} />}

          {data.viewerRole === 'CREATOR' && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Hogares contactados</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {rescueCase.offers.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Todavía no encontramos hogares compatibles. Podés ampliar el radio.</p> : rescueCase.offers.map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-medium text-slate-900">{offer.fosterProfile?.user.name || 'Hogar de tránsito'}</p><p className="text-sm text-slate-500">{offer.fosterProfile?.location} · {offer.distanceKm.toFixed(1)} km</p></div>
                      <div className="flex items-center gap-2"><Badge variant="outline">{offer.status === 'INTERESTED' ? 'Puede ayudar' : offer.status === 'SELECTED' ? 'Seleccionado' : offer.status === 'PENDING' ? 'Sin responder' : offer.status === 'DECLINED' ? 'No disponible' : 'Cerrado'}</Badge>{offer.unreadCount > 0 && <Badge className="bg-teal-100 text-teal-800">{offer.unreadCount} nuevo{offer.unreadCount === 1 ? '' : 's'}</Badge>}</div>
                    </div>
                    {['INTERESTED', 'SELECTED'].includes(offer.status) && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={() => showContact({ kind: 'FOSTER', offerId: offer.id, status: offer.status, expiresAt: offer.expiresAt })}>Conversar</Button>{offer.status === 'INTERESTED' && !placement && <Button disabled={acting} onClick={() => void mutate(`/api/foster/offers/${offer.id}/select`, { method: 'POST' }, 'Hogar seleccionado. Ya pueden coordinar.')}>Elegir este hogar</Button>}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {data.viewerRole === 'CREATOR' && (rescueCase.volunteerOffers?.length || 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Personas voluntarias contactadas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {rescueCase.volunteerOffers!.map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-slate-900">{offer.volunteer?.name || 'Persona voluntaria'}</p><p className="text-sm text-slate-500">{VOLUNTEER_ROLE_LABELS[offer.role]} · {offer.distanceKm.toFixed(1)} km</p></div><div className="flex items-center gap-2"><Badge variant="outline">{offer.status === 'INTERESTED' ? 'Puede ayudar' : offer.status === 'SELECTED' ? 'Seleccionada' : offer.status === 'PENDING' ? 'Sin responder' : offer.status === 'DECLINED' ? 'No disponible' : 'Cerrada'}</Badge>{offer.unreadCount > 0 && <Badge className="bg-teal-100 text-teal-800">{offer.unreadCount} nuevo{offer.unreadCount === 1 ? '' : 's'}</Badge>}</div></div>
                    {['INTERESTED', 'SELECTED'].includes(offer.status) && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={() => showContact({ kind: 'VOLUNTEER', offerId: offer.id, status: offer.status, expiresAt: offer.expiresAt })}>Conversar</Button>{offer.status === 'INTERESTED' && !rescueCase.volunteerAssignments?.some((assignment) => assignment.needId === offer.needId && assignment.status === 'ACTIVE') && <Button disabled={acting} onClick={() => void mutate(`/api/volunteer/offers/${offer.id}/select`, { method: 'POST' }, 'Tarea asignada. Ya pueden conversar.')}>Elegir responsable</Button>}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isViewerVolunteer && myVolunteerOffer?.status === 'PENDING' && (
            <Card><CardContent className="space-y-4 p-5"><h2 className="font-semibold text-slate-900">¿Podés tomar esta tarea?</h2><p className="text-sm text-slate-600">Mostrar interés no te asigna la tarea; la persona responsable deberá seleccionarte.</p><div className="grid grid-cols-2 gap-2"><Button disabled={acting} onClick={() => void mutate(`/api/volunteer/offers/${myVolunteerOffer.id}/respond`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: 'INTERESTED' }) }, 'Avisamos que podés ayudar')}>Me interesa</Button><Button variant="outline" disabled={acting} onClick={() => void mutate(`/api/volunteer/offers/${myVolunteerOffer.id}/respond`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: 'DECLINED' }) }, 'Respuesta guardada')}>Esta vez no</Button></div></CardContent></Card>
          )}

          {isViewerFoster && myOffer?.status === 'PENDING' && (
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

          {data.viewerRole === 'CREATOR' && rescueCase.needs.some((need) => ['OPEN', 'INTERESTED'].includes(need.status)) && (
            <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700">Cancelar caso</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cancelar la solicitud?</AlertDialogTitle><AlertDialogDescription>Se cerrarán las solicitudes enviadas a los hogares. Esta acción no puede deshacerse.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Volver</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={async () => { const ok = await mutate(`/api/rescue-cases/${caseId}/cancel`, { method: 'POST' }, 'Caso cancelado'); if (ok) router.push('/hogares-de-transito'); }}>Cancelar caso</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          )}
        </aside>
      </div>
      <RescueContactSheet
        open={contactSheetOpen}
        onOpenChange={(nextOpen) => {
          setContactSheetOpen(nextOpen);
          if (!nextOpen) {
            setContactTarget(null);
            router.replace(`/hogares-de-transito/casos/${caseId}`, { scroll: false });
          }
        }}
        caseId={caseId}
        location={rescueCase.location}
        speciesLabel={SPECIES_LABELS[rescueCase.species] || 'Mascota'}
        options={contactOptions}
        initialNeedType={requestedNeedType}
        initialContact={contactTarget}
        currentUserId={data.viewerUserId}
        isCreator={data.viewerRole === 'CREATOR'}
        onChanged={load}
      />
    </main>
  );
}
