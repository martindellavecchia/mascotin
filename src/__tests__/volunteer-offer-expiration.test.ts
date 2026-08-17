const mockSetRescueNeedStatus = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    volunteerOffer: { findMany: jest.fn() },
    rescueNeed: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/notifications', () => ({ createNotification: jest.fn() }));

jest.mock('@/lib/server/rescue-needs', () => ({
  recalculateRescueCaseStatus: jest.fn(),
  setRescueNeedStatus: (...args: unknown[]) => mockSetRescueNeedStatus(...args),
}));

import { db } from '@/lib/db';
import { expireVolunteerOffers } from '@/lib/server/volunteer-network';

const dbMock = db as unknown as {
  volunteerOffer: { findMany: jest.Mock };
  rescueNeed: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

describe('volunteer contact expiration', () => {
  it('expires pending and interested offers, reopens the need and attempts rematching', async () => {
    dbMock.volunteerOffer.findMany.mockResolvedValue([
      { id: 'pending-1', needId: 'need-1' },
      { id: 'interested-1', needId: 'need-1' },
    ]);
    dbMock.rescueNeed.findUnique.mockResolvedValue(null);
    mockSetRescueNeedStatus.mockResolvedValue({ caseStatus: 'SEARCHING' });
    const tx = {
      volunteerOffer: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        count: jest.fn().mockResolvedValue(0),
      },
      volunteerAssignment: { count: jest.fn().mockResolvedValue(0) },
      rescueNeed: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'need-1', rescueCaseId: 'case-1', status: 'INTERESTED', rescueCase: { createdByUserId: 'creator-1' },
        }),
      },
      rescueCaseEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }) },
    };
    dbMock.$transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) => callback(tx));

    await expect(expireVolunteerOffers()).resolves.toEqual({ count: 2, rematched: 0 });

    expect(tx.volunteerOffer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ['PENDING', 'INTERESTED'] } }),
      data: { status: 'EXPIRED' },
    }));
    expect(mockSetRescueNeedStatus).toHaveBeenCalledWith(tx, 'need-1', 'OPEN');
    expect(dbMock.rescueNeed.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'need-1' } }));
  });
});
