import 'server-only';

import { db } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import type { FosterAdoptionDraftData } from '@/lib/schemas';

export class FosterAdoptionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function optionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function startFosterAdoption(placementId: string, actorUserId: string) {
  const placement = await db.fosterPlacement.findUnique({
    where: { id: placementId },
    include: {
      rescueCase: true,
      fosterProfile: { include: { user: true } },
      adoptionDraft: true,
    },
  });
  if (!placement) throw new FosterAdoptionError('Tránsito no encontrado', 404);
  const isRequester = placement.rescueCase.createdByUserId === actorUserId;
  const isFoster = placement.fosterProfile.userId === actorUserId;
  if (!isRequester && !isFoster) throw new FosterAdoptionError('No autorizado', 403);
  if (placement.status === 'AWAITING_ADOPTION' && placement.adoptionDraft) return placement.adoptionDraft;
  if (placement.status !== 'ACTIVE') throw new FosterAdoptionError('El tránsito no está activo', 409);

  return db.$transaction(async (tx) => {
    const claimed = await tx.fosterPlacement.updateMany({
      where: { id: placementId, status: 'ACTIVE' },
      data: { status: 'AWAITING_ADOPTION', outcome: 'NEEDS_ADOPTION' },
    });
    if (claimed.count !== 1) throw new FosterAdoptionError('El tránsito ya había cambiado', 409);

    await tx.rescueCase.update({
      where: { id: placement.rescueCaseId },
      data: { status: 'NEEDS_ADOPTION' },
    });
    const draft = await tx.fosterAdoptionDraft.create({
      data: {
        rescueCaseId: placement.rescueCaseId,
        placementId,
        managedByUserId: placement.fosterProfile.userId,
        petId: placement.rescueCase.petId,
        bio: placement.rescueCase.description,
        specialNeeds: placement.rescueCase.apparentCondition,
        publicZone: placement.fosterProfile.location,
        images: placement.rescueCase.images,
      },
    });
    await tx.rescueCaseEvent.create({
      data: {
        caseId: placement.rescueCaseId,
        actorId: actorUserId,
        type: 'ADOPTION_DRAFT_CREATED',
        fromStatus: 'IN_FOSTER',
        toStatus: 'NEEDS_ADOPTION',
        eventKey: `adoption-draft:${placement.rescueCaseId}`,
        payload: { managedByUserId: placement.fosterProfile.userId },
      },
    });
    return draft;
  });
}

export async function updateFosterAdoptionDraft(caseId: string, userId: string, input: FosterAdoptionDraftData) {
  const draft = await db.fosterAdoptionDraft.findUnique({
    where: { rescueCaseId: caseId },
    include: { listing: true },
  });
  if (!draft) throw new FosterAdoptionError('Borrador no encontrado', 404);
  if (draft.managedByUserId !== userId) throw new FosterAdoptionError('Sólo el hogar responsable puede editar la ficha', 403);
  if (['MATCHED', 'COMPLETED'].includes(draft.status)) {
    throw new FosterAdoptionError('La ficha ya no puede editarse en este estado', 409);
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.fosterAdoptionDraft.update({
      where: { id: draft.id },
      data: {
        name: input.name,
        breed: optionalText(input.breed),
        estimatedAge: input.estimatedAge,
        gender: input.gender,
        energy: input.energy,
        character: input.character,
        bio: input.bio,
        goodWithKids: input.goodWithKids,
        goodWithDogs: input.goodWithDogs,
        goodWithCats: input.goodWithCats,
        vaccinated: input.vaccinated,
        neutered: input.neutered,
        specialNeeds: optionalText(input.specialNeeds),
        requirements: optionalText(input.requirements),
        publicZone: input.publicZone,
        images: JSON.stringify(input.images),
      },
    });
    if (draft.petId) {
      await tx.pet.update({
        where: { id: draft.petId },
        data: {
          name: input.name,
          breed: optionalText(input.breed),
          age: input.estimatedAge,
          gender: input.gender,
          energy: input.energy,
          bio: input.bio,
          goodWithKids: input.goodWithKids,
          goodWithDogs: input.goodWithDogs,
          goodWithCats: input.goodWithCats,
          vaccinated: input.vaccinated,
          neutered: input.neutered,
          specialNeeds: optionalText(input.specialNeeds),
          location: input.publicZone,
          images: JSON.stringify(input.images),
        },
      });
    }
    if (draft.listingId) {
      await tx.adoptionListing.update({
        where: { id: draft.listingId },
        data: {
          character: input.character,
          specialNeeds: optionalText(input.specialNeeds),
          requirements: optionalText(input.requirements),
          location: input.publicZone,
        },
      });
    }
    return updated;
  });
}

