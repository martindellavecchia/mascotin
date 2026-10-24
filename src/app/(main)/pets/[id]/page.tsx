'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, PawPrint } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  COMPATIBILITY_LABELS,
  INTENT_LABELS,
  TEMPERAMENT_LABELS,
} from '@/components/pets/CompatibilityFields';
import EmergencyQr from '@/components/pets/EmergencyQr';
import HealthRecordsCard, { sortHealthRecords, type HealthRecord } from '@/components/pets/HealthRecordsCard';
import { PetCompletionPrompt } from '@/components/pets/PetCompletionPrompt';
import { parseJsonStringArray } from '@/lib/json-array';
import { getPrimaryImageUrl, shouldUnoptimizeImage } from '@/lib/media';
import {
  PET_ACTIVITY_LABELS,
  PET_ENERGY_LABELS,
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PET_TYPE_LABELS,
  UNSET_LABEL,
  formatPetWeight,
  getMissingPetProfileFields,
  getOptionLabel,
  getPetAgeLabel,
  parsePetActivities,
} from '@/lib/pet-display';

interface PassportPet {
  id: string;
  name: string;
  petType: string;
  breed: string | null;
  age: number;
  weight?: number | null;
  size: string;
  gender: string;
  energy: string;
  bio: string;
  activities?: string | string[] | null;
  location: string;
  images: string;
  thumbnailIndex: number;
  vaccinated: boolean | null;
  neutered: boolean | null;
  goodWithKids?: string | null;
  goodWithDogs?: string | null;
  goodWithCats?: string | null;
  goodWithStrangers?: string | null;
  temperament?: string | null;
  microchipId?: string | null;
  allergies?: string | null;
  specialNeeds?: string | null;
  vetClinicName?: string | null;
  matchIntent?: string | null;
  emergencyToken?: string | null;
  isOwner?: boolean;
  owner?: { name: string; location: string };
  healthRecords?: HealthRecord[];
}

function vaccinatedLabel(gender: string) {
  return gender === 'female' ? 'Vacunada' : 'Vacunado';
}

function neuteredLabel(gender: string) {
  return gender === 'female' ? 'Castrada' : 'Castrado';
}

