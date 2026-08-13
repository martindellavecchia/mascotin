import 'server-only';

import type { Pet } from '@/types';
import { UPCOMING_APPOINTMENT_STATUSES } from '@/lib/appointments';
import { db } from '@/lib/db';
import { getPrimaryImageUrl, withImageFields } from '@/lib/media';
import { serializeForClient } from '@/lib/server/serialize';

export interface HomeStatsData {
  totalPets: number;
  totalMatches: number;
  totalSwipes: number;
  likesReceived: number;
}

export interface HomeAppointmentData {
  id: string;
  date: string;
  status: string;
  service: {
    name: string;
    provider: {
      businessName: string;
    };
  };
  pet: {
    id: string;
    name: string;
    images: string;
  };
}

export interface HomeLostPetPreview {
  id: string;
  content: string;
  images: string;
  primaryImageUrl?: string | null;
  contactPhone: string | null;
  lastSeenLocation: string | null;
  createdAt: string;
  pet?: {
    name: string;
    images: string;
    primaryImageUrl?: string | null;
    petType: string;
  } | null;
  author: {
    name: string | null;
  };
}

export interface HomeBootstrapSuggestion {
  id: string;
  name: string;
  petType: string;
  breed: string | null;
  image: string | null;
  matchScore: number;
  matchReason: string;
}

export interface HomePetHealthSummary {
  id: string;
  type: string;
  name: string;
  dueDate: string | null;
}

export interface HomeBootstrapData {
  pets: Pet[];
  selectedPetId?: string;
  stats: HomeStatsData;
  nextAppointment: HomeAppointmentData | null;
  lostPets: HomeLostPetPreview[];
  suggestions: HomeBootstrapSuggestion[];
  healthRecords: HomePetHealthSummary[];
}

const EMPTY_STATS: HomeStatsData = {
  totalPets: 0,
  totalMatches: 0,
  totalSwipes: 0,
  likesReceived: 0,
};

