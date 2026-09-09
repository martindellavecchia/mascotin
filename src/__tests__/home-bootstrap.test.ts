import { getHomeBootstrapData } from '@/lib/server/home';
import { db } from '@/lib/db';
import { getRankedPetMatches } from '@/lib/server/pet-matching';
import { getFeedPage } from '@/lib/server/feed';

jest.mock('@/lib/db', () => ({ db: {
  owner: { findUnique: jest.fn() },
  match: { findFirst: jest.fn() },
  post: { findFirst: jest.fn() },
} }));
jest.mock('@/lib/server/pet-matching', () => ({ getRankedPetMatches: jest.fn() }));
jest.mock('@/lib/server/feed', () => ({ getFeedPage: jest.fn() }));

const emptyFeed = { posts: [], nextCursor: null, hasMore: false };
const owner = { id: 'owner-1', location: 'Córdoba', bio: '', pets: [{ id: 'pet-1', name: 'Mora', petType: 'dog' }] };

describe('home bootstrap', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (db.owner.findUnique as jest.Mock).mockResolvedValue(owner);
    (db.match.findFirst as jest.Mock).mockResolvedValue(null);
    (db.post.findFirst as jest.Mock).mockResolvedValue(null);
    (getRankedPetMatches as jest.Mock).mockResolvedValue([]);
    (getFeedPage as jest.Mock).mockResolvedValue(emptyFeed);
  });

  it.each([null, { ...owner, pets: [] }])('skips secondary queries without pets (%j)', async (profile) => {
    (db.owner.findUnique as jest.Mock).mockResolvedValue(profile);
    expect(await getHomeBootstrapData('user-1')).toMatchObject({ pets: [], suggestions: [], feedPage: emptyFeed });
    expect(db.match.findFirst).not.toHaveBeenCalled();
    expect(db.post.findFirst).not.toHaveBeenCalled();
    expect(getRankedPetMatches).not.toHaveBeenCalled();
    expect(getFeedPage).not.toHaveBeenCalled();
  });

  it('does not load a hidden feed and requests only the one displayed suggestion', async () => {
    const home = await getHomeBootstrapData('user-1', 'someone-elses-pet');
    expect(home).toMatchObject({ selectedPetId: 'pet-1', hasMatches: false, hasOwnPosts: false, feedPage: emptyFeed });
    expect(getRankedPetMatches).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', currentPet: owner.pets[0], myPetIds: ['pet-1'], limit: 1,
    }));
    expect(getFeedPage).not.toHaveBeenCalled();
  });

  it.each(['match', 'ownPost'])('loads the feed concurrently with suggestions when there is a %s', async (reason) => {
    const trigger = reason === 'match' ? db.match.findFirst : db.post.findFirst;
    (trigger as jest.Mock).mockResolvedValue({ id: 'activity-1' });
    let resolveSuggestions!: (value: []) => void;
    (getRankedPetMatches as jest.Mock).mockReturnValue(new Promise(resolve => { resolveSuggestions = resolve; }));
    const pendingHome = getHomeBootstrapData('user-1');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(getFeedPage).toHaveBeenCalledWith({ userId: 'user-1', limit: 10 });
    resolveSuggestions([]);
    expect(await pendingHome).toMatchObject({ hasMatches: reason === 'match', hasOwnPosts: reason === 'ownPost' });
  });
});