export default function PetPassportPage() {
  const params = useParams<{ id: string }>();
  const [pet, setPet] = useState<PassportPet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/pet/${params.id}/passport`);
        const data = await response.json();
        if (response.ok && data.success) setPet(data.pet);
      } catch (error) {
        console.error('Error fetching pet passport:', error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-muted-foreground">No encontramos esta mascota.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/profile">Volver a Mis mascotas</Link>
        </Button>
      </div>
    );
  }

  const image = getPrimaryImageUrl(pet.images, pet.thumbnailIndex);
  const temperament = parseJsonStringArray(pet.temperament);
  const intents = parseJsonStringArray(pet.matchIntent);
  const healthRows = [
    pet.microchipId ? { label: 'Microchip', value: pet.microchipId } : null,
    pet.vetClinicName ? { label: 'Veterinaria', value: pet.vetClinicName } : null,
    pet.allergies ? { label: 'Alergias', value: pet.allergies } : null,
    pet.specialNeeds ? { label: 'Necesidades', value: pet.specialNeeds } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const ageLabel = getPetAgeLabel(pet);
  const activities = parsePetActivities(pet.activities);
  const missingFields = pet.isOwner ? getMissingPetProfileFields(pet) : [];
  const facts = [
    { label: 'Tamaño', value: getOptionLabel(PET_SIZE_LABELS, pet.size) },
    { label: 'Sexo', value: getOptionLabel(PET_GENDER_LABELS, pet.gender) },
    { label: 'Energía', value: getOptionLabel(PET_ENERGY_LABELS, pet.energy) },
    { label: 'Edad', value: ageLabel },
    { label: 'Peso', value: formatPetWeight(pet.weight) },
    { label: 'Ubicación', value: pet.location?.trim() || null },
  ].filter((fact) => pet.isOwner || fact.value);
  const summary = [pet.breed || 'Mestizo', ageLabel, pet.location?.trim()].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link
        href="/profile"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-600 hover:text-primary"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
        Mis mascotas
      </Link>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="relative h-60 bg-muted sm:h-80">
          {image ? (
            <Image
              src={image}
              alt={pet.name}
              fill
              className="object-cover"
              unoptimized={shouldUnoptimizeImage(image)}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-primary-soft">
              <PawPrint className="size-12 text-primary/30" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-sm font-semibold text-primary">
              Pasaporte digital · {getOptionLabel(PET_TYPE_LABELS, pet.petType) ?? 'Mascota'}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-foreground sm:text-4xl">{pet.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
          </div>
          {pet.isOwner && (
            <PetCompletionPrompt
              petName={pet.name}
              missingFields={missingFields}
              href={`/profile?petId=${pet.id}`}
            />
          )}
          <div className="flex flex-wrap items-start justify-between gap-4">
            {pet.bio?.trim() && <p className="max-w-2xl text-foreground">{pet.bio}</p>}
            {pet.isOwner && (
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/profile?petId=${pet.id}`}>Editar</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/adoptions?list=${pet.id}`}>Poner en adopción</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-muted-foreground">
                      Más acciones
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
                      <Link href={`/alerts?report=lost&petId=${pet.id}`}>Reportar como perdida</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-y-1 border-y border-border py-2 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="px-3 py-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className={fact.value ? 'mt-0.5 text-sm font-semibold text-foreground' : 'mt-0.5 text-sm text-muted-foreground'}>
                    {fact.value ?? UNSET_LABEL}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex flex-wrap gap-2">
            {pet.vaccinated && (
              <Badge>
                {vaccinatedLabel(pet.gender)}
              </Badge>
            )}
            {pet.neutered && (
              <Badge>
                {neuteredLabel(pet.gender)}
              </Badge>
            )}
            {intents.slice(0, 3).map((intent) => (
              <Badge key={intent} variant="outline">
                {INTENT_LABELS[intent] || intent}
              </Badge>
            ))}
            {intents.length > 3 && <Badge variant="neutral">+{intents.length - 3}</Badge>}
          </div>

          {activities.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground">Actividades favoritas</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {activities.map((activity) => (
                  <li key={activity}>
                    <Badge variant="outline">
                      {PET_ACTIVITY_LABELS[activity]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!pet.isOwner && pet.owner && (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-slate-600">
              Responsable: <span className="font-medium text-foreground">{pet.owner.name}</span>
              {pet.owner.location ? ` · ${pet.owner.location}` : ''}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compatibilidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { label: 'Niños', value: pet.goodWithKids },
              { label: 'Otros perros', value: pet.goodWithDogs },
              { label: 'Gatos', value: pet.goodWithCats },
              { label: 'Extraños', value: pet.goodWithStrangers },
            ].map((row) => {
              const key = row.value || 'unknown';
              const muted = key === 'unknown';
              return (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">{row.label}</span>
                  <span className={muted ? 'text-muted-foreground' : 'font-medium text-foreground'}>
                    {COMPATIBILITY_LABELS[key] || key}
                  </span>
                </div>
              );
            })}
            {temperament.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {temperament.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {TEMPERAMENT_LABELS[tag] || tag}
                  </Badge>
                ))}
                {temperament.length > 3 && <Badge variant="neutral">+{temperament.length - 3}</Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salud</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {healthRows.length > 0 ? (
              <div className="space-y-3">
                {healthRows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-3">
                    <span className="text-slate-600">{row.label}</span>
                    <span className="text-right font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : pet.isOwner ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2.5">
                <p className="text-muted-foreground">Sumá microchip, veterinaria o alergias.</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/profile?petId=${pet.id}`}>Completar</Link>
                </Button>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-muted-foreground">
                Sin datos de salud compartidos.
              </p>
            )}
            {pet.isOwner && (
              <HealthRecordsCard
                petId={pet.id}
                records={sortHealthRecords(pet.healthRecords ?? [])}
                onChange={(healthRecords) => setPet((current) => (current ? { ...current, healthRecords } : current))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {pet.isOwner && <EmergencyQr token={pet.emergencyToken} />}
    </div>
  );
}
