import { db } from '@/lib/db';
export interface PendingAction {
  id: string;
  title: string;
  detail: string;
  href: string;
  priority: number;
  createdAt: string;
  kind: 'help' | 'appointment' | 'message';
}
export async function getPendingActions(userId: string): Promise<PendingAction[]> {
  const now = new Date();
  const [appointments, placements, offers, volunteers, cases, messages] = await Promise.all([
    db.appointment.findMany({
      where: {
        OR: [{ userId }, { service: { provider: { userId } } }],
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: {
        service: { select: { name: true, duration: true, provider: { select: { userId: true } } } },
      },
      orderBy: { date: 'asc' },
      take: 30,
    }),
    db.fosterPlacement.findMany({
      where: {
        status: 'COORDINATING',
        OR: [{ rescueCase: { createdByUserId: userId } }, { fosterProfile: { userId } }],
      },
      include: { rescueCase: true, fosterProfile: { select: { userId: true } } },
      take: 30,
    }),
    db.fosterOffer.findMany({
      where: { fosterProfile: { userId }, status: 'PENDING', expiresAt: { gt: now } },
      include: { rescueCase: true },
      take: 30,
    }),
    db.volunteerOffer.findMany({
      where: { volunteerProfile: { userId }, status: 'PENDING', expiresAt: { gt: now } },
      include: { need: { include: { rescueCase: true } } },
      take: 30,
    }),
    db.rescueCase.findMany({
      where: { createdByUserId: userId, status: 'SEARCHING' },
      include: {
        _count: { select: { offers: { where: { status: 'INTERESTED', expiresAt: { gt: now } } } } },
      },
      take: 30,
    }),
    db.message.findMany({
      where: {
        receiverId: userId,
        read: false,
        sender: {
          isBlocked: false,
          blockedUsers: { none: { blockedId: userId } },
          blockedByUsers: { none: { blockerId: userId } },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 1,
    }),
  ]);
  const rows: PendingAction[] = [];
  for (const a of appointments) {
    if (a.date < now && a.status === 'PENDING') continue;
    const provider = a.service.provider.userId === userId;
    const ended =
      a.date.getTime() + (a.durationMinutes ?? a.service.duration) * 60000 <= now.getTime();
    if (ended && !provider) continue;
    rows.push({
      id: `appointment:${a.id}`,
      title:
        provider && a.status === 'PENDING'
          ? 'Confirmar solicitud de turno'
          : a.status === 'PENDING'
            ? 'Esperando confirmación del prestador'
            : ended
              ? 'Registrar el resultado del turno'
              : 'Próximo turno confirmado',
      detail: a.service.name,
      href: provider ? '/provider?tab=appointments' : '/appointments',
      priority: provider && a.status === 'PENDING' ? 2 : 3,
      createdAt: a.date.toISOString(),
      kind: 'appointment',
    });
  }
  for (const p of placements) {
    const needsConfirm =
      p.rescueCase.createdByUserId === userId ? !p.requesterConfirmedAt : !p.fosterConfirmedAt;
    if (needsConfirm)
      rows.push({
        id: `placement:${p.id}`,
        title: 'Confirmar el inicio del tránsito',
        detail: 'Coordiná la entrega y confirmá cuando ocurra.',
        href: `/hogares-de-transito/casos/${p.rescueCaseId}`,
        priority: 2,
        createdAt: p.createdAt.toISOString(),
        kind: 'help',
      });
  }
  for (const o of offers)
    rows.push({
      id: `foster:${o.id}`,
      title: 'Responder propuesta de tránsito',
      detail: `Vence ${o.expiresAt.toLocaleDateString('es-AR')}`,
      href: `/hogares-de-transito/casos/${o.rescueCaseId}`,
      priority:
        o.rescueCase.urgency !== 'NORMAL' || o.expiresAt.getTime() - now.getTime() < 86400000
          ? 0
          : 1,
      createdAt: o.createdAt.toISOString(),
      kind: 'help',
    });
  for (const o of volunteers)
    rows.push({
      id: `volunteer:${o.id}`,
      title: 'Responder propuesta de ayuda',
      detail: `Vence ${o.expiresAt.toLocaleDateString('es-AR')}`,
      href: `/hogares-de-transito/casos/${o.need.rescueCaseId}`,
      priority: o.expiresAt.getTime() - now.getTime() < 86400000 ? 0 : 1,
      createdAt: o.createdAt.toISOString(),
      kind: 'help',
    });
  for (const c of cases)
    if (c._count.offers > 0)
      rows.push({
        id: `case:${c.id}`,
        title: 'Revisar hogares interesados',
        detail: `${c._count.offers} propuestas para tu caso`,
        href: `/hogares-de-transito/casos/${c.id}`,
        priority: c.urgency !== 'NORMAL' ? 0 : 2,
        createdAt: c.createdAt.toISOString(),
        kind: 'help',
      });
  if (messages[0])
    rows.push({
      id: 'messages',
      title: 'Tenés mensajes sin leer',
      detail: 'Continuá tus conversaciones.',
      href: '/messages',
      priority: 4,
      createdAt: messages[0].createdAt.toISOString(),
      kind: 'message',
    });
  return rows
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt))
    .slice(0, 20);
}
