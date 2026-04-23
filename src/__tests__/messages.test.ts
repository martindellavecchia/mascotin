import {
  buildMessagePage,
  clampMessageLimit,
  mergeMessagesById,
  parseMessageCursor,
} from '@/lib/messages';

describe('messages helpers', () => {
  it('caps the page size to 50 and falls back for invalid values', () => {
    expect(clampMessageLimit('200')).toBe(50);
    expect(clampMessageLimit('0')).toBe(50);
    expect(clampMessageLimit('10')).toBe(10);
    expect(clampMessageLimit(undefined)).toBe(50);
  });

  it('parses valid cursors and rejects invalid ones', () => {
    expect(parseMessageCursor('2026-04-22T10:00:00.000Z')?.toISOString()).toBe(
      '2026-04-22T10:00:00.000Z'
    );
    expect(parseMessageCursor('not-a-date')).toBeNull();
  });

  it('returns the latest page in ascending order for initial loads', () => {
    const page = buildMessagePage(
      [
        { id: 'm3', createdAt: '2026-04-22T10:03:00.000Z' },
        { id: 'm2', createdAt: '2026-04-22T10:02:00.000Z' },
        { id: 'm1', createdAt: '2026-04-22T10:01:00.000Z' },
      ],
      { limit: 2, incremental: false }
    );

    expect(page.messages.map((message) => message.id)).toEqual(['m2', 'm3']);
    expect(page.latestCursor).toBe('2026-04-22T10:03:00.000Z');
    expect(page.hasMoreBefore).toBe(true);
  });

  it('preserves ascending order for incremental pages', () => {
    const page = buildMessagePage(
      [
        { id: 'm4', createdAt: '2026-04-22T10:04:00.000Z' },
        { id: 'm5', createdAt: '2026-04-22T10:05:00.000Z' },
      ],
      { limit: 50, incremental: true }
    );

    expect(page.messages.map((message) => message.id)).toEqual(['m4', 'm5']);
    expect(page.hasMoreBefore).toBe(false);
  });

  it('merges messages by id without duplicating entries', () => {
    const merged = mergeMessagesById(
      [
        { id: 'm1', content: 'hola', createdAt: '2026-04-22T10:01:00.000Z' },
        { id: 'm2', content: 'chau', createdAt: '2026-04-22T10:02:00.000Z' },
      ],
      [
        { id: 'm2', content: 'chau editado', createdAt: '2026-04-22T10:02:00.000Z' },
        { id: 'm3', content: 'nuevo', createdAt: '2026-04-22T10:03:00.000Z' },
      ]
    );

    expect(merged).toEqual([
      { id: 'm1', content: 'hola', createdAt: '2026-04-22T10:01:00.000Z' },
      { id: 'm2', content: 'chau editado', createdAt: '2026-04-22T10:02:00.000Z' },
      { id: 'm3', content: 'nuevo', createdAt: '2026-04-22T10:03:00.000Z' },
    ]);
  });
});
