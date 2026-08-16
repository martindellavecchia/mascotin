const mockRequireAuth = jest.fn();
const mockCreateNotification = jest.fn();
const mockCreateOffersForCase = jest.fn();
const mockFosterOfferFindUnique = jest.fn();
const mockFosterPlacementFindUnique = jest.fn();
const mockTransaction = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

jest.mock('@/lib/server/foster', () => ({
  createOffersForCase: (...args: unknown[]) => mockCreateOffersForCase(...args),
}));

jest.mock('@/lib/db', () => ({
  db: {
    fosterOffer: {
      findUnique: (...args: unknown[]) => mockFosterOfferFindUnique(...args),
    },
    fosterPlacement: {
      findUnique: (...args: unknown[]) => mockFosterPlacementFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { PATCH as respondToOffer } from '@/app/api/foster/offers/[id]/respond/route';
import { POST as selectOffer } from '@/app/api/foster/offers/[id]/select/route';
import { POST as confirmPlacement } from '@/app/api/foster/placements/[id]/confirm/route';

const authResult = {
  session: { user: { id: 'user-1', name: 'Ana' } },
  error: null,
};

describe('foster routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(authResult);
    mockCreateNotification.mockResolvedValue(undefined);
  });

  it('does not let another user answer a foster offer', async () => {
    mockFosterOfferFindUnique.mockResolvedValue({
      id: 'offer-1',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
      fosterProfile: { userId: 'different-user', status: 'ACTIVE' },
      rescueCase: { id: 'case-1', createdByUserId: 'rescuer-1', status: 'SEARCHING' },
    });

    const response = await respondToOffer(
      { json: async () => ({ response: 'INTERESTED' }) } as Request,
      { params: Promise.resolve({ id: 'offer-1' }) }
    );

    expect(response.status).toBe(403);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('returns a controlled conflict when another selection already claimed the case', async () => {
    const offer = {
      id: 'offer-1',
      rescueCaseId: 'case-1',
      fosterProfileId: 'profile-1',
      status: 'INTERESTED',
      rescueCase: {
        id: 'case-1',
        createdByUserId: 'user-1',
        status: 'INTERESTED',
        requestedDays: 14,
      },
      fosterProfile: { id: 'profile-1', userId: 'host-1', capacity: 1 },
    };
    mockFosterOfferFindUnique.mockResolvedValue(offer);
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      fosterOffer: { findUnique: jest.fn().mockResolvedValue(offer) },
      rescueCase: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    }));

    const response = await selectOffer(
      new Request('http://localhost/api/foster/offers/offer-1/select', { method: 'POST' }),
      { params: Promise.resolve({ id: 'offer-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('ya tiene un hogar');
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('activates a placement only after both handoff confirmations exist', async () => {
    const placement = {
      id: 'placement-1',
      status: 'COORDINATING',
      requesterConfirmedAt: new Date('2026-08-16T12:00:00.000Z'),
      fosterConfirmedAt: null,
      rescueCaseId: 'case-1',
      rescueCase: { id: 'case-1', createdByUserId: 'rescuer-1' },
      fosterProfile: { id: 'profile-1', userId: 'user-1' },
    };
    const coordinatingWithBoth = {
      ...placement,
      fosterConfirmedAt: new Date('2026-08-16T12:05:00.000Z'),
    };
    const activePlacement = { ...coordinatingWithBoth, status: 'ACTIVE' };
    mockFosterPlacementFindUnique.mockResolvedValue(placement);

    const placementUpdateMany = jest.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    const placementFindUnique = jest.fn()
      .mockResolvedValueOnce(coordinatingWithBoth)
      .mockResolvedValueOnce(activePlacement);
    const rescueCaseUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const eventCreate = jest.fn().mockResolvedValue({ id: 'event-1' });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      fosterPlacement: {
        updateMany: placementUpdateMany,
        findUnique: placementFindUnique,
      },
      rescueCase: { updateMany: rescueCaseUpdateMany },
      rescueCaseEvent: { create: eventCreate },
    }));

    const response = await confirmPlacement(
      new Request('http://localhost/api/foster/placements/placement-1/confirm', { method: 'POST' }),
      { params: Promise.resolve({ id: 'placement-1' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.placement.status).toBe('ACTIVE');
    expect(rescueCaseUpdateMany).toHaveBeenCalledWith({
      where: { id: 'case-1', status: 'COORDINATING' },
      data: { status: 'IN_FOSTER' },
    });
    expect(eventCreate).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'rescuer-1', title: 'El tránsito comenzó' })
    );
  });
});
