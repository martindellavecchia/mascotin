import { GET as getMatchCount } from '@/app/api/matches/count/route';
import { GET as getMyPets } from '@/app/api/pet/mine/route';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';

jest.mock('next/server', () => ({ NextResponse: {
  json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
    status: init?.status ?? 200, headers: new Headers(init?.headers), json: async () => body,
  }),
} }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/db', () => ({ db: {
  match: { count: jest.fn() }, pet: { findMany: jest.fn() },
} }));

describe('private navigation reads', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'viewer' } });
    (db.match.count as jest.Mock).mockResolvedValue(3);
    (db.pet.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('counts encounters for either pet belonging to the authenticated viewer without downloading photos', async () => {
    const response = await getMatchCount();
    expect(await response.json()).toEqual({ success: true, count: 3 });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(db.match.count).toHaveBeenCalledWith({ where: { OR: [
      { pet1: { owner: { userId: 'viewer' } } }, { pet2: { owner: { userId: 'viewer' } } },
    ] } });
  });

  it('rejects unauthenticated requests before accessing the database', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    expect((await getMatchCount()).status).toBe(401);
    expect((await getMyPets(new Request('http://localhost/api/pet/mine'))).status).toBe(401);
    expect(db.match.count).not.toHaveBeenCalled();
    expect(db.pet.findMany).not.toHaveBeenCalled();
  });

  it('loads pets in one query scoped to the session even if another owner is requested', async () => {
    const response = await getMyPets(new Request('http://localhost/api/pet/mine?ownerId=someone-else'));
    expect(await response.json()).toEqual({ success: true, pets: [] });
    expect(db.pet.findMany).toHaveBeenCalledWith({
      where: { owner: { userId: 'viewer' } }, orderBy: { createdAt: 'desc' },
    });
  });

  it('returns an error rather than a misleading zero when the count fails', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      (db.match.count as jest.Mock).mockRejectedValue(new Error('Unavailable'));
      const response = await getMatchCount();
      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({ success: false });
    } finally { errorLog.mockRestore(); }
  });
});
