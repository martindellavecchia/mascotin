import { getRankedPetMatches } from '@/lib/server/pet-matching';
import { db } from '@/lib/db';

jest.mock('@/lib/db', () => ({ db: {
  userSettings: { findUnique: jest.fn() }, user: { findUnique: jest.fn() },
  swipe: { findMany: jest.fn() }, blockedUser: { findMany: jest.fn() }, pet: { findMany: jest.fn() },
} }));

const options = {
  userId: 'viewer', currentPet: { id: 'mine', petType: 'dog', breed: 'Labrador' },
  ownerLocation: 'Córdoba', ownerBio: '', myPetIds: ['mine'], limit: 1,
};

describe('suggestion database reads', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (db.userSettings.findUnique as jest.Mock).mockResolvedValue(null);
    (db.user.findUnique as jest.Mock).mockResolvedValue({ syntheticRunId: null });
    (db.swipe.findMany as jest.Mock).mockResolvedValue([{ toPetId: 'already-seen' }]);
    (db.blockedUser.findMany as jest.Mock).mockResolvedValue([{ blockerId: 'viewer', blockedId: 'blocked-user' }]);
  });

  it('ranks without downloading candidate photos and loads only the displayed thumbnail', async () => {
    const candidates = Array.from({ length: 80 }, (_, index) => ({
      id: `candidate-${index}`, name: `Mascota ${index}`, petType: 'dog', breed: 'Labrador',
      location: 'Córdoba', owner: { location: 'Córdoba', bio: '' },
    }));
    (db.pet.findMany as jest.Mock)
      .mockResolvedValueOnce(candidates)
      .mockResolvedValueOnce([{ id: 'candidate-0', images: JSON.stringify(['/first.jpg', 'data:image/webp;base64,YWJj']), thumbnailIndex: 1 }]);
    const matches = await getRankedPetMatches(options);
    const [candidateQuery, photoQuery] = (db.pet.findMany as jest.Mock).mock.calls.map(([query]) => query);
    expect(candidateQuery.select).not.toHaveProperty('images');
    expect(candidateQuery.where.id.notIn).toEqual(['mine', 'already-seen']);
    expect(candidateQuery.where.owner.userId.notIn).toEqual(['blocked-user']);
    expect(photoQuery.where.id.in).toEqual(['candidate-0']);
    expect(photoQuery.where.owner).toEqual(candidateQuery.where.owner);
    expect(matches).toHaveLength(1);
    expect(matches[0].image).toBe('data:image/webp;base64,YWJj');
  });

  it('starts independent reads together and skips photos when no candidates qualify', async () => {
    let resolveSettings!: (value: null) => void;
    (db.userSettings.findUnique as jest.Mock).mockReturnValue(new Promise(resolve => { resolveSettings = resolve; }));
    (db.pet.findMany as jest.Mock).mockResolvedValue([]);
    const pending = getRankedPetMatches(options);
    expect(db.user.findUnique).toHaveBeenCalled();
    expect(db.swipe.findMany).toHaveBeenCalled();
    expect(db.blockedUser.findMany).toHaveBeenCalled();
    resolveSettings(null);
    expect(await pending).toEqual([]);
    expect(db.pet.findMany).toHaveBeenCalledTimes(1);
  });
});
