'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await fetch(`/api/adoptions/${params.id}`);
    const data = await response.json();
    if (data.success) setListing(data.listing);
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  if (!listing) return <div className="p-8 text-center text-slate-500">Cargando ficha...</div>;

  const image = getPrimaryImageUrl(listing.pet.images);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Button asChild variant="ghost"><Link href="/adoptions">Volver</Link></Button>
      <Card>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
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
          <div className="flex gap-2">
            {listing.pet.goodWithKids === 'yes' && <Badge variant="outline">Bien con niños</Badge>}
            {listing.pet.goodWithDogs === 'yes' && <Badge variant="outline">Bien con perros</Badge>}
          </div>
          <Button asChild variant="outline">
            <Link href={`/pets/${listing.pet.id}`}>Ver pasaporte</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Postularse</h2>
        <Textarea
          placeholder="Contá por qué podés darle un hogar responsable"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <Button onClick={async () => {
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
      </Card>

      {(listing.applications || []).length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Postulaciones</h2>
          {listing.applications?.map((application) => (
            <div key={application.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{application.applicant.name}</p>
                <Badge>{application.compatibilityScore}% compatibilidad</Badge>
              </div>
              <p className="text-sm text-slate-600">{application.message}</p>
              {application.status === 'PENDING' && (
                <div className="flex gap-2">
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
