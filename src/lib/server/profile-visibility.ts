import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

/** Users without a settings row keep the default `profileVisible = true`. */
export const VISIBLE_PROFILE_USER_FILTER = {
  NOT: { settings: { is: { profileVisible: false } } },
} satisfies Prisma.UserWhereInput;

export async function excludeHiddenProfilePets<T extends { id: string }>(pets: T[]): Promise<T[]> {
  if (pets.length === 0) return pets;

  const hiddenPets = await db.pet.findMany({
    where: {
      id: { in: pets.map((pet) => pet.id) },
      owner: { user: { settings: { is: { profileVisible: false } } } },
    },
    select: { id: true },
  });
  if (hiddenPets.length === 0) return pets;

  const hiddenIds = new Set(hiddenPets.map((pet) => pet.id));
  return pets.filter((pet) => !hiddenIds.has(pet.id));
}
