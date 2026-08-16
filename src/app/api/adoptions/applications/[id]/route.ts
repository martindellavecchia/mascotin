import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { reviewAdoptionApplicationSchema } from '@/lib/schemas';
import { createNotification } from '@/lib/notifications';
import { FosterAdoptionError, reviewFosterAdoptionApplication } from '@/lib/server/foster-adoption';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const parsed = reviewAdoptionApplicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 });
    }

    try {
      const fosterResult = await reviewFosterAdoptionApplication(id, auth.session.user.id, parsed.data.status);
      if (fosterResult) {
        const linked = await db.adoptionApplication.findUnique({
          where: { id },
          include: { listing: { include: { pet: true } } },
        });
        if (linked) {
          await createNotification({
            userId: linked.applicantId,
            actorId: auth.session.user.id,
            type: parsed.data.status === 'ACCEPTED' ? 'ADOPTION_MATCH' : 'ADOPTION_APPLICATION',
            title: parsed.data.status === 'ACCEPTED' ? 'Postulación aceptada' : 'Postulación actualizada',
            body: parsed.data.status === 'ACCEPTED'
              ? `El hogar quiere avanzar con la adopción de ${linked.listing.pet.name}`
              : `Tu postulación para ${linked.listing.pet.name} fue revisada`,
            link: `/adoptions/${linked.listingId}`,
            entityId: linked.id,
            dedupeKey: `adoption-review:${linked.id}:${parsed.data.status}`,
          });
        }
        return NextResponse.json({ success: true, application: fosterResult.application });
      }
    } catch (error) {
      if (error instanceof FosterAdoptionError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      throw error;
    }

    const application = await db.adoptionApplication.findUnique({
      where: { id },
      include: {
        listing: { include: { pet: true } },
      },
    });
    if (!application) {
      return NextResponse.json({ success: false, error: 'Postulación no encontrada' }, { status: 404 });
    }
    if (application.listing.listedByUserId !== auth.session.user.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const updated = await db.$transaction(async (tx) => {
      const saved = await tx.adoptionApplication.update({
        where: { id },
        data: { status: parsed.data.status },
      });

      if (parsed.data.status === 'ACCEPTED') {
        await tx.adoptionListing.update({
          where: { id: application.listingId },
          data: { status: 'PENDING' },
        });
      }

      return saved;
    });

    createNotification({
      userId: application.applicantId,
      actorId: auth.session.user.id,
      type: parsed.data.status === 'ACCEPTED' ? 'ADOPTION_MATCH' : 'ADOPTION_APPLICATION',
      title: parsed.data.status === 'ACCEPTED' ? 'Postulación aceptada' : 'Postulación actualizada',
      body:
        parsed.data.status === 'ACCEPTED'
          ? `El dueño de ${application.listing.pet.name} quiere avanzar con la adopción`
          : `Tu postulación para ${application.listing.pet.name} fue revisada`,
      link: `/adoptions/${application.listingId}`,
      entityId: application.id,
    }).catch(console.error);

    return NextResponse.json({ success: true, application: updated });
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo actualizar la postulación' }, { status: 500 });
  }
}
