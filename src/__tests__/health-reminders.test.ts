const mockFindMany = jest.fn();
const mockCreateNotification = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    petHealthRecord: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

import { sendHealthReminders } from '@/lib/server/health-reminders';

describe('sendHealthReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNotification.mockResolvedValue({ id: 'notification-1' });
  });

  it('avisa al dueño los registros pendientes de los próximos días sin duplicar', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'rec-1',
        name: 'Antirrábica',
        dueDate: new Date('2026-09-27T00:00:00.000Z'),
        pet: { id: 'pet-1', name: 'Luna', owner: { userId: 'user-1' } },
      },
    ]);

    const result = await sendHealthReminders(new Date('2026-09-26T12:00:00.000Z'));

    const query = mockFindMany.mock.calls[0][0];
    expect(query.where.completedAt).toBeNull();
    expect(query.where.dueDate.gte.toISOString()).toBe('2026-09-26T00:00:00.000Z');
    expect(query.where.dueDate.lt.toISOString()).toBe('2026-09-30T00:00:00.000Z');

    expect(mockCreateNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      actorId: null,
      title: 'Recordatorio de salud de Luna',
      body: 'Antirrábica vence mañana.',
      link: '/pets/pet-1',
      dedupeKey: 'health-reminder:rec-1:2026-09-27',
    }));
    expect(result).toEqual({ candidates: 1, sent: 1 });
  });

  it('no cuenta los avisos ya enviados u omitidos por preferencia', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'rec-2',
        name: 'Pipeta',
        dueDate: new Date('2026-09-26T00:00:00.000Z'),
        pet: { id: 'pet-2', name: 'Toto', owner: { userId: 'user-2' } },
      },
    ]);
    mockCreateNotification.mockResolvedValue(null);

    const result = await sendHealthReminders(new Date('2026-09-26T12:00:00.000Z'));

    expect(mockCreateNotification.mock.calls[0][0].body).toBe('Pipeta vence hoy.');
    expect(result).toEqual({ candidates: 1, sent: 0 });
  });
});
