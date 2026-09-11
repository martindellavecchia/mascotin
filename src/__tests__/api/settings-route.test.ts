import { GET, PATCH } from '@/app/api/settings/route';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { recordProductEvent } from '@/lib/server/product-events';

jest.mock('next/server', () => ({ NextResponse: {
  json: (body: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200, json: async () => body,
  }),
} }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/server/product-events', () => ({ recordProductEvent: jest.fn() }));
jest.mock('@/lib/db', () => ({ db: {
  user: { findUnique: jest.fn() },
  userSettings: { findUnique: jest.fn(), upsert: jest.fn() },
} }));

describe('settings session lifecycle', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'viewer' } });
    (db.user.findUnique as jest.Mock).mockResolvedValue({ id: 'viewer' });
    (db.userSettings.upsert as jest.Mock).mockResolvedValue({
      userId: 'viewer', matchPetTypes: '[]', matchPetSizes: '[]', entryIntent: 'HELP',
    });
  });

  it('rejects an old session after account deletion without creating settings', async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(db.userSettings.findUnique).not.toHaveBeenCalled();
    expect(db.userSettings.upsert).not.toHaveBeenCalled();
  });

  it('rejects updates from a deleted account without recording product events', async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);
    const request = { json: async () => ({ entryIntent: 'HELP' }) } as Request;
    expect((await PATCH(request)).status).toBe(401);
    expect(db.userSettings.upsert).not.toHaveBeenCalled();
    expect(recordProductEvent).not.toHaveBeenCalled();
  });

  it('creates defaults atomically without overwriting existing preferences', async () => {
    (db.userSettings.findUnique as jest.Mock).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(db.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: 'viewer' }, create: { userId: 'viewer' }, update: {},
    });
    expect(await response.json()).toMatchObject({ settings: { matchPetTypes: [], matchPetSizes: [] } });
  });

  it('keeps intent updates available to an existing account', async () => {
    const request = { json: async () => ({ entryIntent: 'HELP' }) } as Request;
    expect((await PATCH(request)).status).toBe(200);
    expect(recordProductEvent).toHaveBeenCalledWith('viewer', 'intent_selected', 'HELP');
  });
});
