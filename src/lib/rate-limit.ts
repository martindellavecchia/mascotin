interface RateLimitEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 600000);
    if (entry.timestamps.length === 0) {
      memoryStore.delete(key);
    }
  }
}, 300000);

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface UpstashResponse<T> {
  result?: T;
  error?: string;
}

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

function rateLimitInMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key) || { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    };
  }

  entry.timestamps.push(now);
  memoryStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

async function rateLimitWithUpstash(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Upstash Redis no configurado');
  }

  const endpoint = UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const redisKey = `ratelimit:${key}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      'EVAL',
      RATE_LIMIT_LUA,
      '1',
      redisKey,
      String(config.windowMs),
    ]),
    cache: 'no-store',
  });

  const payload = (await response.json()) as UpstashResponse<[number | string, number | string]>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Upstash error ${response.status}`);
  }

  const [currentRaw, ttlRaw] = Array.isArray(payload.result)
    ? payload.result
    : [0, config.windowMs];

  const current = Number(currentRaw) || 0;
  const ttl = Math.max(Number(ttlRaw) || 0, 0);
  const allowed = current <= config.maxRequests;

  return {
    allowed,
    remaining: Math.max(config.maxRequests - current, 0),
    retryAfterMs: allowed ? 0 : ttl,
  };
}

export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const hasUpstash = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

  if (hasUpstash) {
    try {
      return await rateLimitWithUpstash(key, config);
    } catch (error) {
      console.error('Rate limit Redis fallback to memory:', error);
    }
  }

  return rateLimitInMemory(key, config);
}

// Pre-configured rate limiters for common use cases
export const RATE_LIMITS = {
  /** Auth endpoints: 10 attempts per minute */
  auth: { maxRequests: 10, windowMs: 60000 },
  /** Registration: 5 per 10 minutes */
  register: { maxRequests: 5, windowMs: 600000 },
  /** Swipe: 60 per minute */
  swipe: { maxRequests: 60, windowMs: 60000 },
  /** Upload: 5 per minute */
  upload: { maxRequests: 5, windowMs: 60000 },
  /** Email check: 10 per minute */
  emailCheck: { maxRequests: 10, windowMs: 60000 },
} as const;
