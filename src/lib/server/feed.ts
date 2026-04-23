import 'server-only';

import { Prisma } from '@prisma/client';
import { withImageFields } from '@/lib/media';
import { db } from '@/lib/db';
import { serializeForClient } from '@/lib/server/serialize';

export interface FeedPageOptions {
  userId: string;
  petId?: string | null;
  limit?: number;
  cursor?: string | null;
}

export async function getFeedPage({
  userId,
  petId,
  limit = 10,
  cursor,
}: FeedPageOptions) {
  const where: Prisma.PostWhereInput = {};
  if (petId) where.petId = petId;

  const posts = await db.post.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          owner: {
            select: {
              image: true,
            },
          },
        },
      },
      pet: {
        select: {
          id: true,
          name: true,
          images: true,
          breed: true,
          petType: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
      likes: {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      },
      event: {
        select: {
          id: true,
          attendees: {
            where: { userId },
            select: { id: true },
          },
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (posts.length > limit) {
    const nextItem = posts.pop();
    nextCursor = nextItem?.id ?? null;
  }

  const formattedPosts = posts.map((post) => {
    const author = post.author as typeof post.author & {
      owner?: { image: string | null };
    };
    const authorImage = author?.image || author?.owner?.image || null;
    const normalizedPost = withImageFields(post);

    return {
      ...normalizedPost,
      author: {
        ...post.author,
        image: authorImage,
        owner: undefined,
      },
      isLiked: post.likes.length > 0,
      likes: undefined,
      isAttending: post.event ? post.event.attendees.length > 0 : false,
      eventId: post.event?.id,
    };
  });

  return serializeForClient({
    posts: formattedPosts,
    nextCursor,
    hasMore: nextCursor !== null,
  });
}
