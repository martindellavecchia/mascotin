'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseJsonStringArray } from '@/lib/json-array';
import { getPrimaryImageUrl } from '@/lib/media';
import EmergencyQr from '@/components/pets/EmergencyQr';

interface PassportPet {
  id: string;
  name: string;
  petType: string;
  breed: string | null;
  age: number;
  size: string;
  gender: string;
  energy: string;
  bio: string;
  location: string;
  images: string;
  vaccinated: boolean;
  neutered: boolean;
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
  healthRecords?: Array<{ id: string; type: string; name: string; dueDate: string | null; completedAt: string | null }>;
}

const TYPE_LABELS: Record<string, string> = { dog: 'Perro', cat: 'Gato', bird: 'Ave', other: 'Otro' };

export default function PetPassportPage() {
  const params = useParams<{ id: string }>();
  const [pet, setPet] = useState<PassportPet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/pet/${params.id}/passport`);
      const data = await response.json();
      if (data.success) setPet(data.pet);
      setLoading(false);
    }
    void load();
  }, [params.id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando pasaporte...</div>;
  }

  if (!pet) {
    return <div className="p-8 text-center text-slate-500">No encontramos esta mascota.</div>;
  }

  const image = getPrimaryImageUrl(pet.images);
  const temperament = parseJsonStringArray(pet.temperament);
  const intents = parseJsonStringArray(pet.matchIntent);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative h-64 bg-slate-100">
          {image ? (
            <Image src={image} alt={pet.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">
              <span className="material-symbols-rounded text-7xl">pets</span>
            </div>
          )}
        </div>
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">Pasaporte digital</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">{pet.name}</h1>
              <p className="mt-1 text-slate-500">
                {TYPE_LABELS[pet.petType] || pet.petType} · {pet.breed || 'Mestizo'} · {pet.age} años · {pet.location}
              </p>
            </div>
            {pet.isOwner && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={`/profile?petId=${pet.id}`}>Editar</Link>
                </Button>
                <Button asChild className="bg-red-500 hover:bg-red-600">
                  <Link href={`/alerts?report=lost&petId=${pet.id}`}>Reportar como perdida</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/adoptions?list=${pet.id}`}>Poner en adopción</Link>
                </Button>
              </div>
            )}
          </div>
          <p className="text-slate-700">{pet.bio}</p>
          <div className="flex flex-wrap gap-2">
            {pet.vaccinated && <Badge className="bg-teal-50 text-teal-700">Vacunado</Badge>}
            {pet.neutered && <Badge className="bg-blue-50 text-blue-700">Castrado</Badge>}
            {intents.includes('walk') && <Badge className="bg-amber-50 text-amber-700">Busca compañero de paseo</Badge>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compatibilidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Niños: {COMPATIBILITY_LABELS[pet.goodWithKids || 'unknown']}</p>
            <p>Otros perros: {COMPATIBILITY_LABELS[pet.goodWithDogs || 'unknown']}</p>
            <p>Gatos: {COMPATIBILITY_LABELS[pet.goodWithCats || 'unknown']}</p>
            <p>Extraños: {COMPATIBILITY_LABELS[pet.goodWithStrangers || 'unknown']}</p>
            {temperament.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {temperament.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Salud</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pet.microchipId && <p>Microchip: {pet.microchipId}</p>}
            {pet.vetClinicName && <p>Veterinaria: {pet.vetClinicName}</p>}
            {pet.allergies && <p>Alergias: {pet.allergies}</p>}
            {pet.specialNeeds && <p>Necesidades: {pet.specialNeeds}</p>}
            <ul className="mt-3 space-y-2">
              {(pet.healthRecords || []).map((record) => (
                <li key={record.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-medium">{record.name}</span>
                  {record.dueDate && (
                    <span className="ml-2 text-slate-500">
                      {new Date(record.dueDate).toLocaleDateString('es-AR')}
                    </span>
                  )}
                </li>
              ))}
              {(pet.healthRecords || []).length === 0 && (
                <li className="text-slate-500">Sin registros pendientes.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {pet.isOwner && <EmergencyQr token={pet.emergencyToken} />}
    </div>
  );
}
