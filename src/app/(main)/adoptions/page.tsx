'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getPrimaryImageUrl } from '@/lib/media';
import { toast } from 'sonner';

interface AdoptionCard {
  id: string;
  character: string | null;
  specialNeeds: string | null;
  location: string | null;
  status: string;
  pet: {
    id: string;
    name: string;
    petType: string;
    breed: string | null;
    age: number;
    images: string;
    goodWithKids: string | null;
  };
}

function AdoptionsContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<AdoptionCard[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreate, setShowCreate] = useState(Boolean(searchParams.get('list')));
  const [pets, setPets] = useState<Array<{ id: string; name: string }>>([]);
  const [profile, setProfile] = useState({
    housingType: 'apartment',
    hasYard: false,
    hasKids: false,
    hasOtherPets: false,
    experience: 'some',
    hoursAvailable: '',
    notes: '',
  });
  const [listingForm, setListingForm] = useState({
    petId: searchParams.get('list') || '',
    character: '',
    specialNeeds: '',
    requirements: '',
    location: '',
  });

  const load = async () => {
    const response = await fetch('/api/adoptions');
    const data = await response.json();
    if (data.success) setListings(data.listings);
  };

  useEffect(() => {
    void load();
    fetch('/api/adoptions/profile').then((res) => res.json()).then((data) => {
      if (data.success) setProfile((current) => ({ ...current, ...data.profile }));
    });
    fetch('/api/pet/mine').then((res) => res.json()).then((data) => {
      if (data.pets) setPets(data.pets);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adopciones responsables</h1>
          <p className="text-slate-500">Fichas completas y postulaciones con compatibilidad.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowProfile((value) => !value)}>Perfil adoptante</Button>
          <Button onClick={() => setShowCreate((value) => !value)}>Publicar ficha</Button>
        </div>
      </div>

      {showProfile && (
        <Card className="p-4 space-y-3">
          <select
            className="h-10 rounded-md border px-3"
            value={profile.housingType}
            onChange={(event) => setProfile({ ...profile, housingType: event.target.value })}
          >
            <option value="apartment">Departamento</option>
            <option value="house">Casa</option>
            <option value="other">Otro</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.hasYard} onChange={(e) => setProfile({ ...profile, hasYard: e.target.checked })} />Tengo patio</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.hasKids} onChange={(e) => setProfile({ ...profile, hasKids: e.target.checked })} />Hay niños en casa</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.hasOtherPets} onChange={(e) => setProfile({ ...profile, hasOtherPets: e.target.checked })} />Tengo otras mascotas</label>
          <select
            className="h-10 rounded-md border px-3"
            value={profile.experience}
            onChange={(event) => setProfile({ ...profile, experience: event.target.value })}
          >
            <option value="none">Sin experiencia</option>
            <option value="some">Algo de experiencia</option>
            <option value="experienced">Experiencia alta</option>
          </select>
          <Input placeholder="Horas disponibles" value={profile.hoursAvailable} onChange={(e) => setProfile({ ...profile, hoursAvailable: e.target.value })} />
          <Textarea placeholder="Notas" value={profile.notes} onChange={(e) => setProfile({ ...profile, notes: e.target.value })} />
          <Button onClick={async () => {
            const response = await fetch('/api/adoptions/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(profile),
            });
            const data = await response.json();
            toast[data.success ? 'success' : 'error'](data.success ? 'Perfil guardado' : data.error);
          }}>Guardar perfil</Button>
        </Card>
      )}

      {showCreate && (
        <Card className="p-4 space-y-3">
          <select
            className="h-10 rounded-md border px-3"
            value={listingForm.petId}
            onChange={(event) => setListingForm({ ...listingForm, petId: event.target.value })}
          >
            <option value="">Elegí una mascota</option>
            {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
          </select>
          <Textarea placeholder="Carácter" value={listingForm.character} onChange={(e) => setListingForm({ ...listingForm, character: e.target.value })} />
          <Input placeholder="Necesidades especiales" value={listingForm.specialNeeds} onChange={(e) => setListingForm({ ...listingForm, specialNeeds: e.target.value })} />
          <Input placeholder="Requisitos para el hogar" value={listingForm.requirements} onChange={(e) => setListingForm({ ...listingForm, requirements: e.target.value })} />
          <Input placeholder="Zona" value={listingForm.location} onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })} />
          <Button onClick={async () => {
            const response = await fetch('/api/adoptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(listingForm),
            });
            const data = await response.json();
            if (data.success) {
              toast.success('Ficha publicada');
              setShowCreate(false);
              void load();
            } else {
              toast.error(data.error || 'No se pudo publicar');
            }
          }}>Publicar</Button>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {listings.map((listing) => {
          const image = getPrimaryImageUrl(listing.pet.images);
          return (
            <Card key={listing.id}>
              <CardContent className="p-4 space-y-3">
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={listing.pet.name} className="h-40 w-full rounded-xl object-cover" />
                )}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{listing.pet.name}</h2>
                  <Badge>{listing.status}</Badge>
                </div>
                <p className="text-sm text-slate-600">{listing.character}</p>
                {listing.pet.goodWithKids === 'yes' && <Badge variant="outline">Bien con niños</Badge>}
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/adoptions/${listing.id}`}>Ver ficha</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function AdoptionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando adopciones...</div>}>
      <AdoptionsContent />
    </Suspense>
  );
}
