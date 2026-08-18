'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    thumbnailIndex: number;
    goodWithKids: string | null;
  };
}

function AdoptionsContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<AdoptionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreate, setShowCreate] = useState(
    Boolean(searchParams.get('list')) || searchParams.get('create') === 'listing',
  );
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
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch('/api/adoptions');
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudieron cargar las fichas');
      setListings(data.listings);
    } catch (error) {
      console.error('Error fetching adoption listings:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
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
      <PageHeader
        title="Adopciones responsables"
        description="Conocé cada historia y postulá con información clara."
        action={<div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => setShowProfile((value) => !value)}>Perfil adoptante</Button>
          <Button className="w-full sm:w-auto" onClick={() => setShowCreate((value) => !value)}>Publicar ficha</Button>
        </div>}
      />

      {showProfile && (
        <Card className="space-y-3 p-4">
          <Select
            value={profile.housingType}
            onValueChange={(value) => setProfile({ ...profile, housingType: value })}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Tipo de vivienda" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="apartment">Departamento</SelectItem>
              <SelectItem value="house">Casa</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={profile.hasYard} onCheckedChange={(checked) => setProfile({ ...profile, hasYard: checked === true })} />
            Tengo patio
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={profile.hasKids} onCheckedChange={(checked) => setProfile({ ...profile, hasKids: checked === true })} />
            Hay niños en casa
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={profile.hasOtherPets} onCheckedChange={(checked) => setProfile({ ...profile, hasOtherPets: checked === true })} />
            Tengo otras mascotas
          </label>
          <Select
            value={profile.experience}
            onValueChange={(value) => setProfile({ ...profile, experience: value })}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Experiencia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin experiencia</SelectItem>
              <SelectItem value="some">Algo de experiencia</SelectItem>
              <SelectItem value="experienced">Experiencia alta</SelectItem>
            </SelectContent>
          </Select>
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
        <Card className="space-y-3 p-4">
          <Select
            value={listingForm.petId || undefined}
            onValueChange={(value) => setListingForm({ ...listingForm, petId: value })}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="Elegí una mascota" /></SelectTrigger>
            <SelectContent>
              {pets.map((pet) => (
                <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <div className="grid gap-4 md:grid-cols-2" aria-live="polite">
        {loading ? (
          [0, 1].map((item) => (
            <Card key={item} className="overflow-hidden" aria-label="Cargando ficha de adopción">
              <div className="h-48 animate-pulse bg-slate-200" />
              <CardContent className="space-y-3 p-4">
                <div className="h-6 w-2/5 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
              </CardContent>
            </Card>
          ))
        ) : loadError ? (
          <EmptyState
            className="md:col-span-2"
            title="No pudimos cargar las adopciones"
            description="Revisá tu conexión e intentá nuevamente."
            action={<Button variant="outline" onClick={() => void load()}>Reintentar</Button>}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            className="md:col-span-2"
            icon={<PawPrint className="size-11" aria-hidden="true" />}
            title="Todavía no hay fichas de adopción"
            description="Cuando alguien publique una mascota en adopción, va a aparecer acá."
            action={<Button onClick={() => setShowCreate(true)}>Publicar ficha</Button>}
          />
        ) : (
          listings.map((listing) => {
            const image = getPrimaryImageUrl(listing.pet.images, listing.pet.thumbnailIndex);
            return (
              <Card key={listing.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {image ? (
                    <img src={image} alt={listing.pet.name} className="h-48 w-full rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-xl bg-primary-soft">
                      <PawPrint className="size-10 text-primary/30" aria-hidden="true" />
                    </div>
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
          })
        )}
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
