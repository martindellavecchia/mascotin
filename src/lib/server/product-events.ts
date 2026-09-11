import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export async function recordProductEvent(
  userId: string,
  name: string,
  entityKey: string,
  tx: Prisma.TransactionClient = db
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { syntheticRunId: true },
  });
  if (!user) return;
  await tx.productEvent.upsert({
    where: { userId_name_entityKey: { userId, name, entityKey } },
    create: { userId, name, entityKey, syntheticRunId: user.syntheticRunId },
    update: {},
  });
}
