import { getServerSession } from 'next-auth';
import { GET as getDiscoveryPets } from '@/app/api/pets/route';
import { GET as getTrendingPets } from '@/app/api/pets/trending/route';
import { db } from '@/lib/db';
import { getSuggestionsForPet } from '@/lib/server/home';
import { getRankedPetMatches } from '@/lib/server/pet-matching';
import { excludeHiddenProfilePets, VISIBLE_PROFILE_USER_FILTER } from '@/lib/server/profile-visibility';

jest.mock('next/server', () => ({ NextResponse: {
  json: (body: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200, json: async () => body,
  }),
} }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/server/pet-matching', () => ({ getRankedPetMatches: jest.fn() }));
jest.mock('@/lib/server/feed', () => ({ getFeedPage: jest.fn() }));
jest.mock('@/lib/db', () => ({ db: {
  pet: { findMany: jest.fn(), findUnique: jest.fn() },
  owner: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  userSettings: { findUnique: jest.fn() },
  swipe: { findMany: jest.fn() },
  blockedUser: { findMany: jest.fn() },
} }));

const hiddenOwnerFilter = { settings: { is: { profileVisible: false } } };

describe('profile visibility in discovery', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'viewer' } });
    (db.user.findUnique as jest.Mock).mockResolvedValue({ syntheticRunId: null });
    (db.userSettings.findUnique as jest.Mock).mockResolvedValue(null);
    (db.swipe.findMany as jest.Mock).mockResolvedValue([]);
    (db.blockedUser.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('drops pets whose owner hid their profile and keeps the rest in order', async () => {
    (db.pet.findMany as jest.Mock).mockResolvedValue([{ id: 'hidden' }]);

    const result = await excludeHiddenProfilePets([{ id: 'a' }, { id: 'hidden' }, { id: 'b' }]);

    expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(db.pet.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'hidden', 'b'] }, owner: { user: hiddenOwnerFilter } },
      select: { id: true },
    });
  });

  it('skips the visibility query when there is nothing to filter', async () => {
    expect(await excludeHiddenProfilePets([])).toEqual([]);
    expect(db.pet.findMany).not.toHaveBeenCalled();
  });

  it('filters hidden owners out of home suggestions without losing the requested count', async () => {
    (getRankedPetMatches as jest.Mock).mockResolvedValue([{ id: 'hidden' }, { id: 'visible-1' }, { id: 'visible-2' }]);
    (db.pet.findMany as jest.Mock).mockResolvedValue([{ id: 'hidden' }]);

    const suggestions = await getSuggestionsForPet(
      'viewer', { id: 'mine', petType: 'dog', breed: null }, 'Córdoba', '', ['mine'], 1
    );

    expect(getRankedPetMatches).toHaveBeenCalledWith(expect.objectContaining({ limit: 3 }));
    expect(suggestions).toEqual([{ id: 'visible-1' }]);
  });

  it('excludes hidden owners from the explore query', async () => {
    (db.pet.findUnique as jest.Mock).mockResolvedValue({
      id: 'mine', ownerId: 'owner-1', petType: 'dog', breed: null,
      owner: { userId: 'viewer', location: 'Córdoba', bio: '' },
    });
    (db.pet.findMany as jest.Mock).mockResolvedValue([]);

    const response = await getDiscoveryPets({ url: 'http://localhost/api/pets?currentPetId=mine' } as Request);

    expect(response.status).toBe(200);
    const query = (db.pet.findMany as jest.Mock).mock.calls[0][0];
    expect(query.where.owner.user).toMatchObject(VISIBLE_PROFILE_USER_FILTER);
  });

  it('excludes hidden owners from trending pets', async () => {
    (db.owner.findUnique as jest.Mock).mockResolvedValue(null);
    (db.pet.findMany as jest.Mock).mockResolvedValue([]);

    const response = await getTrendingPets();

    expect(response.status).toBe(200);
    const query = (db.pet.findMany as jest.Mock).mock.calls[0][0];
    expect(query.where.owner.user).toMatchObject(VISIBLE_PROFILE_USER_FILTER);
  });
});