export async function publishFosterAdoption(caseId: string, userId: string) {
  const draft = await db.fosterAdoptionDraft.findUnique({
    where: { rescueCaseId: caseId },
    include: {
      rescueCase: true,
      placement: { include: { fosterProfile: true } },
      managedBy: true,
      listing: true,
    },
  });
  if (!draft) throw new FosterAdoptionError('Borrador no encontrado', 404);
  if (draft.managedByUserId !== userId) throw new FosterAdoptionError('Sólo el hogar responsable puede publicar', 403);
  if (draft.placement.status !== 'AWAITING_ADOPTION') throw new FosterAdoptionError('El animal ya no está bajo este tránsito', 409);
  if (!draft.name || draft.estimatedAge === null || !draft.gender || !draft.energy || !draft.character || !draft.bio || !draft.publicZone) {
    throw new FosterAdoptionError('Completá todos los datos obligatorios antes de publicar', 400);
  }
  const images = JSON.parse(draft.images) as unknown;
  if (!Array.isArray(images) || images.length === 0) throw new FosterAdoptionError('La ficha necesita al menos una foto', 400);

  const result = await db.$transaction(async (tx) => {
    const owner = await tx.owner.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        name: draft.managedBy.name || 'Hogar de tránsito',
        location: draft.placement.fosterProfile.location,
      },
    });
    const petData = {
      ownerId: owner.id,
      name: draft.name!,
      petType: draft.rescueCase.species,
      breed: draft.breed,
      age: draft.estimatedAge!,
      size: draft.rescueCase.size,
      gender: draft.gender!,
      vaccinated: draft.vaccinated,
      neutered: draft.neutered,
      energy: draft.energy!,
      bio: draft.bio!,
      activities: '[]',
      location: draft.publicZone!,
      images: draft.images,
      goodWithKids: draft.goodWithKids,
      goodWithDogs: draft.goodWithDogs,
      goodWithCats: draft.goodWithCats,
      specialNeeds: draft.specialNeeds,
      careRole: 'FOSTER' as const,
      matchIntent: JSON.stringify(['adoption']),
    };
    const pet = draft.petId
      ? await tx.pet.update({ where: { id: draft.petId }, data: petData })
      : await tx.pet.create({ data: petData });

    await tx.rescueCase.update({ where: { id: caseId }, data: { petId: pet.id } });
    const listing = draft.listing
      ? await tx.adoptionListing.update({
          where: { id: draft.listing.id },
          data: {
            petId: pet.id,
            listedByUserId: userId,
            status: 'OPEN',
            character: draft.character,
            specialNeeds: draft.specialNeeds,
            requirements: draft.requirements,
            location: draft.publicZone,
          },
        })
      : await tx.adoptionListing.create({
          data: {
            petId: pet.id,
            listedByUserId: userId,
            sourceRescueCaseId: caseId,
            character: draft.character,
            specialNeeds: draft.specialNeeds,
            requirements: draft.requirements,
            location: draft.publicZone,
            latitude: draft.rescueCase.latitude,
            longitude: draft.rescueCase.longitude,
          },
        });
    await tx.fosterAdoptionDraft.update({
      where: { id: draft.id },
      data: {
        petId: pet.id,
        listingId: listing.id,
        status: 'PUBLISHED',
        selectedApplicationId: null,
        fosterConfirmedAt: null,
        adopterConfirmedAt: null,
      },
    });
    await tx.rescueCaseEvent.create({
      data: {
        caseId,
        actorId: userId,
        type: 'ADOPTION_PUBLISHED',
        payload: { listingId: listing.id },
      },
    });
    return { pet, listing };
  });

  await createNotification({
    userId: draft.rescueCase.createdByUserId,
    actorId: userId,
    type: 'FOSTER_ADOPTION',
    title: 'La ficha de adopción ya está publicada',
    body: `${draft.name} ya puede recibir postulaciones.`,
    link: `/adoptions/${result.listing.id}`,
    entityId: result.listing.id,
    dedupeKey: `foster-adoption-published:${caseId}`,
  });
  return result;
}

