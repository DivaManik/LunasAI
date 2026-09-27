import { createMiddleware } from "hono/factory";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const BAD_CRED_LIMIT = 30;
const BAD_CRED_WINDOW_MS = 60 * 1000;
const CARD_REQUEST_LIMIT = 240;
const CARD_REQUEST_WINDOW_MS = 60 * 1000;

// Store: IP -> { count, resetAt }
const badCredAttempts = new Map<string, RateLimitRecord>();
const cardRequests = new Map<string, RateLimitRecord>();

// 30 bad credential attempts per minute per IP
export function badCredRateLimit() {
  return createMiddleware(async (c, next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "unknown";
    const now = Date.now();
    const record = badCredAttempts.get(ip);

    if (record && now < record.resetAt && record.count >= BAD_CRED_LIMIT) {
      return c.json({ error: "Too many failed attempts. Try again later." }, 429);
    }

    await next();

    // If the response is 401, increment the counter for this IP.
    if (c.res.status === 401) {
      const current = badCredAttempts.get(ip);
      if (!current || now >= current.resetAt) {
        badCredAttempts.set(ip, { count: 1, resetAt: now + BAD_CRED_WINDOW_MS });
      } else {
        current.count++;
      }
    }
  });
}

// 240 requests per minute per cardId. Returns true when the caller is
// rate limited (and increments nothing further in that case).
export function cardRateLimit(cardId: string): boolean {
  const key = `card_${cardId}`;
  const now = Date.now();
  const record = cardRequests.get(key);

  if (record && now < record.resetAt && record.count >= CARD_REQUEST_LIMIT) {
    return true;
  }

  if (!record || now >= record.resetAt) {
    cardRequests.set(key, { count: 1, resetAt: now + CARD_REQUEST_WINDOW_MS });
  } else {
    record.count++;
  }
  return false;
}
