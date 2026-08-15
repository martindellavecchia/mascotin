import { db } from '@/lib/db';
import { getPrimaryImageUrl } from '@/lib/media';
import { notFound } from 'next/navigation';

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

  const image = getPrimaryImageUrl(pet.images);
  const typeLabel =
    pet.petType === 'dog' ? 'Perro' : pet.petType === 'cat' ? 'Gato' : pet.petType === 'bird' ? 'Ave' : 'Mascota';

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-slate-50 px-4 py-10">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {image && (
          <img src={image} alt={pet.name} className="h-64 w-full object-cover" />
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
            <a href={`tel:${pet.owner.phone}`} className="block rounded-xl bg-teal-600 px-4 py-3 text-center font-semibold text-white">
              Llamar a {pet.owner.name}
            </a>
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
