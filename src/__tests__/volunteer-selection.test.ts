jest.mock('@/lib/notifications', () => ({ createNotification: jest.fn().mockResolvedValue(null) }));

jest.mock('@/lib/db', () => ({
  db: {
    volunteerOffer: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { db } from '@/lib/db';
import { selectVolunteerOffer, VolunteerNetworkError } from '@/lib/server/volunteer-network';

const dbMock = db as unknown as {
  volunteerOffer: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

const OFFER = {
  id: 'offer-1',
  needId: 'need-1',
  volunteerProfileId: 'profile-1',
  role: 'TRANSPORT',
  status: 'INTERESTED',
  volunteerProfile: { id: 'profile-1', userId: 'volunteer-1', status: 'ACTIVE', occupiedTasks: 0, maxConcurrentTasks: 1 },
  need: {
    id: 'need-1', rescueCaseId: 'case-1',
    rescueCase: { id: 'case-1', createdByUserId: 'creator-1', status: 'INTERESTED' },
  },
};

function transactionMock(options: { needClaims: number[]; capacityClaim: number }) {
  let assignmentNumber = 0;
  const tx = {
    volunteerOffer: {
      findUnique: jest.fn().mockResolvedValue(OFFER),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    rescueNeed: {
      updateMany: jest.fn().mockImplementation(() => Promise.resolve({ count: options.needClaims.shift() ?? 0 })),
    },
    volunteerProfile: {
      updateMany: jest.fn().mockResolvedValue({ count: options.capacityClaim }),
    },
    volunteerAssignment: {
      create: jest.fn().mockImplementation(() => Promise.resolve({ id: `assignment-${++assignmentNumber}` })),
    },
    rescueCase: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'case-1', status: 'INTERESTED', needs: [{ status: 'ACTIVE' }], placements: [], adoptionDraft: null, adoptionListing: null,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    rescueCaseEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  dbMock.$transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
  return tx;
}

describe('selección de voluntariado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbMock.volunteerOffer.findUnique.mockResolvedValue(OFFER);
  });

  it('permite una sola selección para la misma necesidad', async () => {
    transactionMock({ needClaims: [1, 0], capacityClaim: 1 });
    await expect(selectVolunteerOffer('offer-1', 'creator-1')).resolves.toEqual({ id: 'assignment-1' });
    await expect(selectVolunteerOffer('offer-1', 'creator-1')).rejects.toMatchObject<Partial<VolunteerNetworkError>>({ status: 409 });
  });

  it('rechaza la selección si el voluntario se quedó sin cupo', async () => {
    transactionMock({ needClaims: [1], capacityClaim: 0 });
    await expect(selectVolunteerOffer('offer-1', 'creator-1')).rejects.toMatchObject<Partial<VolunteerNetworkError>>({ status: 409 });
  });
});
