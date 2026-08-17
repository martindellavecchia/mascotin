'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FosterProfileForm from '@/components/help/FosterProfileForm';
import RescueCaseForm from '@/components/help/RescueCaseForm';
import SolidarityAlerts from '@/components/help/SolidarityAlerts';
import VolunteerPanel from '@/components/help/VolunteerPanel';
import type {
  FosterOfferSummary,
  FosterProfileView,
  HelpDashboardData,
  RescueCaseSummary,
} from '@/components/help/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RESCUE_STATUS_LABELS,
  SIZE_LABELS,
  SPECIES_LABELS,
} from '@/lib/foster';
import { shouldUnoptimizeImage } from '@/lib/media';
import { RESCUE_NEED_LABELS } from '@/lib/rescue';
import { toast } from 'sonner';

const EMPTY_DASHBOARD: HelpDashboardData = {
  createdCases: [],
  offers: [],
  fosterPlacements: [],
};

function statusClass(status: string) {
  if (['IN_FOSTER', 'RESOLVED'].includes(status)) return 'bg-emerald-100 text-emerald-800';
  if (['INTERESTED', 'COORDINATING', 'ASSISTANCE_ACTIVE', 'NEEDS_ADOPTION'].includes(status)) return 'bg-orange-100 text-orange-800';
  if (status === 'CANCELLED') return 'bg-slate-200 text-slate-600';
  return 'bg-teal-100 text-teal-800';
}

