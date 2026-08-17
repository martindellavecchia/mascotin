jest.mock('@/lib/db', () => ({
  db: {
    rescueCase: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    fosterProfile: { findUnique: jest.fn() },
    volunteerProfile: { findUnique: jest.fn() },
    blockedUser: { findFirst: jest.fn() },
  },
}));

import { db } from '@/lib/db';
import { getRescueContactOptions } from '@/lib/server/rescue-contact';

const dbMock = db as unknown as {
  rescueCase: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  fosterProfile: { findUnique: jest.Mock };
  volunteerProfile: { findUnique: jest.Mock };
  blockedUser: { findFirst: jest.Mock };
};

const rescueCase = {
  id: 'case-1',
  createdByUserId: 'creator-1',
  createdBy: { syntheticRunId: null },
  species: 'dog',
  size: 'medium',
  urgency: 'HIGH',
  latitude: -34.6037,
  longitude: -58.3816,
  searchRadiusKm: 10,
  requestedDays: 7,
  offers: [],
  needs: [
    { id: 'need-foster', type: 'FOSTER', status: 'OPEN', isPrimary: true, createdAt: new Date(), volunteerOffers: [] },
    { id: 'need-transport', type: 'TRANSPORT', status: 'OPEN', isPrimary: false, createdAt: new Date(), volunteerOffers: [] },
  ],
};

const fosterProfile = {
  id: 'foster-profile-1', userId: 'helper-1', status: 'ACTIVE', acceptsSpecies: '["dog"]', acceptsSizes: '["medium"]',
  capacity: 1, occupiedSlots: 0, latitude: -34.605, longitude: -58.3816, radiusKm: 5,
  availableFrom: null, availableUntil: null, maxDurationDays: 30, experience: 'some',
};

const volunteerProfile = {
  id: 'volunteer-profile-1', userId: 'helper-1', status: 'ACTIVE', roles: '["TRANSPORT"]',
  latitude: -34.605, longitude: -58.3816, radiusKm: 5, availableFrom: null, availableUntil: null,
  maxConcurrentTasks: 2, occupiedTasks: 0,
};

describe('rescue wall contact eligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbMock.rescueCase.findUnique.mockResolvedValue(rescueCase);
    dbMock.user.findUnique.mockResolvedValue({ syntheticRunId: null });
    dbMock.fosterProfile.findUnique.mockResolvedValue(fosterProfile);
    dbMock.volunteerProfile.findUnique.mockResolvedValue(volunteerProfile);
    dbMock.blockedUser.findFirst.mockResolvedValue(null);
  });

  it('supports independent foster and volunteer profiles for the same user', async () => {
    const options = await getRescueContactOptions('case-1', 'helper-1');

    expect(options).toEqual(expect.arrayContaining([
      expect.objectContaining({ needType: 'FOSTER', canContact: true, code: 'ELIGIBLE' }),
      expect.objectContaining({ needType: 'TRANSPORT', canContact: true, code: 'ELIGIBLE' }),
    ]));
  });

  it('returns a role-specific profile requirement without weakening foster eligibility', async () => {
    dbMock.volunteerProfile.findUnique.mockResolvedValue(null);
    const options = await getRescueContactOptions('case-1', 'helper-1');

    expect(options.find((option) => option.needType === 'FOSTER')).toMatchObject({ canContact: true, code: 'ELIGIBLE' });
    expect(options.find((option) => option.needType === 'TRANSPORT')).toMatchObject({ canContact: false, code: 'PROFILE_REQUIRED' });
  });

  it('uses a generic ineligible result for blocked relationships even with an existing offer', async () => {
    dbMock.blockedUser.findFirst.mockResolvedValue({ id: 'block-1' });
    dbMock.rescueCase.findUnique.mockResolvedValue({
      ...rescueCase,
      offers: [{ id: 'offer-1', fosterProfileId: fosterProfile.id, status: 'INTERESTED', expiresAt: new Date() }],
    });
    const options = await getRescueContactOptions('case-1', 'helper-1');

    expect(options.every((option) => option.code === 'NOT_ELIGIBLE' && !option.canContact)).toBe(true);
    expect(options.every((option) => option.existingContact === null)).toBe(true);
  });

  it('uses the smaller household radius for eligibility', async () => {
    dbMock.fosterProfile.findUnique.mockResolvedValue({ ...fosterProfile, latitude: -34.63, radiusKm: 1 });
    const options = await getRescueContactOptions('case-1', 'helper-1');

    expect(options.find((option) => option.needType === 'FOSTER')).toMatchObject({ canContact: false, code: 'OUT_OF_RADIUS' });
  });
});