export async function reviewFosterAdoptionApplication(applicationId: string, userId: string, status: 'ACCEPTED' | 'REJECTED') {
  const application = await db.adoptionApplication.findUnique({
    where: { id: applicationId },
    include: { listing: { include: { fosterDraft: true, pet: true } } },
  });
  if (!application?.listing.fosterDraft) return null;
  if (application.listing.listedByUserId !== userId) throw new FosterAdoptionError('No autorizado', 403);

  const draft = application.listing.fosterDraft;
  if (status === 'REJECTED') {
    if (draft.selectedApplicationId === applicationId) {
      throw new FosterAdoptionError('Cancelá la coordinación de entrega antes de rechazar esta postulación', 409);
    }
    if (application.status === 'REJECTED') return { application, selected: false };
    if (application.status !== 'PENDING') {
      throw new FosterAdoptionError('Esta postulación ya no puede rechazarse', 409);
    }
    const updated = await db.adoptionApplication.update({ where: { id: applicationId }, data: { status } });
    return { application: updated, selected: false };
  }
  if (draft.selectedApplicationId === applicationId && application.status === 'ACCEPTED') {
    return { application, selected: true };
  }
  if (application.status !== 'PENDING') {
    throw new FosterAdoptionError('Esta postulación ya no puede aceptarse', 409);
  }
  if (application.listing.status !== 'OPEN' && draft.selectedApplicationId !== applicationId) {
    throw new FosterAdoptionError('La ficha ya está coordinando con otra persona', 409);
  }

  const updated = await db.$transaction(async (tx) => {
    const claimed = await tx.adoptionListing.updateMany({
      where: { id: application.listingId, status: 'OPEN' },
      data: { status: 'PENDING' },
    });
    if (claimed.count !== 1) {
      throw new FosterAdoptionError('La ficha ya está coordinando con otra persona', 409);
    }
    await tx.adoptionApplication.updateMany({
      where: { listingId: application.listingId, id: { not: applicationId }, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });
    const saved = await tx.adoptionApplication.update({
      where: { id: applicationId },
      data: { status: 'ACCEPTED' },
    });
    await tx.fosterAdoptionDraft.update({
      where: { id: draft.id },
      data: {
        status: 'MATCHED',
        selectedApplicationId: applicationId,
        fosterConfirmedAt: null,
        adopterConfirmedAt: null,
      },
    });
    await tx.rescueCaseEvent.create({
      data: {
        caseId: draft.rescueCaseId,
        actorId: userId,
        type: 'ADOPTION_APPLICATION_SELECTED',
        payload: { applicationId },
      },
    });
    return saved;
  });
  return { application: updated, selected: true };
}

export async function confirmFosterAdoptionHandoff(
  listingId: string,
  userId: string,
  ownerInput?: { ownerName?: string; ownerLocation?: string },
) {
  const listing = await db.adoptionListing.findUnique({
    where: { id: listingId },
    include: {
      fosterDraft: {
        include: {
          placement: { include: { fosterProfile: true } },
          selectedApplication: { include: { applicant: { include: { owner: true } } } },
          pet: true,
          rescueCase: { select: { createdByUserId: true } },
        },
      },
    },
  });
  const draft = listing?.fosterDraft;
  const selected = draft?.selectedApplication;
  if (!listing || !draft || !selected || !draft.pet) throw new FosterAdoptionError('La entrega todavía no está preparada', 409);
  const isFoster = draft.managedByUserId === userId;
  const isAdopter = selected.applicantId === userId;
  if (!isFoster && !isAdopter) throw new FosterAdoptionError('No autorizado', 403);
  if (draft.status === 'COMPLETED') return { completed: true, listingId };
  if (draft.status !== 'MATCHED') throw new FosterAdoptionError('La adopción no está en coordinación', 409);

  if (isAdopter && !selected.applicant.owner && (!ownerInput?.ownerName || !ownerInput.ownerLocation)) {
    throw new FosterAdoptionError('Completá tu nombre y ubicación para recibir la ficha del animal', 400);
  }

  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    if (isAdopter && !selected.applicant.owner) {
      await tx.owner.create({
        data: {
          userId,
          name: ownerInput!.ownerName!,
          location: ownerInput!.ownerLocation!,
        },
      });
    }
    await tx.fosterAdoptionDraft.update({
      where: { id: draft.id },
      data: isFoster
        ? { fosterConfirmedAt: draft.fosterConfirmedAt || now }
        : { adopterConfirmedAt: draft.adopterConfirmedAt || now },
    });
    const current = await tx.fosterAdoptionDraft.findUnique({ where: { id: draft.id } });
    if (!current?.fosterConfirmedAt || !current.adopterConfirmedAt) {
      return { completed: false };
    }

    const claimed = await tx.fosterPlacement.updateMany({
      where: { id: draft.placementId, status: 'AWAITING_ADOPTION' },
      data: { status: 'COMPLETED', endedAt: now, outcome: 'ADOPTED' },
    });
    if (claimed.count !== 1) throw new FosterAdoptionError('La entrega ya había sido completada', 409);
    const adopterOwner = await tx.owner.findUnique({ where: { userId: selected.applicantId } });
    if (!adopterOwner) throw new FosterAdoptionError('Falta el perfil del adoptante', 409);

    await Promise.all([
      tx.pet.update({ where: { id: draft.pet!.id }, data: { ownerId: adopterOwner.id, careRole: 'OWNED' } }),
      tx.adoptionListing.update({ where: { id: listing.id }, data: { status: 'ADOPTED' } }),
      tx.adoptionApplication.update({ where: { id: selected.id }, data: { status: 'COMPLETED' } }),
      tx.adoptionApplication.updateMany({
        where: { listingId: listing.id, id: { not: selected.id }, status: { in: ['PENDING', 'ACCEPTED'] } },
        data: { status: 'REJECTED' },
      }),
      tx.fosterAdoptionDraft.update({ where: { id: draft.id }, data: { status: 'COMPLETED' } }),
      tx.rescueCase.update({ where: { id: draft.rescueCaseId }, data: { status: 'RESOLVED' } }),
      tx.fosterProfile.updateMany({
        where: { id: draft.placement.fosterProfileId, occupiedSlots: { gt: 0 } },
        data: { occupiedSlots: { decrement: 1 } },
      }),
      tx.rescueCaseEvent.create({
        data: {
          caseId: draft.rescueCaseId,
          actorId: userId,
          type: 'ADOPTION_COMPLETED',
          fromStatus: 'NEEDS_ADOPTION',
          toStatus: 'RESOLVED',
          eventKey: `adoption-completed:${draft.rescueCaseId}`,
          payload: { listingId: listing.id, adopterId: selected.applicantId },
        },
      }),
    ]);
    return { completed: true };
  });

  const counterpartId = isFoster ? selected.applicantId : draft.managedByUserId;
  await Promise.allSettled([
    createNotification({
      userId: counterpartId,
      actorId: userId,
      type: 'FOSTER_ADOPTION',
      title: result.completed ? 'Adopción completada' : 'Confirmación de entrega recibida',
      body: result.completed ? `${draft.pet.name} ya está con su familia definitiva.` : 'Falta la confirmación de la otra parte.',
      link: `/adoptions/${listing.id}`,
      entityId: listing.id,
      dedupeKey: `adoption-handoff:${listing.id}:${userId}`,
    }),
    result.completed && listing.sourceRescueCaseId
      ? createNotification({
          userId: draft.rescueCase.createdByUserId,
          actorId: userId,
          type: 'FOSTER_ADOPTION',
          title: 'El caso encontró familia definitiva',
          body: `${draft.pet.name} fue adoptado y el caso quedó resuelto.`,
          link: `/hogares-de-transito/casos/${draft.rescueCaseId}`,
          entityId: draft.rescueCaseId,
          dedupeKey: `adoption-resolved:${draft.rescueCaseId}`,
        })
      : Promise.resolve(),
  ]);
  return { ...result, listingId };
}