const PET_SELECT = {
  id: true,
  ownerId: true,
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
  activities: true,
  location: true,
  images: true,
  level: true,
  xp: true,
  totalMatches: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function getSuggestionsForPet(
  userId: string,
  currentPet: { id: string; petType: string; breed: string | null },
  ownerLocation: string | null,
  ownerBio: string | null,
  myPetIds: string[],
  limit = 6
): Promise<HomeBootstrapSuggestion[]> {
  const [swipedPets, blockedRelations] = await Promise.all([
    db.swipe.findMany({
      where: { fromPetId: currentPet.id },
      select: { toPetId: true },
      take: 500,
    }),
    db.blockedUser.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  const swipedPetIds = swipedPets
    .map((s) => s.toPetId)
    .filter((id): id is string => Boolean(id));
  const blockedUserIds = blockedRelations.map((b) =>
    b.blockerId === userId ? b.blockedId : b.blockerId
  );

  const otherPets = await db.pet.findMany({
    where: {
      id: {
        notIn: [...myPetIds, ...swipedPetIds],
      },
      ...(blockedUserIds.length > 0 && {
        owner: {
          userId: { notIn: blockedUserIds },
        },
      }),
    },
    select: {
      id: true,
      name: true,
      petType: true,
      breed: true,
      images: true,
      owner: {
        select: {
          location: true,
          bio: true,
        },
      },
    },
    take: 20,
  });

  const scoredPets = otherPets.map((pet) => {
    let score = 0;
    const reasons: string[] = [];

    if (pet.petType === currentPet.petType) {
      score += 5;
      reasons.push('Mismo tipo');
    }

    if (
      pet.breed &&
      currentPet.breed &&
      pet.breed.toLowerCase() === currentPet.breed.toLowerCase()
    ) {
      score += 3;
      reasons.push('Misma raza');
    }

    if (
      pet.owner?.location &&
      ownerLocation &&
      pet.owner.location
        .toLowerCase()
        .includes(ownerLocation.split(',')[0].toLowerCase())
    ) {
      score += 2;
      reasons.push('Misma zona');
    }

    if (pet.owner?.bio && ownerBio) {
      const petOwnerInterests = pet.owner.bio.toLowerCase().split(/[\s,]+/);
      const myInterests = ownerBio.toLowerCase().split(/[\s,]+/);
      const commonInterests = petOwnerInterests.filter(
        (i) => myInterests.includes(i) && i.length > 3
      );
      if (commonInterests.length > 0) {
        score += commonInterests.length;
        reasons.push('Intereses comunes');
      }
    }

    return {
      id: pet.id,
      name: pet.name,
      petType: pet.petType,
      breed: pet.breed,
      image: getPrimaryImageUrl(pet.images),
      matchScore: score,
      matchReason: reasons.length > 0 ? reasons.join(' • ') : 'Nuevo amigo',
    };
  });

  return scoredPets
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

export async function getHomeBootstrapData(
  userId: string,
  requestedPetId?: string | null
): Promise<HomeBootstrapData> {
  const owner = await db.owner.findUnique({
    where: { userId },
    select: {
      id: true,
      location: true,
      bio: true,
      pets: {
        orderBy: { createdAt: 'desc' },
        select: PET_SELECT,
      },
    },
  });

  if (!owner) {
    return {
      pets: [],
      stats: EMPTY_STATS,
      nextAppointment: null,
      lostPets: [],
      suggestions: [],
      healthRecords: [],
    };
  }

  const pets = serializeForClient(owner.pets) as unknown as Pet[];
  const petIds = owner.pets.map((pet) => pet.id);
  const selectedPetId = petIds.includes(requestedPetId || '')
    ? requestedPetId || undefined
    : owner.pets[0]?.id;
  const selectedPet = owner.pets.find((pet) => pet.id === selectedPetId);

  const [
    matchesCount,
    swipesSent,
    likesReceived,
    nextAppointment,
    lostPetsRaw,
    healthRecordsRaw,
    suggestions,
  ] = await Promise.all([
    petIds.length === 0
      ? Promise.resolve(0)
      : db.match.count({
          where: {
            OR: [{ pet1Id: { in: petIds } }, { pet2Id: { in: petIds } }],
          },
        }),
    petIds.length === 0
      ? Promise.resolve(0)
      : db.swipe.count({
          where: { fromPetId: { in: petIds } },
        }),
    petIds.length === 0
      ? Promise.resolve(0)
      : db.swipe.count({
          where: {
            toPetId: { in: petIds },
            isLike: true,
          },
        }),
    db.appointment.findFirst({
      where: {
        userId,
        status: {
          in: [...UPCOMING_APPOINTMENT_STATUSES],
        },
        date: {
          gte: new Date(),
        },
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        id: true,
        date: true,
        status: true,
        service: {
          select: {
            name: true,
            provider: {
              select: {
                businessName: true,
              },
            },
          },
        },
        pet: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
      },
    }),
    db.post.findMany({
      where: {
        postType: 'lost_pet',
        isResolved: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        content: true,
        images: true,
        contactPhone: true,
        lastSeenLocation: true,
        createdAt: true,
        author: {
          select: {
            name: true,
          },
        },
        pet: {
          select: {
            name: true,
            images: true,
            petType: true,
          },
        },
      },
    }),
    selectedPetId
      ? db.petHealthRecord.findMany({
          where: { petId: selectedPetId },
          orderBy: { dueDate: 'asc' },
          take: 5,
          select: {
            id: true,
            type: true,
            name: true,
            dueDate: true,
          },
        })
      : Promise.resolve([]),
    selectedPet
      ? getSuggestionsForPet(
          userId,
          selectedPet,
          owner.location,
          owner.bio,
          petIds,
          6
        )
      : Promise.resolve([]),
  ]);

  const lostPets = serializeForClient(
    lostPetsRaw.map((lostPet) => ({
      ...withImageFields(lostPet),
      createdAt: lostPet.createdAt.toISOString(),
      pet: lostPet.pet ? withImageFields(lostPet.pet) : null,
    }))
  ) as HomeLostPetPreview[];

  const healthRecords = serializeForClient(
    healthRecordsRaw.map((record) => ({
      id: record.id,
      type: record.type,
      name: record.name,
      dueDate: record.dueDate ? record.dueDate.toISOString() : null,
    }))
  ) as HomePetHealthSummary[];

  return {
    pets,
    selectedPetId,
    stats: {
      totalPets: pets.length,
      totalMatches: matchesCount,
      totalSwipes: swipesSent,
      likesReceived,
    },
    nextAppointment: nextAppointment
      ? serializeForClient({
          ...nextAppointment,
          date: nextAppointment.date.toISOString(),
        })
      : null,
    lostPets,
    suggestions,
    healthRecords,
  };
}

export { getSuggestionsForPet };
