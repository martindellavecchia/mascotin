const mockCreateNotification = jest.fn();
const mockSetCaseNeedStatus = jest.fn();
const mockSetRescueNeedStatus = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    rescueCase: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    fosterProfile: { findUnique: jest.fn() },
    volunteerProfile: { findUnique: jest.fn() },
    fosterOffer: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    volunteerOffer: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
    blockedUser: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

jest.mock('@/lib/server/rescue-needs', () => ({
  setCaseNeedStatus: (...args: unknown[]) => mockSetCaseNeedStatus(...args),
  setRescueNeedStatus: (...args: unknown[]) => mockSetRescueNeedStatus(...args),
}));

import { db } from '@/lib/db';
import { changeRescueContact, expressRescueInterest } from '@/lib/server/rescue-contact';

const dbMock = db as unknown as {
  rescueCase: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  fosterProfile: { findUnique: jest.Mock };
  volunteerProfile: { findUnique: jest.Mock };
  fosterOffer: { findUnique: jest.Mock };
  volunteerOffer: { findUnique: jest.Mock };
  blockedUser: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};

const baseCase = {
  id: 'case-1', createdByUserId: 'creator-1', status: 'INTERESTED', species: 'dog', size: 'medium', urgency: 'HIGH',
  latitude: -34.6037, longitude: -58.3816, location: 'Palermo, CABA', searchRadiusKm: 5, requestedDays: 7,
  createdBy: { syntheticRunId: null }, communityPost: { isVisible: true },
  needs: [
    { id: 'need-foster', rescueCaseId: 'case-1', type: 'FOSTER', status: 'INTERESTED' },
    { id: 'need-transport', rescueCaseId: 'case-1', type: 'TRANSPORT', status: 'INTERESTED' },
  ],
};

describe('rescue contact lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbMock.rescueCase.findUnique.mockResolvedValue(baseCase);
    dbMock.user.findUnique.mockResolvedValue({ syntheticRunId: null });
    dbMock.blockedUser.findFirst.mockResolvedValue(null);
    mockCreateNotification.mockResolvedValue(null);
    mockSetCaseNeedStatus.mockResolvedValue({ caseStatus: 'SEARCHING' });
    mockSetRescueNeedStatus.mockResolvedValue({ caseStatus: 'SEARCHING' });
  });

  it('is idempotent for an active foster interest even if capacity changed later', async () => {
    const expiresAt = new Date('2026-08-18T12:00:00.000Z');
    dbMock.fosterProfile.findUnique.mockResolvedValue({
      id: 'foster-profile-1', userId: 'helper-1', status: 'PAUSED', occupiedSlots: 1, capacity: 1,
      user: { syntheticRunId: null },
    });
    dbMock.fosterOffer.findUnique.mockResolvedValue({ id: 'foster-offer-1', status: 'INTERESTED', expiresAt });

    await expect(expressRescueInterest('case-1', 'helper-1', { needType: 'FOSTER' })).resolves.toEqual({
      kind: 'FOSTER', offerId: 'foster-offer-1', status: 'INTERESTED', expiresAt,
    });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('is idempotent for an active volunteer interest even if its task cup changed', async () => {
    const expiresAt = new Date('2026-08-18T12:00:00.000Z');
    dbMock.volunteerProfile.findUnique.mockResolvedValue({
      id: 'volunteer-profile-1', userId: 'helper-1', status: 'ACTIVE', occupiedTasks: 1, maxConcurrentTasks: 1,
      user: { syntheticRunId: null },
    });
    dbMock.volunteerOffer.findUnique.mockResolvedValue({ id: 'volunteer-offer-1', status: 'INTERESTED', expiresAt });

    await expect(expressRescueInterest('case-1', 'helper-1', { needType: 'TRANSPORT' })).resolves.toEqual({
      kind: 'VOLUNTEER', offerId: 'volunteer-offer-1', status: 'INTERESTED', expiresAt,
    });
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it('withdraws a foster interest atomically and reopens the need when no help remains', async () => {
    dbMock.fosterOffer.findUnique.mockResolvedValue({
      id: 'foster-offer-1', rescueCaseId: 'case-1', status: 'INTERESTED',
      fosterProfile: { userId: 'helper-1' },
      rescueCase: { id: 'case-1', createdByUserId: 'creator-1' },
    });
    const tx = {
      fosterOffer: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      fosterPlacement: { count: jest.fn().mockResolvedValue(0) },
      rescueCaseEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }) },
    };
    dbMock.$transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) => callback(tx));

    await expect(changeRescueContact('FOSTER', 'foster-offer-1', 'helper-1', 'withdraw')).resolves.toEqual({
      id: 'foster-offer-1', status: 'DECLINED',
    });

    expect(mockSetCaseNeedStatus).toHaveBeenCalledWith(tx, 'case-1', 'FOSTER', 'OPEN');
    expect(tx.rescueCaseEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'FOSTER_CONTACT_WITHDRAWN' }) });
    expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'creator-1' }));
  });
});
