import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { RESCUE_NEED_LABELS } from '@/lib/rescue';
const OFFER_LABELS: Record<string, string> = {
  PENDING: 'Por responder',
  INTERESTED: 'Interés expresado',
  SELECTED: 'Ayuda coordinada',
  DECLINED: 'Interés retirado',
  EXPIRED: 'Propuesta vencida',
  CLOSED: 'Contacto cerrado',
};
export interface InboxRow {
  id: string;
  kind: 'match' | 'group' | 'foster' | 'volunteer';
  title: string;
  context: string;
  href: string;
  unread: number;
  preview: string;
  updatedAt: string;
}
export async function getInbox(userId: string): Promise<InboxRow[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { syntheticRunId: true },
  });
  if (!user) return [];
  const blocked = await db.blockedUser.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
  });
  const blockedIds = blocked.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId));
  const allowedUser = {
    syntheticRunId: user.syntheticRunId,
    isBlocked: false,
    id: { notIn: blockedIds },
  };
  const [matches, groups, fosters, volunteers] = await Promise.all([
    db.match.findMany({
      where: {
        AND: [
          { OR: [{ pet1: { owner: { userId } } }, { pet2: { owner: { userId } } }] },
          { pet1: { owner: { user: allowedUser } }, pet2: { owner: { user: allowedUser } } },
        ],
      },
      include: {
        pet1: { select: { name: true, owner: { select: { userId: true } } } },
        pet2: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.groupMember.findMany({ where: { userId }, include: { group: true }, take: 100 }),
    db.fosterOffer.findMany({
      where: {
        status: { not: 'PENDING' },
        AND: [
          { OR: [{ rescueCase: { createdByUserId: userId } }, { fosterProfile: { userId } }] },
          { rescueCase: { createdBy: allowedUser }, fosterProfile: { user: allowedUser } },
        ],
      },
      include: {
        rescueCase: true,
        fosterProfile: { include: { user: { select: { name: true } } } },
        placement: { select: { id: true } },
      },
      take: 100,
    }),
    db.volunteerOffer.findMany({
      where: {
        status: { not: 'PENDING' },
        AND: [
          {
            OR: [
              { need: { rescueCase: { createdByUserId: userId } } },
              { volunteerProfile: { userId } },
            ],
          },
          {
            need: { rescueCase: { createdBy: allowedUser } },
            volunteerProfile: { user: allowedUser },
          },
        ],
      },
      include: {
        need: { include: { rescueCase: true } },
        volunteerProfile: { include: { user: { select: { name: true } } } },
        assignment: { select: { id: true } },
      },
      take: 100,
    }),
  ]);
  const contexts: Array<
    Omit<InboxRow, 'unread' | 'preview'> & { where: Prisma.MessageWhereInput; readSince?: Date }
  > = [
    ...matches.map((m) => ({
      id: m.id,
      kind: 'match' as const,
      title: (m.pet1?.owner.userId === userId ? m.pet2?.name : m.pet1?.name) || 'Encuentro',
      context: 'Encuentro de mascotas',
      href: `/messages?matchId=${m.id}`,
      updatedAt: m.createdAt.toISOString(),
      where: { matchId: m.id },
    })),
    ...groups.map((g) => ({
      id: g.groupId,
      kind: 'group' as const,
      title: g.group.name,
      context: 'Grupo',
      href: `/messages?groupId=${g.groupId}`,
      updatedAt: g.joinedAt.toISOString(),
      where: { groupId: g.groupId },
      readSince: g.lastReadAt,
    })),
    ...fosters.map((f) => ({
      id: f.id,
      kind: 'foster' as const,
      title:
        f.rescueCase.createdByUserId === userId
          ? f.fosterProfile.user.name || 'Hogar de tránsito'
          : 'Coordinación de tránsito',
      context: `Hogar de tránsito · ${OFFER_LABELS[f.status] || 'Contacto'}`,
      href: `/hogares-de-transito/casos/${f.rescueCaseId}?contact=1&kind=foster&offer=${f.id}`,
      updatedAt: f.updatedAt.toISOString(),
      where: {
        OR: [
          { fosterOfferId: f.id },
          ...(f.placement ? [{ fosterPlacementId: f.placement.id }] : []),
        ],
      },
    })),
    ...volunteers.map((v) => ({
      id: v.id,
      kind: 'volunteer' as const,
      title:
        v.need.rescueCase.createdByUserId === userId
          ? v.volunteerProfile.user.name || 'Voluntariado'
          : 'Coordinación de ayuda',
      context: `${RESCUE_NEED_LABELS[v.need.type]} · ${OFFER_LABELS[v.status] || 'Contacto'}`,
      href: `/hogares-de-transito/casos/${v.need.rescueCaseId}?contact=1&kind=volunteer&offer=${v.id}`,
      updatedAt: v.updatedAt.toISOString(),
      where: {
        OR: [
          { volunteerOfferId: v.id },
          ...(v.assignment ? [{ volunteerAssignmentId: v.assignment.id }] : []),
        ],
      },
    })),
  ];
  const rows: InboxRow[] = [];
  for (let index = 0; index < contexts.length; index += 10) {
    rows.push(
      ...(await Promise.all(
        contexts.slice(index, index + 10).map(async ({ where, readSince, ...row }) => {
          const [latest, unread] = await Promise.all([
            db.message.findFirst({
              where: { AND: [where, { sender: allowedUser }] },
              orderBy: { createdAt: 'desc' },
              select: { content: true, createdAt: true },
            }),
            db.message.count({
              where: {
                AND: [
                  where,
                  { senderId: { not: userId }, sender: allowedUser },
                  readSince
                    ? { createdAt: { gt: readSince } }
                    : { read: false, receiverId: userId },
                ],
              },
            }),
          ]);
          return {
            ...row,
            unread,
            preview: latest?.content.slice(0, 120) || 'Todavía no hay mensajes',
            updatedAt: latest?.createdAt.toISOString() || row.updatedAt,
          };
        })
      ))
    );
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