export async function cancelFosterAdoptionHandoff(listingId: string, userId: string) {
  const listing = await db.adoptionListing.findUnique({
    where: { id: listingId },
    include: { fosterDraft: { include: { selectedApplication: true } } },
  });
  const draft = listing?.fosterDraft;
  if (!listing || !draft) throw new FosterAdoptionError('Ficha no encontrada', 404);
  if (draft.managedByUserId !== userId) throw new FosterAdoptionError('Sólo el hogar puede cancelar la coordinación', 403);
  if (draft.status !== 'MATCHED' || !draft.selectedApplication) {
    throw new FosterAdoptionError('No hay una entrega en coordinación', 409);
  }

  const adopterId = draft.selectedApplication.applicantId;
  await db.$transaction([
    db.adoptionApplication.update({ where: { id: draft.selectedApplication.id }, data: { status: 'CANCELLED' } }),
    db.adoptionListing.update({ where: { id: listing.id }, data: { status: 'OPEN' } }),
    db.fosterAdoptionDraft.update({
      where: { id: draft.id },
      data: {
        status: 'PUBLISHED',
        selectedApplicationId: null,
        fosterConfirmedAt: null,
        adopterConfirmedAt: null,
      },
    }),
    db.rescueCaseEvent.create({
      data: { caseId: draft.rescueCaseId, actorId: userId, type: 'ADOPTION_HANDOFF_CANCELLED' },
    }),
  ]);
  await createNotification({
    userId: adopterId,
    actorId: userId,
    type: 'FOSTER_ADOPTION',
    title: 'La coordinación de adopción fue cancelada',
    body: 'La ficha volvió a recibir postulaciones.',
    link: `/adoptions/${listing.id}`,
    entityId: listing.id,
    dedupeKey: `adoption-handoff-cancelled:${listing.id}:${draft.selectedApplication.id}`,
  });
}
