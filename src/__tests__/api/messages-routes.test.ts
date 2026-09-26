const mockGetServerSession = jest.fn();
const mockCreateNotification = jest.fn();
const mockCreateNotificationBulk = jest.fn();
const mockMatchFindUnique = jest.fn();
const mockMessageFindMany = jest.fn();
const mockMessageFindFirst = jest.fn();
const mockMessageUpdateMany = jest.fn();
const mockNotificationUpdateMany = jest.fn();
const mockGroupMemberFindUnique = jest.fn();

if (typeof Response !== 'undefined' && typeof Response.json !== 'function') {
  Response.json = function json(body?: BodyInit | null, init?: ResponseInit) {
    return new Response(JSON.stringify(body ?? null), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  };
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
  createNotificationBulk: (...args: unknown[]) => mockCreateNotificationBulk(...args),
}));

jest.mock('@/lib/db', () => ({
  db: {
    match: {
      findUnique: (...args: unknown[]) => mockMatchFindUnique(...args),
    },
    message: {
      findMany: (...args: unknown[]) => mockMessageFindMany(...args),
      findFirst: (...args: unknown[]) => mockMessageFindFirst(...args),
      updateMany: (...args: unknown[]) => mockMessageUpdateMany(...args),
    },
    notification: {
      updateMany: (...args: unknown[]) => mockNotificationUpdateMany(...args),
    },
    groupMember: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: (...args: unknown[]) => mockGroupMemberFindUnique(...args),
    },
  },
}));

import { GET as getMatchMessages } from '@/app/api/messages/route';
import { GET as getGroupMessages } from '@/app/api/groups/[id]/messages/route';

