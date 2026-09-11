import { db } from '@/lib/db';
import { adoptionSearchWhere, storeSearchWhere, searchFiltersSchema } from '@/lib/product-search';
import { enqueueNotificationPush } from '@/lib/server/push';
import { recordProductEvent } from '@/lib/server/product-events';

export function digestDay(now: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export async function digestForUser(userId: string, cutoff: Date) {
  const day = digestDay(cutoff);
  const result = await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      if (await tx.searchDigest.findUnique({ where: { userId_day: { userId, day } } })) return null;
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { syntheticRunId: true, isBlocked: true },
      });
      if (!user || user.isBlocked) return null;
      const blocks = await tx.blockedUser.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      });
      const blocked = blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId));
      const searches = await tx.savedSearch.findMany({
        where: { userId, enabled: true },
        orderBy: { id: 'asc' },
        take: 10,
      });
      let count = 0;
      let push = false;
      for (const search of searches) {
        const filters = searchFiltersSchema.parse(search.filters);
        const window = {
          AND: [
            { createdAt: { lte: cutoff } },
            {
              OR: [
                { createdAt: { gt: search.lastCheckedAt } },
                { createdAt: search.lastCheckedAt, id: { gt: search.lastCheckedId } },
              ],
            },
          ],
        };
        const rows =
          search.kind === 'ADOPTION'
            ? await tx.adoptionListing.findMany({
                where: {
                  AND: [
                    adoptionSearchWhere(filters),
                    window,
                    {
                      listedByUserId: { notIn: [userId, ...blocked] },
                      listedBy: { syntheticRunId: user.syntheticRunId, isBlocked: false },
                    },
                  ],
                },
                select: { id: true, createdAt: true },
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                take: 500,
              })
            : await tx.store.findMany({
                where: {
                  AND: [
                    storeSearchWhere(filters),
                    window,
                    {
                      OR: [
                        {
                          providerId: null,
                          ...(user.syntheticRunId ? { id: '__no_public_for_synthetic__' } : {}),
                        },
                        {
                          provider: {
                            syntheticRunId: user.syntheticRunId,
                            isBlocked: false,
                            id: { notIn: [userId, ...blocked] },
                          },
                        },
                      ],
                    },
                  ],
                },
                select: { id: true, createdAt: true },
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                take: 500,
              });
        const notified =
          search.kind === 'ADOPTION'
            ? await tx.notification.findMany({
                where: {
                  userId,
                  type: 'SOLIDARITY_ADOPTION_ALERT',
                  entityId: { in: rows.map((r) => r.id) },
                },
                select: { entityId: true },
              })
            : [];
        const immediateIds = new Set(notified.map((n) => n.entityId));
        const eligible = rows.filter((r) => !immediateIds.has(r.id));
        const created = eligible.length
          ? await tx.searchDelivery.createMany({
              data: eligible.map((r) => ({ userId, kind: search.kind, entityId: r.id })),
              skipDuplicates: true,
            })
          : { count: 0 };
        count += created.count;
        if (created.count && search.pushEnabled) push = true;
        const last = rows.at(-1);
        await tx.savedSearch.update({
          where: { id: search.id },
          data:
            rows.length === 500 && last
              ? { lastCheckedAt: last.createdAt, lastCheckedId: last.id }
              : { lastCheckedAt: cutoff, lastCheckedId: '' },
        });
      }
      await tx.searchDigest.create({ data: { userId, day, count } });
      if (!count) return null;
      const notification = await tx.notification.create({
        data: {
          userId,
          type: 'SEARCH_DIGEST',
          title: 'Novedades en tus búsquedas',
          body: `${count} resultado${count === 1 ? '' : 's'} nuevo${count === 1 ? '' : 's'}. Revisá tus búsquedas guardadas.`,
          link: '/saved-searches',
          dedupeKey: `search-digest:${userId}:${day}`,
        },
      });
      await recordProductEvent(userId, 'search_digest_delivered', day, tx);
      return { notificationId: notification.id, push };
    },
    { timeout: 20000 }
  );
  if (result?.push) await enqueueNotificationPush(result.notificationId);
  return result;
}

export async function runSearchDigests(now = new Date(), budgetMs = 35000) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now)
  );
  if (hour < 9) return { processed: 0, hasMore: false };
  const started = Date.now();
  const day = digestDay(now);
  let processed = 0;
  const failed: string[] = [];
  while (Date.now() - started < budgetMs) {
    const user = await db.user.findFirst({
      where: {
        id: { notIn: failed },
        isBlocked: false,
        savedSearches: { some: { enabled: true } },
        searchDigests: { none: { day } },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (!user) return { processed, hasMore: failed.length > 0, failed: failed.length };
    try {
      await digestForUser(user.id, now);
    } catch (error) {
      failed.push(user.id);
      console.error('search_digest_failed', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'unknown',
      });
      continue;
    }
    processed++;
  }
  return { processed, hasMore: true };
}
