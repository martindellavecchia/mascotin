import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-helpers';
import { createAdoptionApplicationSchema } from '@/lib/schemas';
import { scoreAdoptionCompatibility } from '@/lib/adoption';
import { createNotification } from '@/lib/notifications';
import { withImageFields } from '@/lib/media';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const listing = await db.adoptionListing.findUnique({
    where: { id },
    include: {
      pet: {
        select: {
          id: true,
          name: true,
          petType: true,
          breed: true,
          age: true,
          size: true,
          gender: true,
          vaccinated: true,
          neutered: true,
          energy: true,
          bio: true,
          images: true,
          thumbnailIndex: true,
          goodWithKids: true,
          goodWithDogs: true,
          goodWithCats: true,
          temperament: true,
          specialNeeds: true,
        },
      },
      listedBy: { select: { id: true, name: true, syntheticRunId: true } },
      applications: auth.session.user.id
        ? {
            where: {
              OR: [
                { applicantId: auth.session.user.id },
                { listing: { listedByUserId: auth.session.user.id } },
              ],
            },
            include: { applicant: { select: { id: true, name: true } } },
          }
        : false,
      fosterDraft: {
        select: {
          status: true,
          managedByUserId: true,
          fosterConfirmedAt: true,
          adopterConfirmedAt: true,
          selectedApplication: { select: { id: true, applicantId: true } },
        },
      },
    },
  });

  const viewer = await db.user.findUnique({ where: { id: auth.session.user.id }, select: { syntheticRunId: true } });
  if (!listing || listing.listedBy.syntheticRunId !== (viewer?.syntheticRunId || null)) {
    return NextResponse.json({ success: false, error: 'Ficha no encontrada' }, { status: 404 });
  }

  const selectedApplicantId = listing.fosterDraft?.selectedApplication?.applicantId;
  const handoffRole = listing.fosterDraft?.managedByUserId === auth.session.user.id
    ? 'FOSTER'
    : selectedApplicantId === auth.session.user.id
      ? 'ADOPTER'
      : null;

  return NextResponse.json({
    success: true,
    listing: {
      id: listing.id,
      petId: listing.petId,
      listedByUserId: listing.listedByUserId,
      sourceRescueCaseId: listing.sourceRescueCaseId,
      status: listing.status,
      character: listing.character,
      specialNeeds: listing.specialNeeds,
      requirements: listing.requirements,
      location: listing.location,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      applications: listing.applications,
      listedBy: listing.sourceRescueCaseId ? { id: 'foster-module', name: 'Hogar de tránsito' } : { id: listing.listedBy.id, name: listing.listedBy.name },
      fosterDraft: undefined,
      pet: withImageFields(listing.pet),
      handoff: handoffRole && listing.fosterDraft ? {
        role: handoffRole,
        status: listing.fosterDraft.status,
        fosterConfirmedAt: listing.fosterDraft.fosterConfirmedAt,
        adopterConfirmedAt: listing.fosterDraft.adopterConfirmedAt,
      } : null,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const parsed = createAdoptionApplicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Contá por qué querés adoptar' }, { status: 400 });
    }

    const listing = await db.adoptionListing.findUnique({
      where: { id },
      include: { pet: true, listedBy: { select: { syntheticRunId: true } } },
    });
    if (!listing || listing.status !== 'OPEN') {
      return NextResponse.json({ success: false, error: 'La ficha no está abierta' }, { status: 400 });
    }
    if (listing.listedByUserId === auth.session.user.id) {
      return NextResponse.json({ success: false, error: 'No podés postularte a tu propia ficha' }, { status: 400 });
    }
    const viewer = await db.user.findUnique({ where: { id: auth.session.user.id }, select: { syntheticRunId: true } });
    if (listing.listedBy.syntheticRunId !== (viewer?.syntheticRunId || null)) {
      return NextResponse.json({ success: false, error: 'La ficha no está disponible' }, { status: 404 });
    }

    const adopter = await db.adopterProfile.findUnique({
      where: { userId: auth.session.user.id },
    });
    if (!adopter) {
      return NextResponse.json(
        { success: false, error: 'Completá tu perfil de adoptante antes de postularte' },
        { status: 400 }
      );
    }

    const compatibilityScore = scoreAdoptionCompatibility(listing.pet, adopter);
    const application = await db.adoptionApplication.create({
      data: {
        listingId: listing.id,
        applicantId: auth.session.user.id,
        message: parsed.data.message,
        compatibilityScore,
      },
    });

    createNotification({
      userId: listing.listedByUserId,
      actorId: auth.session.user.id,
      type: 'ADOPTION_APPLICATION',
      title: 'Nueva postulación de adopción',
      body: `${auth.session.user.name || 'Alguien'} se postuló para ${listing.pet.name} (${compatibilityScore}% compatibilidad)`,
      link: `/adoptions/${listing.id}`,
      entityId: application.id,
    }).catch(console.error);

    return NextResponse.json({ success: true, application }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'No se pudo enviar la postulación' }, { status: 500 });
  }
}
