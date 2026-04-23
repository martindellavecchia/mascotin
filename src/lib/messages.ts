export const DEFAULT_MESSAGE_PAGE_SIZE = 50;
export const MAX_MESSAGE_PAGE_SIZE = 50;

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function clampMessageLimit(rawLimit?: string | null): number {
  const parsed = Number.parseInt(rawLimit || '', 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MESSAGE_PAGE_SIZE;
  }

  return Math.min(parsed, MAX_MESSAGE_PAGE_SIZE);
}

export function parseMessageCursor(rawCursor?: string | null): Date | null {
  if (!rawCursor) return null;

  const parsed = new Date(rawCursor);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildMessagePage<T extends { createdAt: Date | string }>(
  messages: T[],
  options: {
    limit: number;
    incremental: boolean;
  }
): {
  messages: T[];
  latestCursor: string | null;
  hasMoreBefore: boolean;
} {
  const hasMoreBefore = !options.incremental && messages.length > options.limit;
  const trimmed = hasMoreBefore ? messages.slice(0, options.limit) : messages;
  const ordered = options.incremental ? trimmed : [...trimmed].reverse();
  const latestMessage = ordered[ordered.length - 1];

  return {
    messages: ordered,
    latestCursor: latestMessage ? toIsoString(latestMessage.createdAt) : null,
    hasMoreBefore,
  };
}

export function mergeMessagesById<T extends { id: string; createdAt: string }>(
  current: T[],
  incoming: T[]
): T[] {
  const merged = new Map<string, T>();

  for (const message of current) {
    merged.set(message.id, message);
  }

  for (const message of incoming) {
    const previous = merged.get(message.id);
    merged.set(message.id, previous ? { ...previous, ...message } : message);
  }

  return [...merged.values()].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
