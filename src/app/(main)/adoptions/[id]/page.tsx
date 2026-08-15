'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getPrimaryImageUrl } from '@/lib/media';
import { toast } from 'sonner';

interface ListingDetail {
  id: string;
  character: string | null;
  specialNeeds: string | null;
  requirements: string | null;
  location: string | null;
  listedByUserId: string;
  pet: {
    id: string;
    name: string;
    petType: string;
    bio: string;
    images: string;
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
}

export default function AdoptionDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session, status: sessionStatus } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState('');

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
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">No pudimos abrir esta ficha</h1>
        <p className="mt-2 text-sm text-slate-500">Es posible que ya no esté disponible.</p>
        <Button asChild variant="outline" className="mt-5"><Link href="/adoptions">Volver a adopciones</Link></Button>
      </div>
    );
  }

  const image = getPrimaryImageUrl(listing.pet.images);
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
        {image && (
          <img src={image} alt={listing.pet.name} className="h-64 w-full object-cover" />
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
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Postulaciones</h2>
          {listing.applications?.map((application) => (
            <div key={application.id} className="space-y-2 rounded-xl border p-3">
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
        </Card>
      )}
    </div>
  );
}
