import { db } from '@/lib/db';
import { getPrimaryImageUrl } from '@/lib/media';
import { notFound } from 'next/navigation';
import { PawPrint, Phone } from 'lucide-react';
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
  const canCall = pet.sharePhoneOnScan && Boolean(pet.owner.phone);
  const showVet = pet.shareVetOnScan && Boolean(pet.vetClinicName);

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
        <div className="space-y-5 p-6">
          <div>
            <p className="text-sm font-medium text-primary">Pasaporte de emergencia</p>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.03em] text-foreground">{pet.name}</h1>
            <p className="mt-1 text-muted-foreground">{typeLabel}{pet.breed ? ` · ${pet.breed}` : ''}</p>
          </div>
          {pet.posts.length > 0 && (
            <p role="status" className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm font-semibold text-destructive">
              Esta mascota está reportada como perdida.
            </p>
          )}
          {canCall ? (
            <Button asChild variant="brand" size="lg" className="w-full">
              <a href={`tel:${pet.owner.phone}`}>
                <Phone className="size-5" aria-hidden="true" />
                Llamar a {pet.owner.name}
              </a>
            </Button>
          ) : (
            <p className="rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground">
              {pet.owner.name} no compartió un teléfono en este pasaporte.
              {showVet ? ' Podés acercarla a su veterinaria.' : ''}
            </p>
          )}
          {showVet && (
            <dl className="text-sm">
              <dt className="text-muted-foreground">Veterinaria</dt>
              <dd className="font-medium text-foreground">{pet.vetClinicName}</dd>
            </dl>
          )}
          <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            Datos de contacto de emergencia. No se muestra la dirección ni el historial médico completo.
          </p>
        </div>
      </div>
    </main>
  );
}
