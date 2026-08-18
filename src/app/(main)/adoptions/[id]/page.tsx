'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getPrimaryImageUrl, shouldUnoptimizeImage } from '@/lib/media';
import { toast } from 'sonner';

interface ListingDetail {
  id: string;
  character: string | null;
  specialNeeds: string | null;
  requirements: string | null;
  location: string | null;
  status: string;
  listedByUserId: string;
  pet: {
    id: string;
    name: string;
    petType: string;
    bio: string;
    images: string;
    thumbnailIndex: number;
    goodWithKids: string | null;
    goodWithDogs: string | null;
    energy: string;
  };
  applications?: Array<{
    id: string;
    status: string;
    compatibilityScore: number;
    message: string | null;
    applicant: { id: string; name: string | null };
  }>;
  handoff?: {
    role: 'FOSTER' | 'ADOPTER';
    status: string;
    fosterConfirmedAt: string | null;
    adopterConfirmedAt: string | null;
  } | null;
}

export default function AdoptionDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session, status: sessionStatus } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerLocation, setOwnerLocation] = useState('');
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    setLoadError(false);
    try {
      const response = await fetch(`/api/adoptions/${params.id}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo cargar la ficha');
      setListing(data.listing);
    } catch (error) {
      console.error('Error fetching adoption listing:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8" aria-label="Cargando ficha de adopción">
        <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-200" />
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="h-64 animate-pulse bg-slate-200" />
          <div className="space-y-3 p-6">
            <div className="h-7 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="No pudimos abrir esta ficha"
          description="Es posible que ya no esté disponible."
          action={<Button asChild variant="outline"><Link href="/adoptions">Volver a adopciones</Link></Button>}
        />
      </div>
    );
  }

  const image = getPrimaryImageUrl(listing.pet.images, listing.pet.thumbnailIndex);
  const isOwner = listing.listedByUserId === session?.user?.id;
  const currentApplication = !isOwner ? listing.applications?.[0] : undefined;
  const applicationStatus = currentApplication?.status === 'ACCEPTED'
    ? 'Aceptada'
    : currentApplication?.status === 'REJECTED'
      ? 'Rechazada'
      : 'Pendiente';

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Button asChild variant="ghost"><Link href="/adoptions">Volver</Link></Button>
      <Card className="overflow-hidden">
        {image ? (
          <div className="relative h-64 w-full">
            <Image src={image} alt={listing.pet.name} fill sizes="(max-width: 768px) 100vw, 768px" unoptimized={shouldUnoptimizeImage(image)} className="object-cover" priority />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center bg-primary-soft">
            <PawPrint className="size-11 text-primary/30" aria-hidden="true" />
          </div>
        )}
        <CardHeader>
          <CardTitle>{listing.pet.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>{listing.pet.bio}</p>
          <p className="text-sm text-slate-600">{listing.character}</p>
          {listing.specialNeeds && <p className="text-sm">Necesidades: {listing.specialNeeds}</p>}
          {listing.requirements && <p className="text-sm">Requisitos: {listing.requirements}</p>}
          <div className="flex flex-wrap gap-2">
            {listing.pet.goodWithKids === 'yes' && <Badge variant="outline">Bien con niños</Badge>}
            {listing.pet.goodWithDogs === 'yes' && <Badge variant="outline">Bien con perros</Badge>}
          </div>
          <Button asChild variant="outline">
            <Link href={`/pets/${listing.pet.id}`}>Ver pasaporte</Link>
          </Button>
        </CardContent>
      </Card>

      {listing.handoff?.status === 'MATCHED' && (
        <Card className="border-orange-200">
          <CardHeader><CardTitle className="text-lg">Confirmar entrega definitiva</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-3"><p className="font-medium">Hogar de tránsito</p><p className={listing.handoff.fosterConfirmedAt ? 'text-sm text-success' : 'text-sm text-slate-500'}>{listing.handoff.fosterConfirmedAt ? 'Entrega confirmada' : 'Confirmación pendiente'}</p></div>
              <div className="p-3"><p className="font-medium">Familia adoptante</p><p className={listing.handoff.adopterConfirmedAt ? 'text-sm text-success' : 'text-sm text-slate-500'}>{listing.handoff.adopterConfirmedAt ? 'Recepción confirmada' : 'Confirmación pendiente'}</p></div>
            </div>
            {listing.handoff.role === 'ADOPTER' && !listing.handoff.adopterConfirmedAt && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="adopter-owner-name">Nombre del responsable</Label><Input id="adopter-owner-name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Sólo si todavía no tenés perfil" /></div>
                <div className="space-y-2"><Label htmlFor="adopter-owner-location">Zona</Label><Input id="adopter-owner-location" value={ownerLocation} onChange={(event) => setOwnerLocation(event.target.value)} placeholder="Sólo si todavía no tenés perfil" /></div>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              {((listing.handoff.role === 'FOSTER' && !listing.handoff.fosterConfirmedAt) || (listing.handoff.role === 'ADOPTER' && !listing.handoff.adopterConfirmedAt)) && (
                <Button disabled={confirming} onClick={async () => {
                  setConfirming(true);
                  try {
                    const response = await fetch(`/api/adoptions/${listing.id}/handoff/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerName: ownerName || undefined, ownerLocation: ownerLocation || undefined }) });
                    const data = await response.json();
                    if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo confirmar');
                    toast.success(data.completed ? 'Adopción completada' : 'Confirmación guardada');
                    void load();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'No se pudo confirmar');
                  } finally {
                    setConfirming(false);
                  }
                }}>Confirmar {listing.handoff.role === 'FOSTER' ? 'entrega' : 'recepción'}</Button>
              )}
              {listing.handoff.role === 'FOSTER' && (
                <Button variant="outline" disabled={confirming} onClick={async () => {
                  const response = await fetch(`/api/adoptions/${listing.id}/handoff/cancel`, { method: 'POST' });
                  const data = await response.json();
                  toast[data.success ? 'success' : 'error'](data.success ? 'La ficha volvió a recibir postulaciones' : data.error || 'No se pudo cancelar');
                  if (data.success) void load();
                }}>Cancelar coordinación</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isOwner && (
        <Card className="space-y-3 p-4">
          {currentApplication ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Tu postulación</h2>
                <Badge>{applicationStatus}</Badge>
              </div>
              <p className="break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
                {currentApplication.message || 'Postulación enviada sin mensaje.'}
              </p>
            </>
          ) : (
            <>
              <h2 className="font-semibold">Postularse</h2>
              <Textarea
                placeholder="Contá por qué podés darle un hogar responsable"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <Button className="w-full sm:w-auto" onClick={async () => {
                const response = await fetch(`/api/adoptions/${listing.id}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message }),
                });
                const data = await response.json();
                if (data.success) {
                  toast.success(`Postulación enviada. Compatibilidad: ${data.application.compatibilityScore}%`);
                  void load();
                } else {
                  toast.error(data.error || 'No se pudo postular');
                }
              }}>Enviar postulación</Button>
            </>
          )}
        </Card>
      )}

      {isOwner && (listing.applications || []).length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">Postulaciones</h2>
          <div className="divide-y divide-border border-y border-border">
          {listing.applications?.map((application) => (
            <div key={application.id} className="space-y-2 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{application.applicant.name}</p>
                <Badge>{application.compatibilityScore}% compatibilidad</Badge>
              </div>
              <p className="break-words text-sm text-slate-600 [overflow-wrap:anywhere]">{application.message}</p>
              {application.status === 'PENDING' && (
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button size="sm" onClick={async () => {
                    await fetch(`/api/adoptions/applications/${application.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'ACCEPTED' }),
                    });
                    void load();
                  }}>Aceptar</Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    await fetch(`/api/adoptions/applications/${application.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'REJECTED' }),
                    });
                    void load();
                  }}>Rechazar</Button>
                </div>
              )}
            </div>
          ))}
          </div>
        </Card>
      )}
    </div>
  );
}
