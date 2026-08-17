const mockCreateNotification = jest.fn();
const mockRateLimit = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    fosterOffer: { findUnique: jest.fn() },
    volunteerOffer: { findUnique: jest.fn() },
    fosterPlacement: { findUnique: jest.fn() },
    volunteerAssignment: { findUnique: jest.fn() },
    blockedUser: { findFirst: jest.fn() },
    message: { findMany: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

jest.mock('@/lib/rate-limit', () => ({
  RATE_LIMITS: { rescueMessage: { maxRequests: 30, windowMs: 60000 } },
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

import { db } from '@/lib/db';
import {
  getRescueContactMessages,
  RescueContactMessageError,
  sendRescueContactMessage,
} from '@/lib/server/rescue-contact-messages';

const dbMock = db as unknown as {
  fosterOffer: { findUnique: jest.Mock };
  volunteerOffer: { findUnique: jest.Mock };
  blockedUser: { findFirst: jest.Mock };
  message: { findMany: jest.Mock; updateMany: jest.Mock; create: jest.Mock };
};

const fosterOffer = {
  id: 'offer-1', rescueCaseId: 'case-1', status: 'INTERESTED',
  rescueCase: { id: 'case-1', createdByUserId: 'creator-1', location: 'Palermo, CABA' },
  fosterProfile: { userId: 'helper-1' },
  placement: { id: 'placement-1', status: 'COORDINATING' },
};

describe('rescue contact messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbMock.fosterOffer.findUnique.mockResolvedValue(fosterOffer);
    dbMock.blockedUser.findFirst.mockResolvedValue(null);
    dbMock.message.updateMany.mockResolvedValue({ count: 1 });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 29, retryAfterMs: 0 });
    mockCreateNotification.mockResolvedValue(null);
  });

  it('combines offer and legacy placement messages in chronological order', async () => {
    dbMock.message.findMany.mockResolvedValue([
      { id: 'm3', senderId: 'creator-1', content: 'Tres', createdAt: new Date('2026-08-17T10:03:00.000Z') },
      { id: 'm2', senderId: 'helper-1', content: 'Dos', createdAt: new Date('2026-08-17T10:02:00.000Z') },
      { id: 'm1', senderId: 'helper-1', content: 'Uno', createdAt: new Date('2026-08-17T10:01:00.000Z') },
    ]);

    const result = await getRescueContactMessages({ kind: 'FOSTER', offerId: 'offer-1', userId: 'creator-1', limit: 2 });

    expect(result.messages.map((message) => message.id)).toEqual(['m2', 'm3']);
    expect(result.hasMoreBefore).toBe(true);
    expect(result.conversation).toEqual({ status: 'INTERESTED', canWrite: true });
    expect(dbMock.message.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ fosterOfferId: 'offer-1' }, { fosterPlacementId: 'placement-1' }] },
    }));
  });

  it('keeps closed conversations readable but not writable', async () => {
    dbMock.fosterOffer.findUnique.mockResolvedValue({ ...fosterOffer, status: 'CLOSED', placement: null });
    dbMock.message.findMany.mockResolvedValue([]);

    const result = await getRescueContactMessages({ kind: 'FOSTER', offerId: 'offer-1', userId: 'helper-1', limit: 50 });

    expect(result.conversation.canWrite).toBe(false);
    await expect(sendRescueContactMessage({ kind: 'FOSTER', offerId: 'offer-1', userId: 'helper-1', content: 'Hola' }))
      .rejects.toMatchObject<Partial<RescueContactMessageError>>({ status: 409 });
    expect(dbMock.message.create).not.toHaveBeenCalled();
  });

  it('stores new messages on the offer and keeps push metadata private', async () => {
    const created = { id: 'message-1', fosterOfferId: 'offer-1', senderId: 'helper-1', receiverId: 'creator-1', content: 'Mi teléfono es privado', createdAt: new Date() };
    dbMock.message.create.mockResolvedValue(created);

    await expect(sendRescueContactMessage({
      kind: 'FOSTER', offerId: 'offer-1', userId: 'helper-1', userName: 'Ana', content: created.content,
    })).resolves.toEqual(created);

    expect(dbMock.message.create).toHaveBeenCalledWith({ data: expect.objectContaining({ fosterOfferId: 'offer-1', receiverId: 'creator-1' }) });
    expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'MESSAGE',
      link: '/hogares-de-transito/casos/case-1?contact=1&kind=foster&offer=offer-1',
      pushContext: { zone: 'Palermo, CABA', helpType: 'Hogar de tránsito' },
    }));
    const notification = mockCreateNotification.mock.calls[0][0] as Record<string, unknown>;
    expect(JSON.stringify({ title: notification.title, link: notification.link, pushContext: notification.pushContext })).not.toContain(created.content);
  });

  it('enforces the message limiter before writing', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 1000 });

    await expect(sendRescueContactMessage({ kind: 'FOSTER', offerId: 'offer-1', userId: 'helper-1', content: 'Hola' }))
      .rejects.toMatchObject<Partial<RescueContactMessageError>>({ status: 429 });
    expect(dbMock.fosterOffer.findUnique).not.toHaveBeenCalled();
  });
});
