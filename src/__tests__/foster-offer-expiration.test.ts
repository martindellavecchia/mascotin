const mockSetCaseNeedStatus = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    fosterOffer: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/notifications', () => ({ createNotification: jest.fn() }));

jest.mock('@/lib/server/rescue-needs', () => ({
  setCaseNeedStatus: (...args: unknown[]) => mockSetCaseNeedStatus(...args),
}));

import { db } from '@/lib/db';
import { expireFosterOffers } from '@/lib/server/foster';

const dbMock = db as unknown as {
  fosterOffer: { findMany: jest.Mock };
  $transaction: jest.Mock;
};

describe('foster contact expiration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbMock.fosterOffer.findMany.mockResolvedValue([
      { id: 'pending-1', rescueCaseId: 'case-1', status: 'PENDING' },
      { id: 'interested-1', rescueCaseId: 'case-1', status: 'INTERESTED' },
    ]);
    mockSetCaseNeedStatus.mockResolvedValue({ caseStatus: 'SEARCHING' });
  });

  it('expires pending and interested offers and reopens the need when the last interest ends', async () => {
    const tx = {
      fosterOffer: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        count: jest.fn().mockResolvedValue(0),
      },
      fosterPlacement: { count: jest.fn().mockResolvedValue(0) },
      rescueNeed: { findUnique: jest.fn().mockResolvedValue({ status: 'INTERESTED' }) },
    };
    dbMock.$transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) => callback(tx));

    await expect(expireFosterOffers()).resolves.toBe(2);

    expect(tx.fosterOffer.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ['PENDING', 'INTERESTED'] } }),
      data: { status: 'EXPIRED' },
    }));
    expect(mockSetCaseNeedStatus).toHaveBeenCalledWith(tx, 'case-1', 'FOSTER', 'OPEN');
  });
});