function RescueCaseCard({ rescueCase }: { rescueCase: RescueCaseSummary }) {
  const image = rescueCase.images[0];
  const primaryNeed = rescueCase.needs.find((need) => need.isPrimary);
  return (
    <Card className="overflow-hidden">
      <div className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[128px_minmax(0,1fr)]">
        <div className="relative min-h-40 bg-slate-100">
          {image ? (
            <Image
              src={image}
              alt={`${SPECIES_LABELS[rescueCase.species] || 'Animal'} que necesita ayuda`}
              fill
              sizes="128px"
              unoptimized={shouldUnoptimizeImage(image)}
              className="object-cover"
            />
          ) : (
            <span className="material-symbols-rounded absolute inset-0 flex items-center justify-center text-4xl text-slate-300">pets</span>
          )}
        </div>
        <CardContent className="min-w-0 space-y-3 p-4">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {SPECIES_LABELS[rescueCase.species] || 'Animal'} · {SIZE_LABELS[rescueCase.size] || rescueCase.size}
              </p>
              <p className="truncate text-sm text-slate-500">{rescueCase.location}</p>
            </div>
            <Badge className={statusClass(rescueCase.status)}>{RESCUE_STATUS_LABELS[rescueCase.status] || rescueCase.status}</Badge>
          </div>
          <p className="line-clamp-2 text-sm text-slate-600">{rescueCase.description}</p>
          {primaryNeed && <p className="text-xs font-semibold text-teal-800">Principal: {RESCUE_NEED_LABELS[primaryNeed.type]}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{rescueCase.searchRadiusKm} km de radio</span>
            <span>{rescueCase.offerCount} hogares contactados</span>
            {rescueCase.interestedCount > 0 && <span className="font-medium text-orange-700">{rescueCase.interestedCount} interesados</span>}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/hogares-de-transito/casos/${rescueCase.id}`}>Ver seguimiento</Link>
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}

function OfferCard({
  offer,
  onInterested,
  onRefresh,
}: {
  offer: FosterOfferSummary;
  onInterested: () => void;
  onRefresh: () => void;
}) {
  const image = offer.rescueCase.images[0];
  const pending = offer.status === 'PENDING';
  return (
    <Card className="overflow-hidden">
      {image && (
        <div className="relative aspect-[16/8] bg-slate-100">
          <Image
            src={image}
            alt="Animal que necesita hogar de tránsito"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized={shouldUnoptimizeImage(image)}
            className="object-cover"
          />
        </div>
      )}
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">
              {SPECIES_LABELS[offer.rescueCase.species]} · {SIZE_LABELS[offer.rescueCase.size]}
            </p>
            <p className="text-sm text-slate-500">{offer.rescueCase.location} · {offer.distanceKm.toFixed(1)} km</p>
          </div>
          <Badge variant="outline">{offer.score}% compatible</Badge>
        </div>
        <p className="line-clamp-3 text-sm text-slate-600">{offer.rescueCase.description}</p>
        <ul className="space-y-1 text-xs text-slate-500">
          {offer.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
        </ul>
        {pending ? (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => void onInterested()}>Puedo ayudar</Button>
            <Button variant="outline" onClick={async () => {
              const response = await fetch(`/api/foster/offers/${offer.id}/respond`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: 'DECLINED' }),
              });
              const data = await response.json();
              if (!response.ok) toast.error(data.error || 'No se pudo responder');
              else {
                toast.success('Respuesta guardada');
                onRefresh();
              }
            }}>Esta vez no</Button>
          </div>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/hogares-de-transito/casos/${offer.rescueCase.id}`}>
              {offer.placement ? 'Abrir coordinación' : 'Ver caso'}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function HelpCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<FosterProfileView | null>(null);
  const [dashboard, setDashboard] = useState<HelpDashboardData>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [caseDialogOpen, setCaseDialogOpen] = useState(searchParams.get('create') === 'case');
  const [profileDialogOpen, setProfileDialogOpen] = useState(searchParams.get('create') === 'profile');
  const requestedReturnTo = searchParams.get('returnTo');
  const returnTo = requestedReturnTo?.startsWith('/hogares-de-transito/casos/') ? requestedReturnTo : null;
  const requestedTab = searchParams.get('view');
  const initialTab = ['offers', 'home', 'volunteer', 'alerts'].includes(requestedTab || '') ? requestedTab! : 'cases';
  const [activeTab, setActiveTab] = useState(initialTab);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileResponse, casesResponse] = await Promise.all([
        fetch('/api/foster/profile'),
        fetch('/api/rescue-cases'),
      ]);
      const [profileData, casesData] = await Promise.all([profileResponse.json(), casesResponse.json()]);
      if (profileData.success) setProfile(profileData.profile);
      if (casesData.success) {
        setDashboard({
          createdCases: casesData.createdCases || [],
          offers: casesData.offers || [],
          fosterPlacements: casesData.fosterPlacements || [],
        });
      }
    } catch {
      toast.error('No pudimos cargar Hogares de tránsito');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const respondInterested = async (offerId: string) => {
    const response = await fetch(`/api/foster/offers/${offerId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: 'INTERESTED' }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error || 'No se pudo responder');
      return;
    }
    toast.success('Avisamos que podés ayudar. Ahora el rescatista debe elegir un hogar.');
    await load();
  };

  const toggleProfile = async () => {
    if (!profile || profile.status === 'SUSPENDED') return;
    const status = profile.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const response = await fetch('/api/foster/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error || 'No se pudo cambiar la disponibilidad');
      return;
    }
    setProfile((current) => current ? { ...current, status } : current);
    toast.success(status === 'ACTIVE' ? 'Tu hogar está disponible' : 'Tu hogar quedó pausado');
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:py-8">
      <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Hogares de tránsito</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Coordiná tránsito, voluntariado y continuidad hacia adopción. Las ubicaciones exactas y los datos personales permanecen privados.
            </p>
          </div>
          <div className="flex size-24 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <span className="material-symbols-rounded text-5xl" aria-hidden="true">volunteer_activism</span>
          </div>
        </div>
      </section>

      <section aria-label="Opciones de hogares de tránsito" className="grid gap-8 md:grid-cols-2 md:gap-0">
        <div className="space-y-5 md:pr-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-teal-700">Ayuda temporal</h2>
            <p className="mt-1 text-sm text-slate-500">Resguardo y tránsito para una mascota</p>
          </div>
          <div className="space-y-3">
            {[
              { title: 'Encontré una mascota', description: 'Crear una solicitud urgente', icon: 'pets', action: () => setCaseDialogOpen(true) },
              { title: 'Ofrecer mi hogar', description: profile ? 'Editar disponibilidad' : 'Activar hogar de tránsito', icon: 'home', action: () => setProfileDialogOpen(true) },
              { title: 'Ayudar como voluntario', description: 'Traslados, rescate y logística', icon: 'volunteer_activism', action: () => setActiveTab('volunteer') },
            ].map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={item.action}
                className="group flex min-h-28 w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-teal-300 hover:bg-teal-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 sm:size-14" aria-hidden="true">
                  <span className="material-symbols-rounded text-3xl">{item.icon}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">{item.description}</span>
                </span>
                <span className="material-symbols-rounded shrink-0 text-2xl text-teal-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true">chevron_right</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5 border-t border-slate-200 pt-8 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-orange-600">Adopción definitiva</h2>
            <p className="mt-1 text-sm text-slate-500">Un hogar permanente para una mascota</p>
          </div>
          <div className="space-y-3">
            {[
              {
                href: '/adoptions',
                eyebrow: 'Quiero adoptar',
                title: 'Buscar una mascota',
                description: 'Ver mascotas disponibles',
                action: 'Explorar',
                icon: 'search',
              },
              {
                href: '/adoptions?create=listing',
                eyebrow: 'Quiero dar en adopción',
                title: 'Publicar una mascota',
                description: 'Crear su ficha responsable',
                action: 'Publicar',
                icon: 'publish',
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex min-h-28 w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-orange-300 hover:bg-orange-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 sm:size-14" aria-hidden="true">
                  <span className="material-symbols-rounded text-3xl">{item.icon}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.6875rem] font-bold uppercase tracking-wide text-orange-600">{item.eyebrow}</span>
                  <span className="mt-1 block font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-sm text-slate-500">{item.description}</span>
                </span>
                <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-orange-600 min-[900px]:flex">
                  {item.action}
                  <span className="material-symbols-rounded text-2xl transition-transform group-hover:translate-x-0.5" aria-hidden="true">chevron_right</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-h-11 w-max min-w-full justify-start">
            <TabsTrigger value="cases" className="min-h-10 min-w-32 text-slate-700 data-[state=active]:text-teal-800">Mis casos</TabsTrigger>
            <TabsTrigger value="offers" className="min-h-10 min-w-32 text-slate-700 data-[state=active]:text-teal-800">
              Solicitudes {dashboard.offers.length > 0 && `(${dashboard.offers.length})`}
            </TabsTrigger>
            <TabsTrigger value="home" className="min-h-10 min-w-32 text-slate-700 data-[state=active]:text-teal-800">Mi hogar</TabsTrigger>
            <TabsTrigger value="volunteer" className="min-h-10 min-w-32 text-slate-700 data-[state=active]:text-teal-800">Voluntariado</TabsTrigger>
            <TabsTrigger value="alerts" className="min-h-10 min-w-40 text-slate-700 data-[state=active]:text-teal-800">Alertas solidarias</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cases" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Casos que estás acompañando</h2>
              <p className="text-sm text-slate-500">Seguimiento desde la búsqueda hasta el cierre.</p>
            </div>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={() => setCaseDialogOpen(true)}>Crear caso</Button>
          </div>
          {loading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          ) : dashboard.createdCases.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center"><p className="font-medium text-slate-700">Todavía no creaste solicitudes de ayuda</p><p className="mt-1 text-sm text-slate-500">Cuando encuentres un animal, podés iniciar la búsqueda desde acá.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {dashboard.createdCases.map((rescueCase) => <RescueCaseCard key={rescueCase.id} rescueCase={rescueCase} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offers" className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Solicitudes cercanas</h2>
            <p className="text-sm text-slate-500">Solo aparecen casos compatibles dentro del radio elegido por quien pidió ayuda.</p>
          </div>
          {!profile ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center"><p className="font-medium text-slate-700">Primero activá tu hogar de tránsito</p><Button className="mt-4" onClick={() => setProfileDialogOpen(true)}>Crear perfil</Button></CardContent></Card>
          ) : dashboard.offers.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center"><p className="font-medium text-slate-700">No hay solicitudes compatibles por ahora</p><p className="mt-1 text-sm text-slate-500">Te avisaremos cuando aparezca un caso cercano.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {dashboard.offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onInterested={() => void respondInterested(offer.id)}
                  onRefresh={() => void load()}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="home" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Disponibilidad del hogar</CardTitle>
                <p className="mt-1 text-sm text-slate-500">No hay revisión previa; podés pausar nuevas solicitudes cuando lo necesites.</p>
              </div>
              {profile && <Badge className={profile.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}>{profile.status === 'ACTIVE' ? 'Disponible' : profile.status === 'PAUSED' ? 'Pausado' : 'Suspendido'}</Badge>}
            </CardHeader>
            <CardContent className="space-y-4">
              {profile ? (
                <>
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">Zona y radio</p><p className="mt-1 font-medium text-slate-900">{profile.location} · {profile.radiusKm} km</p></div>
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">Capacidad</p><p className="mt-1 font-medium text-slate-900">{profile.occupiedSlots}/{profile.capacity} lugares ocupados</p></div>
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-slate-500">Duración máxima</p><p className="mt-1 font-medium text-slate-900">{profile.maxDurationDays} días</p></div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={() => setProfileDialogOpen(true)}>Editar perfil</Button>
                    {profile.status !== 'SUSPENDED' && <Button variant="outline" onClick={() => void toggleProfile()}>{profile.status === 'ACTIVE' ? 'Pausar solicitudes' : 'Volver a activar'}</Button>}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center"><p className="text-slate-600">Todavía no configuraste tu hogar.</p><Button className="mt-4" onClick={() => setProfileDialogOpen(true)}>Ofrecer mi hogar</Button></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volunteer"><VolunteerPanel returnTo={returnTo} initialProfileOpen={searchParams.get('create') === 'volunteer'} /></TabsContent>

        <TabsContent value="alerts"><SolidarityAlerts /></TabsContent>
      </Tabs>

      <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
        <DialogContent className="max-h-[92svh] max-w-3xl overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>Nueva solicitud de ayuda</DialogTitle><DialogDescription>Datos del animal encontrado</DialogDescription></DialogHeader>
          <RescueCaseForm onCreated={(caseId) => {
            setCaseDialogOpen(false);
            router.push(`/hogares-de-transito/casos/${caseId}`);
          }} />
        </DialogContent>
      </Dialog>

      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-h-[92svh] max-w-4xl overflow-y-auto">
          <DialogHeader className="sr-only"><DialogTitle>Perfil de hogar de tránsito</DialogTitle><DialogDescription>Disponibilidad y condiciones del hogar</DialogDescription></DialogHeader>
          <FosterProfileForm profile={profile} onSaved={(saved) => {
            setProfile(saved);
            setProfileDialogOpen(false);
            if (returnTo) router.push(returnTo);
            else void load();
          }} />
        </DialogContent>
      </Dialog>
    </main>
  );
}
