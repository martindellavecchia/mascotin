import 'server-only';

import type { MatchWithPet } from '@/types/messages';
import { withImageFields } from '@/lib/media';
import { db } from '@/lib/db';
import { serializeForClient } from '@/lib/server/serialize';

export interface MessageGroupListItem {
  id: string;
  name: string;
  description: string;
  image: string | null;
}

export interface MessagesBootstrapData {
  matches: MatchWithPet[];
  groups: MessageGroupListItem[];
}

export async function getMessagesBootstrapData(
  userId: string
): Promise<MessagesBootstrapData> {
  const owner = await db.owner.findUnique({
    where: { userId },
    select: { id: true },
  });

  const groups = await db.group.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      image: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!owner) {
    return {
      matches: [],
      groups: serializeForClient(groups),
    };
  }

  const pets = await db.pet.findMany({
    where: { ownerId: owner.id },
    select: { id: true },
  });
  const petIds = pets.map((pet) => pet.id);

  const matches = petIds.length === 0
    ? []
    : await db.match.findMany({
        where: {
          OR: [{ pet1Id: { in: petIds } }, { pet2Id: { in: petIds } }],
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          pet1: { include: { owner: true } },
          pet2: { include: { owner: true } },
        },
      });

  const normalizedMatches = matches
    .map((match) => {
      const otherPet = petIds.includes(match.pet1Id || '') ? match.pet2 : match.pet1;

      if (!otherPet) {
        return null;
      }

      return withImageFields({
        ...otherPet,
        matchId: match.id,
      });
    })
    .filter((match): match is NonNullable<typeof match> => match !== null);

  return {
    matches: serializeForClient(normalizedMatches) as MatchWithPet[],
    groups: serializeForClient(groups),
  };
}