describe('message routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'Tester',
      },
    });
    mockMatchFindUnique.mockReset();
    mockMessageFindMany.mockReset();
    mockGroupMemberFindUnique.mockReset();
    mockMessageFindFirst.mockReset().mockResolvedValue(null);
    mockMessageUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockNotificationUpdateMany.mockReset().mockResolvedValue({ count: 0 });
  });

  const participantMatch = {
    id: 'match-1',
    pet1: { owner: { userId: 'user-1' } },
    pet2: { owner: { userId: 'user-2' } },
    user1Id: 'user-1',
    user2Id: 'user-2',
  };

  describe('GET /api/messages', () => {
    it('returns the latest match page in ascending order with hasMoreBefore', async () => {
      mockMatchFindUnique.mockResolvedValue({
        id: 'match-1',
        pet1: { owner: { userId: 'user-1' } },
        pet2: { owner: { userId: 'user-2' } },
        user1Id: 'user-1',
        user2Id: 'user-2',
      });
      mockMessageFindMany.mockResolvedValue([
        { id: 'm3', content: 'tres', createdAt: new Date('2026-04-22T10:03:00.000Z') },
        { id: 'm2', content: 'dos', createdAt: new Date('2026-04-22T10:02:00.000Z') },
        { id: 'm1', content: 'uno', createdAt: new Date('2026-04-22T10:01:00.000Z') },
      ]);

      const response = await getMatchMessages(
        new Request('http://localhost/api/messages?matchId=match-1&limit=2')
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.messages.map((message: { id: string }) => message.id)).toEqual(['m2', 'm3']);
      expect(body.latestCursor).toBe('2026-04-22T10:03:00.000Z');
      expect(body.hasMoreBefore).toBe(true);
      expect(mockMessageFindMany).toHaveBeenCalledWith({
        where: { matchId: 'match-1' },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
    });

    it('rejects invalid after cursors before querying the database', async () => {
      const response = await getMatchMessages(
        new Request('http://localhost/api/messages?matchId=match-1&after=not-a-date')
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('El cursor de mensajes no es válido');
      expect(mockMatchFindUnique).not.toHaveBeenCalled();
      expect(mockMessageFindMany).not.toHaveBeenCalled();
    });

    it('marks received messages and their notifications as read when opening the chat', async () => {
      mockMatchFindUnique.mockResolvedValue(participantMatch);
      mockMessageFindMany.mockResolvedValue([
        { id: 'm1', content: 'hola', senderId: 'user-2', read: false, createdAt: new Date('2026-04-22T10:01:00.000Z') },
      ]);
      mockMessageUpdateMany.mockResolvedValue({ count: 1 });
      mockMessageFindFirst.mockResolvedValue({ createdAt: new Date('2026-04-22T09:00:00.000Z') });

      const response = await getMatchMessages(
        new Request('http://localhost/api/messages?matchId=match-1')
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockMessageUpdateMany).toHaveBeenCalledWith({
        where: { matchId: 'match-1', receiverId: 'user-1', read: false },
        data: { read: true },
      });
      expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false, link: '/messages?matchId=match-1' },
        data: { read: true },
      });
      expect(body.markedRead).toBe(1);
      expect(body.lastSeenAt).toBe('2026-04-22T09:00:00.000Z');
    });

    it('does not mark messages as read when polling returns nothing new', async () => {
      mockMatchFindUnique.mockResolvedValue(participantMatch);
      mockMessageFindMany.mockResolvedValue([]);

      const response = await getMatchMessages(
        new Request(`http://localhost/api/messages?matchId=match-1&after=${encodeURIComponent('2026-04-22T10:00:00.000Z')}`)
      );

      expect(response.status).toBe(200);
      expect(mockMessageUpdateMany).not.toHaveBeenCalled();
    });

    it('loads older messages with a before cursor without marking them as read', async () => {
      const before = '2026-04-22T10:00:00.000Z';
      mockMatchFindUnique.mockResolvedValue(participantMatch);
      mockMessageFindMany.mockResolvedValue([
        { id: 'm0', content: 'antes', createdAt: new Date('2026-04-22T09:59:00.000Z') },
      ]);

      const response = await getMatchMessages(
        new Request(`http://localhost/api/messages?matchId=match-1&before=${encodeURIComponent(before)}&limit=10`)
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.hasMoreBefore).toBe(false);
      expect(mockMessageFindMany).toHaveBeenCalledWith({
        where: { matchId: 'match-1', createdAt: { lt: new Date(before) } },
        orderBy: { createdAt: 'desc' },
        take: 11,
      });
      expect(mockMessageUpdateMany).not.toHaveBeenCalled();
    });

    it('rejects non-participants with a Spanish error', async () => {
      mockMatchFindUnique.mockResolvedValue({
        ...participantMatch,
        pet1: { owner: { userId: 'user-3' } },
        user1Id: 'user-3',
      });

      const response = await getMatchMessages(
        new Request('http://localhost/api/messages?matchId=match-1')
      );
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe('No tenés acceso a esta conversación');
    });
  });

  describe('GET /api/groups/[id]/messages', () => {
    it('returns only messages newer than the cursor with latestCursor', async () => {
      const after = '2026-04-22T10:03:00.000Z';

      mockGroupMemberFindUnique.mockResolvedValue({
        groupId: 'group-1',
        userId: 'user-1',
      });
      mockMessageFindMany.mockResolvedValue([
        {
          id: 'm4',
          content: 'cuatro',
          createdAt: new Date('2026-04-22T10:04:00.000Z'),
          sender: { id: 'user-2', name: 'Ana', image: null },
        },
        {
          id: 'm5',
          content: 'cinco',
          createdAt: new Date('2026-04-22T10:05:00.000Z'),
          sender: { id: 'user-1', name: 'Tester', image: null },
        },
      ]);

      const response = await getGroupMessages(
        new Request(`http://localhost/api/groups/group-1/messages?after=${encodeURIComponent(after)}&limit=2`),
        { params: { id: 'group-1' } }
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.messages.map((message: { id: string }) => message.id)).toEqual(['m4', 'm5']);
      expect(body.latestCursor).toBe('2026-04-22T10:05:00.000Z');
      expect(body.hasMoreBefore).toBe(false);
      expect(mockMessageFindMany).toHaveBeenCalledWith({
        where: {
          groupId: 'group-1',
          createdAt: { gt: new Date(after) },
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 2,
      });
    });

    it('clamps oversized limits for the initial group history page', async () => {
      mockGroupMemberFindUnique.mockResolvedValue({
        groupId: 'group-1',
        userId: 'user-1',
      });
      mockMessageFindMany.mockResolvedValue([
        {
          id: 'm1',
          content: 'uno',
          createdAt: new Date('2026-04-22T10:01:00.000Z'),
          sender: { id: 'user-2', name: 'Ana', image: null },
        },
      ]);

      const response = await getGroupMessages(
        new Request('http://localhost/api/groups/group-1/messages?limit=999'),
        { params: { id: 'group-1' } }
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockMessageFindMany).toHaveBeenCalledWith({
        where: { groupId: 'group-1' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 51,
      });
    });
  });
});
