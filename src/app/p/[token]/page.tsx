import { db } from '@/lib/db';
import { getPrimaryImageUrl } from '@/lib/media';
import { notFound } from 'next/navigation';
import { PawPrint } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';

export default async function EmergencyPassportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pet = await db.pet.findUnique({
    where: { emergencyToken: token },
    include: {
      owner: { select: { name: true, phone: true } },
      posts: {
        where: { postType: 'lost_pet', isResolved: false },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!pet) notFound();

  const image = getPrimaryImageUrl(pet.images, pet.thumbnailIndex);
  const typeLabel =
    pet.petType === 'dog' ? 'Perro' : pet.petType === 'cat' ? 'Gato' : pet.petType === 'bird' ? 'Ave' : 'Mascota';

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background px-4 py-8 sm:py-10">
      <BrandLogo priority className="mx-auto mb-8 h-11 w-auto" />
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {image ? (
          <img src={image} alt={pet.name} className="h-64 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-primary-soft">
            <PawPrint className="size-11 text-primary/35" aria-hidden="true" />
          </div>
        )}
        <div className="space-y-4 p-6">
          <p className="text-sm font-medium text-teal-700">Pasaporte de emergencia</p>
          <h1 className="text-3xl font-bold text-slate-950">{pet.name}</h1>
          <p className="text-slate-500">{typeLabel}{pet.breed ? ` · ${pet.breed}` : ''}</p>
          {pet.posts.length > 0 && (
            <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
              Esta mascota está reportada como perdida.
            </div>
          )}
          {pet.sharePhoneOnScan && pet.owner.phone && (
            <Button asChild className="w-full"><a href={`tel:${pet.owner.phone}`}>Llamar a {pet.owner.name}</a></Button>
          )}
          {pet.shareVetOnScan && pet.vetClinicName && (
            <p className="text-sm text-slate-600">Veterinaria: {pet.vetClinicName}</p>
          )}
          <p className="text-xs text-slate-400">
            Datos de contacto de emergencia. No se muestra la dirección ni el historial médico completo.
          </p>
        </div>
      </div>
    </main>
  );
}
