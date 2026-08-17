import 'server-only';

import { Prisma } from '@prisma/client';
import { withImageFields } from '@/lib/media';
import { db } from '@/lib/db';
import { serializeForClient } from '@/lib/server/serialize';

export interface FeedPageOptions {
  userId: string;
  petId?: string | null;
  postType?: string | null;
  limit?: number;
  cursor?: string | null;
}

export async function getFeedPage({
  userId,
  petId,
  postType,
  limit = 10,
  cursor,
}: FeedPageOptions) {
  const viewer = await db.user.findUnique({ where: { id: userId }, select: { syntheticRunId: true } });
  const where: Prisma.PostWhereInput = {
    isVisible: true,
    author: { syntheticRunId: viewer?.syntheticRunId || null },
  };
  if (petId) where.petId = petId;
  if (postType) where.postType = postType;

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
          stores: {
            where: { isActive: true },
            select: { id: true },
            take: 1,
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
      rescueCase: {
        select: {
          id: true,
          status: true,
          species: true,
          size: true,
          urgency: true,
          requestedDays: true,
          needs: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            select: { type: true, isPrimary: true, status: true },
          },
          adoptionListing: { select: { id: true, status: true } },
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
      stores?: { id: string }[];
    };
    const authorImage = author?.image || author?.owner?.image || null;
    const normalizedPost = withImageFields(post);

    const isFosterCase = Boolean(post.rescueCase);
    return {
      ...normalizedPost,
      latitude: isFosterCase ? undefined : normalizedPost.latitude,
      longitude: isFosterCase ? undefined : normalizedPost.longitude,
      contactPhone: isFosterCase ? undefined : normalizedPost.contactPhone,
      lastSeenLocation: isFosterCase ? undefined : normalizedPost.lastSeenLocation,
      authorId: isFosterCase ? 'foster-module' : post.authorId,
      author: {
        ...(isFosterCase
          ? { id: 'foster-module', name: 'Hogares de tránsito', image: null, isBusinessOwner: false }
          : {
              ...post.author,
              image: authorImage,
              isBusinessOwner: (author.stores?.length ?? 0) > 0,
            }),
        owner: undefined,
        stores: undefined,
      },
      canManage: post.authorId === userId,
      rescueCase: post.rescueCase
        ? {
            id: post.rescueCase.id,
            status: post.rescueCase.status,
            species: post.rescueCase.species,
            size: post.rescueCase.size,
            urgency: post.rescueCase.urgency,
            requestedDays: post.rescueCase.requestedDays,
            primaryNeed: post.rescueCase.needs.find((need) => need.isPrimary)?.type || 'FOSTER',
            additionalNeeds: post.rescueCase.needs.filter((need) => !need.isPrimary).map((need) => ({ type: need.type, status: need.status })),
            adoptionListingId:
              post.rescueCase.adoptionListing?.status === 'OPEN' || post.rescueCase.adoptionListing?.status === 'PENDING'
                ? post.rescueCase.adoptionListing.id
                : null,
          }
        : null,
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
