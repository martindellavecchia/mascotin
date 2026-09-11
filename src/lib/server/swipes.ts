import { db } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { recordProductEvent } from '@/lib/server/product-events';
export class SwipeError extends Error {
  constructor(
    message: string,
    readonly status = 409
  ) {
    super(message);
  }
}
export async function recordSwipe(
  userId: string,
  fromPetId: string,
  toPetId: string,
  isLike: boolean
) {
  const result = await db.$transaction(async (tx) => {
    for (const id of [...new Set([fromPetId, toPetId])].sort())
      await tx.$queryRaw`SELECT id FROM "Pet" WHERE id = ${id} FOR UPDATE`;
    const include = {
      owner: { include: { user: { select: { syntheticRunId: true, isBlocked: true } } } },
    };
    const [source, target] = await Promise.all([
      tx.pet.findUnique({ where: { id: fromPetId }, include }),
      tx.pet.findUnique({ where: { id: toPetId }, include }),
    ]);
    if (
      !source ||
      !target ||
      !source.isActive ||
      !target.isActive ||
      source.owner.userId !== userId ||
      target.owner.userId === userId ||
      source.owner.user.isBlocked ||
      target.owner.user.isBlocked ||
      source.owner.user.syntheticRunId !== target.owner.user.syntheticRunId
    )
      throw new SwipeError('No se puede interactuar con esta mascota', 403);
    const blocked = await tx.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: target.owner.userId },
          { blockerId: target.owner.userId, blockedId: userId },
        ],
      },
    });
    if (blocked) throw new SwipeError('No se puede interactuar con este usuario', 403);
    const existing = await tx.swipe.findUnique({
      where: { fromPetId_toPetId: { fromPetId, toPetId } },
    });
    const actionSequence = source.swipeSequence + 1;
    const swipe = await tx.swipe.upsert({
      where: { fromPetId_toPetId: { fromPetId, toPetId } },
      create: { fromPetId, toPetId, isLike, actionSequence },
      update: { isLike, actionSequence, actedAt: new Date(), undoneAt: null },
    });
    let xpGained = existing ? 0 : isLike ? 10 : 5;
    await tx.pet.update({
      where: { id: fromPetId },
      data: {
        swipeSequence: actionSequence,
        xp: { increment: xpGained },
        level: Math.floor((source.xp + xpGained) / 100) + 1,
      },
    });
    let matched = false;
    let newMatchId: string | null = null;
    if (isLike) {
      const reciprocal = await tx.swipe.findUnique({
        where: { fromPetId_toPetId: { fromPetId: toPetId, toPetId: fromPetId } },
      });
      if (reciprocal?.isLike && !reciprocal.undoneAt) {
        const prior = await tx.match.findFirst({
          where: {
            OR: [
              { pet1Id: fromPetId, pet2Id: toPetId },
              { pet1Id: toPetId, pet2Id: fromPetId },
            ],
          },
        });
        matched = true;
        if (!prior) {
          const match = await tx.match.create({ data: { pet1Id: fromPetId, pet2Id: toPetId } });
          newMatchId = match.id;
          for (const pet of [source, target])
            await tx.pet.update({
              where: { id: pet.id },
              data: {
                xp: { increment: 50 },
                totalMatches: { increment: 1 },
                level: Math.floor((pet.xp + (pet.id === fromPetId ? xpGained : 0) + 50) / 100) + 1,
              },
            });
          xpGained += 50;
          await recordProductEvent(userId, 'match_created', match.id, tx);
        }
      }
    }
    return {
      matched,
      xpGained,
      swipeId: swipe.id,
      actionSequence,
      notify: newMatchId
        ? {
            id: newMatchId,
            userId: target.owner.userId,
            sourceName: source.name,
            targetName: target.name,
          }
        : null,
    };
  });
  if (result.notify)
    await createNotification({
      userId: result.notify.userId,
      actorId: userId,
      type: 'MATCH',
      title: '¡Nuevo match!',
      body: `${result.notify.sourceName} hizo match con ${result.notify.targetName}`,
      link: `/messages?matchId=${result.notify.id}`,
      dedupeKey: `match:${result.notify.id}`,
    }).catch((e) => console.error('match_notification', e));
  return {
    matched: result.matched,
    xpGained: result.xpGained,
    swipeId: result.swipeId,
    actionSequence: result.actionSequence,
  };
}
export async function undoPass(userId: string, petId: string, swipeId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Pet" WHERE id = ${petId} FOR UPDATE`;
    const pet = await tx.pet.findFirst({
      where: { id: petId, isActive: true, owner: { userId, user: { isBlocked: false } } },
      include: { owner: { select: { user: { select: { syntheticRunId: true } } } } },
    });
    const swipe = await tx.swipe.findUnique({
      where: { id: swipeId },
      include: {
        toPet: {
          include: {
            owner: { include: { user: { select: { isBlocked: true, syntheticRunId: true } } } },
          },
        },
      },
    });
    if (
      !pet ||
      !swipe ||
      swipe.fromPetId !== petId ||
      swipe.actionSequence !== pet.swipeSequence ||
      swipe.isLike ||
      swipe.undoneAt ||
      !swipe.toPet?.isActive
    )
      throw new SwipeError('Solo podés deshacer el último pase de esta mascota');
    if (
      swipe.toPet.owner.user.isBlocked ||
      swipe.toPet.owner.user.syntheticRunId !== pet.owner.user.syntheticRunId
    )
      throw new SwipeError('Mascota no disponible');
    const blocked = await tx.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: swipe.toPet.owner.userId },
          { blockerId: swipe.toPet.owner.userId, blockedId: userId },
        ],
      },
    });
    const match = await tx.match.findFirst({
      where: {
        OR: [
          { pet1Id: petId, pet2Id: swipe.toPetId },
          { pet1Id: swipe.toPetId, pet2Id: petId },
        ],
      },
    });
    if (blocked || match) throw new SwipeError('No se puede deshacer este pase');
    await tx.swipe.update({ where: { id: swipe.id }, data: { undoneAt: new Date() } });
    await recordProductEvent(userId, 'pass_undone', `${swipe.id}:${swipe.actionSequence}`, tx);
    return { petId: swipe.toPetId };
  });
}
