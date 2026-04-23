import 'server-only';

import type { Pet } from '@/types';
import { UPCOMING_APPOINTMENT_STATUSES } from '@/lib/appointments';
import { db } from '@/lib/db';
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

export interface HomeBootstrapData {
  pets: Pet[];
  selectedPetId?: string;
  stats: HomeStatsData;
  nextAppointment: HomeAppointmentData | null;
}

const EMPTY_STATS: HomeStatsData = {
  totalPets: 0,
  totalMatches: 0,
  totalSwipes: 0,
  likesReceived: 0,
};

export async function getHomeBootstrapData(
  userId: string,
  requestedPetId?: string | null
): Promise<HomeBootstrapData> {
  const owner = await db.owner.findUnique({
    where: { userId },
    include: {
      pets: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!owner) {
    return {
      pets: [],
      stats: EMPTY_STATS,
      nextAppointment: null,
    };
  }

  const pets = serializeForClient(owner.pets) as unknown as Pet[];
  const petIds = owner.pets.map((pet) => pet.id);
  const selectedPetId = petIds.includes(requestedPetId || '')
    ? requestedPetId || undefined
    : owner.pets[0]?.id;

  const [matchesCount, swipesSent, likesReceived, nextAppointment] =
    await Promise.all([
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
        include: {
          service: {
            include: {
              provider: true,
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
    ]);

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
  };
}
