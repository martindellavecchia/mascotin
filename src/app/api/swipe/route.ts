import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { requireAuth } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import { createNotification } from '@/lib/notifications';

const log = logger.forRoute('/api/swipe', 'POST');

export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const session = auth.session;
    userId = session.user.id;

    // Rate limit swipes per user
    const limit = await rateLimit(`swipe:${session.user.id}`, RATE_LIMITS.swipe);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Estás deslizando muy rápido. Espera un momento.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { fromPetId, toPetId, isLike } = body;

    // Validate required fields - pet-based swipes only
    if (!fromPetId || !toPetId || isLike === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: fromPetId, toPetId, isLike' },
        { status: 400 }
      );
    }

    // Verify source pet belongs to current user
    const sourcePet = await db.pet.findUnique({
      where: { id: fromPetId },
      include: { owner: true },
    });

    if (!sourcePet || sourcePet.owner.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to swipe with this pet' },
        { status: 403 }
      );
    }

    // Verify target pet exists and is not owned by current user
    const targetPet = await db.pet.findUnique({
      where: { id: toPetId },
      include: { owner: true },
    });

    if (!targetPet) {
      return NextResponse.json(
        { success: false, error: 'Target pet not found' },
        { status: 404 }
      );
    }

    if (targetPet.owner.userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot swipe your own pets' },
        { status: 400 }
      );
    }

    // Check if either user has blocked the other
    const blockExists = await db.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: session.user.id, blockedId: targetPet.owner.userId },
          { blockerId: targetPet.owner.userId, blockedId: session.user.id },
        ],
      },
    });

    if (blockExists) {
      return NextResponse.json(
        { success: false, error: 'No se puede interactuar con este usuario' },
        { status: 403 }
      );
    }

    // Check if swipe already exists
    const existingSwipe = await db.swipe.findUnique({
      where: {
        fromPetId_toPetId: { fromPetId, toPetId },
      },
    });

    let xpGained = 0;

    if (existingSwipe) {
      // Update existing swipe
      await db.swipe.update({
        where: { id: existingSwipe.id },
        data: { isLike },
      });
    } else {
      // Create new swipe
      await db.swipe.create({
        data: {
          fromPetId,
          toPetId,
          isLike,
        },
      });

      // Add XP for swiping
      xpGained = isLike ? 10 : 5;
      const newXp = sourcePet.xp + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;

      await db.pet.update({
        where: { id: sourcePet.id },
        data: { xp: newXp, level: newLevel },
      });
    }

    // Check for mutual like (match) - wrapped in transaction to prevent duplicates
    let matched = false;
    if (isLike) {
      const matchResult = await db.$transaction(async (tx) => {
        const reciprocalSwipe = await tx.swipe.findUnique({
          where: {
            fromPetId_toPetId: { fromPetId: toPetId, toPetId: fromPetId },
          },
        });

        if (reciprocalSwipe?.isLike) {
          // Check if match already exists
          const existingMatch = await tx.match.findFirst({
            where: {
              OR: [
                { pet1Id: fromPetId, pet2Id: toPetId },
                { pet1Id: toPetId, pet2Id: fromPetId },
              ],
            },
          });

          if (!existingMatch) {
            // Create new match
            await tx.match.create({
              data: {
                pet1Id: fromPetId,
                pet2Id: toPetId,
              },
            });

            // Update both pets' XP and match counts
            await Promise.all([
              tx.pet.update({
                where: { id: fromPetId },
                data: { xp: { increment: 50 }, totalMatches: { increment: 1 } },
              }),
              tx.pet.update({
                where: { id: toPetId },
                data: { xp: { increment: 50 }, totalMatches: { increment: 1 } },
              }),
            ]);

            return { matched: true, xpGained: 50 };
          }
          return { matched: true, xpGained: 0 }; // Already matched
        }
        return { matched: false, xpGained: 0 };
      });

      matched = matchResult.matched;
      xpGained += matchResult.xpGained;

      if (matched && matchResult.xpGained > 0) {
        createNotification({
          userId: targetPet.owner.userId,
          actorId: session.user.id,
          type: 'MATCH',
          title: '¡Nuevo match!',
          body: `${sourcePet.name} hizo match con ${targetPet.name}`,
          link: '/messages',
        }).catch(console.error);
      }
    }

    return NextResponse.json({
      success: true,
      matched,
      xpGained,
      message: matched ? '🐾 ¡Match!' : 'Swipe registrado',
    });
  } catch (error) {
    log.error('Error recording swipe', error, userId ? { userId } : undefined);
    return NextResponse.json(
      { success: false, error: 'Error al registrar swipe' },
      { status: 500 }
    );
  }
}

