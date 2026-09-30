import type { Prisma } from '@prisma/client';

export const linkedEventSelect = { id: true, date: true, location: true } as const;

export function withEventDetails<T extends { event?: { date: Date; location: string } | null; eventDate?: Date | null; eventLocation?: string | null }>(post: T) {
  return {
    ...post,
    eventDate: post.event?.date ?? post.eventDate,
    eventLocation: post.event?.location ?? post.eventLocation,
  };
}

export class EventPostError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function assertEventEditor(tx: Prisma.TransactionClient, event: { authorId: string; groupId: string | null }, userId: string) {
  if (event.authorId === userId) return;
  if (event.groupId) {
    const member = await tx.groupMember.findUnique({ where: { groupId_userId: { groupId: event.groupId, userId } } });
    if (member?.role === 'ADMIN') return;
  }
  throw new EventPostError('No tenés permiso para modificar este evento', 403);
}
