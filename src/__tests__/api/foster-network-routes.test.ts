const mockRequireAuth = jest.fn();
const mockPlacementFindUnique = jest.fn();
const mockStartFosterAdoption = jest.fn();
const mockPublishRescueCase = jest.fn();
const mockCreateNotification = jest.fn();
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

jest.mock('@/lib/db', () => ({
  db: {
    fosterPlacement: { findUnique: (...args: unknown[]) => mockPlacementFindUnique(...args) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

jest.mock('@/lib/server/foster-adoption', () => ({
  FosterAdoptionError: class FosterAdoptionError extends Error {
    constructor(message: string, readonly status: number) { super(message); }
  },
  startFosterAdoption: (...args: unknown[]) => mockStartFosterAdoption(...args),
}));

jest.mock('@/lib/server/foster-network', () => ({
  FosterNetworkError: class FosterNetworkError extends Error {
    constructor(message: string, readonly status: number) { super(message); }
  },
  publishRescueCase: (...args: unknown[]) => mockPublishRescueCase(...args),
  unpublishRescueCase: jest.fn(),
}));

import { POST as completePlacement } from '@/app/api/foster/placements/[id]/complete/route';
import { PUT as publishCase } from '@/app/api/rescue-cases/[id]/publication/route';

describe('foster network routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ session: { user: { id: 'foster-1' } }, error: null });
    mockCreateNotification.mockResolvedValue(undefined);
  });

  it('keeps the placement active in capacity accounting when adoption starts', async () => {
    mockPlacementFindUnique.mockResolvedValue({
      id: 'placement-1',
      status: 'ACTIVE',
      rescueCaseId: 'case-1',
      fosterProfileId: 'profile-1',
      rescueCase: { createdByUserId: 'rescuer-1' },
      fosterProfile: { userId: 'foster-1' },
    });
    mockStartFosterAdoption.mockResolvedValue({ id: 'draft-1' });

    const response = await completePlacement(
      { json: async () => ({ outcome: 'NEEDS_ADOPTION' }) } as Request,
      { params: Promise.resolve({ id: 'placement-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.caseStatus).toBe('NEEDS_ADOPTION');
    expect(mockStartFosterAdoption).toHaveBeenCalledWith('placement-1', 'foster-1');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('rejects an unsafe community publication before reaching the service', async () => {
    const response = await publishCase(
      { json: async () => ({ summary: 'Corto', publicZone: '', imageIndex: 0 }) } as Request,
      { params: Promise.resolve({ id: 'case-1' }) },
    );

    expect(response.status).toBe(400);
    expect(mockPublishRescueCase).not.toHaveBeenCalled();
  });
});
