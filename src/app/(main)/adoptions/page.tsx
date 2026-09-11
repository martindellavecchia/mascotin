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
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getPrimaryImageUrl } from '@/lib/media';
import { toast } from 'sonner';
import SaveSearchButton from '@/components/searches/SaveSearchButton';
import { searchFiltersSchema } from '@/lib/product-search';

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
  const [filters, setFilters] = useState(() => { const result = searchFiltersSchema.safeParse({ species: searchParams.get('species') || '', size: searchParams.get('size') || '', search: searchParams.get('search') || '', zone: searchParams.get('zone') || '' }); return result.success ? result.data : searchFiltersSchema.parse({}); });
  const [query, setQuery] = useState(() => { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, String(value)); }); return params.toString(); });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreate, setShowCreate] = useState(
    Boolean(searchParams.get('list')) || searchParams.get('create') === 'listing',
  );
  const [pets, setPets] = useState<Array<{ id: string; name: string }>>([]);
  const [profile, setProfile] = useState({
    housingType: '',
    hasYard: false,
    hasKids: false,
    hasOtherPets: false,
    experience: '',
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
      const response = await fetch(`/api/adoptions${query ? `?${query}` : ''}`);
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
    fetch('/api/adoptions/profile').then((res) => {
      if (!res.ok) throw new Error('No pudimos cargar tu perfil adoptante.');
      return res.json();
    }).then((data) => {
      if (data.success) setProfile((current) => ({ ...current, ...data.profile }));
    }).catch(() => {
      setProfileLoadFailed(true);
      setProfileError('No pudimos cargar tu perfil adoptante. Recargá la página antes de editarlo.');
    });
    fetch('/api/pet/mine').then((res) => res.json()).then((data) => {
      if (data.pets) setPets(data.pets);
    }).catch(() => toast.error('No pudimos cargar tus mascotas.'));
  }, []);
  useEffect(() => { void load(); }, [query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link href="/hogares-de-transito" className="inline-flex min-h-11 items-center text-sm font-medium text-primary">Volver a Hogares de tránsito</Link>
      <PageHeader
        title="Adopciones responsables"
        description="Conocé cada historia y postulá con información clara."
        action={<div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => setShowProfile((value) => !value)}>Perfil adoptante</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => setShowCreate((value) => !value)}>Publicar ficha</Button>
        </div>}
      />

      <form className="space-y-3 rounded-xl border bg-surface p-4" onSubmit={e => { e.preventDefault(); const params = new URLSearchParams(); Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, String(v)); }); setQuery(params.toString()); }}>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Buscar<Input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} maxLength={100} /></label><label className="text-sm font-medium">Zona<Input placeholder="Barrio o ciudad (opcional)" value={filters.zone} onChange={e => setFilters({ ...filters, zone: e.target.value })} maxLength={100} /></label>
        <label className="text-sm font-medium">Especie<select className="mt-1 h-11 w-full rounded-md border border-border-control bg-surface px-3" value={filters.species} onChange={e => setFilters({ ...filters, species: e.target.value as typeof filters.species })}><option value="">Todas</option><option value="dog">Perro</option><option value="cat">Gato</option><option value="bird">Ave</option><option value="other">Otra</option></select></label>
        <label className="text-sm font-medium">Tamaño<select className="mt-1 h-11 w-full rounded-md border border-border-control bg-surface px-3" value={filters.size} onChange={e => setFilters({ ...filters, size: e.target.value as typeof filters.size })}><option value="">Todos</option><option value="small">Pequeño</option><option value="medium">Mediano</option><option value="large">Grande</option></select></label></div>
        <div className="flex flex-wrap gap-2"><Button>Buscar</Button><Button variant="outline" type="button" onClick={() => { setFilters(searchFiltersSchema.parse({})); setQuery(''); }}>Limpiar filtros</Button><SaveSearchButton kind="ADOPTION" filters={filters} /></div>
      </form>

      {showProfile && (
        <Card className="space-y-3 p-4">
          {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}
          <Label htmlFor="adopter-housing">Tipo de vivienda</Label>
          <Select
            value={profile.housingType}
            onValueChange={(value) => setProfile({ ...profile, housingType: value })}
          >
            <SelectTrigger id="adopter-housing" className="w-full"><SelectValue placeholder="Elegí tu tipo de vivienda" /></SelectTrigger>
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
          <Label htmlFor="adopter-experience">Experiencia cuidando mascotas</Label>
          <Select
            value={profile.experience}
            onValueChange={(value) => setProfile({ ...profile, experience: value })}
          >
            <SelectTrigger id="adopter-experience" className="w-full"><SelectValue placeholder="Elegí tu experiencia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin experiencia</SelectItem>
              <SelectItem value="some">Algo de experiencia</SelectItem>
              <SelectItem value="experienced">Experiencia alta</SelectItem>
            </SelectContent>
          </Select>
          <Label htmlFor="adopter-hours">Horas disponibles por día</Label>
          <Input id="adopter-hours" placeholder="Horas disponibles" value={profile.hoursAvailable} onChange={(e) => setProfile({ ...profile, hoursAvailable: e.target.value })} />
          <Label htmlFor="adopter-notes">Notas sobre tu hogar</Label>
          <Textarea id="adopter-notes" placeholder="Notas" value={profile.notes} onChange={(e) => setProfile({ ...profile, notes: e.target.value })} />
          <Button disabled={savingProfile || profileLoadFailed} onClick={async () => {
            if (!profile.housingType || !profile.experience) {
              setProfileError('Elegí el tipo de vivienda y tu experiencia');
              document.getElementById(!profile.housingType ? 'adopter-housing' : 'adopter-experience')?.focus();
              return;
            }
            setSavingProfile(true);
            setProfileError('');
            try {
              const response = await fetch('/api/adoptions/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(profile),
            });
              const data = await response.json();
              if (!response.ok || !data.success) throw new Error(data.error || 'No pudimos guardar tu perfil');
              toast.success('Perfil guardado');
            } catch (error) {
              setProfileError(error instanceof Error ? error.message : 'No pudimos guardar tu perfil');
            } finally {
              setSavingProfile(false);
            }
          }}>{savingProfile ? 'Guardando...' : 'Guardar perfil'}</Button>
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
            title={query && (filters.search || filters.zone || filters.species || filters.size) ? 'No hay fichas con estos filtros' : 'Todavía no hay fichas de adopción'}
            description="Podés ampliar la búsqueda o guardar los filtros para recibir novedades."
            action={<Button asChild variant="outline"><Link href="/hogares-de-transito">Conocer otras formas de ayudar</Link></Button>}
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
