const mockRequireAuth = jest.fn();
const mockRateLimit = jest.fn();
const mockExpressRescueInterest = jest.fn();

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

jest.mock('@/lib/rate-limit', () => ({
  RATE_LIMITS: { rescueContact: { maxRequests: 10, windowMs: 600000 } },
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

jest.mock('@/lib/server/rescue-contact', () => ({
  RescueContactError: class RescueContactError extends Error {
    constructor(message: string, readonly status: number, readonly code: string) { super(message); }
  },
  expressRescueInterest: (...args: unknown[]) => mockExpressRescueInterest(...args),
}));

import { POST } from '@/app/api/rescue-cases/[id]/interest/route';
import { RescueContactError } from '@/lib/server/rescue-contact';

describe('POST /api/rescue-cases/[id]/interest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ session: { user: { id: 'helper-1' } }, error: null });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 9, retryAfterMs: 0 });
  });

  it('keeps an empty legacy request compatible with FOSTER', async () => {
    mockExpressRescueInterest.mockResolvedValue({
      kind: 'FOSTER', offerId: 'offer-1', status: 'INTERESTED', expiresAt: new Date('2026-08-18T12:00:00.000Z'),
    });
    const response = await POST(
      { json: async () => { throw new Error('empty'); } } as unknown as Request,
      { params: Promise.resolve({ id: 'case-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, kind: 'FOSTER', offerId: 'offer-1', status: 'INTERESTED' });
    expect(mockExpressRescueInterest).toHaveBeenCalledWith('case-1', 'helper-1', { needType: 'FOSTER' });
  });

  it('passes a trimmed operational need and note to the unified service', async () => {
    mockExpressRescueInterest.mockResolvedValue({
      kind: 'VOLUNTEER', offerId: 'volunteer-offer-1', status: 'INTERESTED', expiresAt: new Date(),
    });
    const response = await POST(
      { json: async () => ({ needType: 'TRANSPORT', message: '  Puedo hacer el traslado  ' }) } as Request,
      { params: Promise.resolve({ id: 'case-1' }) },
    );

    expect(response.status).toBe(200);
    expect(mockExpressRescueInterest).toHaveBeenCalledWith('case-1', 'helper-1', {
      needType: 'TRANSPORT', message: 'Puedo hacer el traslado',
    });
  });

  it('returns stable functional eligibility codes', async () => {
    mockExpressRescueInterest.mockRejectedValue(new RescueContactError('Creá tu perfil', 403, 'PROFILE_REQUIRED'));
    const response = await POST(
      { json: async () => ({ needType: 'FOSTER' }) } as Request,
      { params: Promise.resolve({ id: 'case-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ success: false, error: 'Creá tu perfil', code: 'PROFILE_REQUIRED' });
  });

  it('enforces the distributed contact limiter before opening an offer', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 30000 });
    const response = await POST(
      { json: async () => ({ needType: 'FOSTER' }) } as Request,
      { params: Promise.resolve({ id: 'case-1' }) },
    );

    expect(response.status).toBe(429);
    expect(mockExpressRescueInterest).not.toHaveBeenCalled();
  });
});
