import { RateLimitRecord } from "../models/rateLimit.model.js";

// Provider quotas
const PROVIDER_LIMITS = {
  adzuna: {
    minute: 25,
    day: 250,
    week: 1000,
    month: 2500,
  },
  jooble: {
    minute: 10,
    day: 100,
    week: 500,
    month: 500,
  },
};

// In-memory sliding window for minute quota
const minuteBuckets = new Map();

function cleanMinuteBucket(provider) {
  const now = Date.now();
  const bucket = minuteBuckets.get(provider) || [];
  const valid = bucket.filter((ts) => now - ts < 60_000);
  minuteBuckets.set(provider, valid);
  return valid.length;
}

function getDayKey(provider, date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${provider}:day:${yyyy}-${mm}-${dd}`;
}

function getWeekKey(provider, date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const firstDayOfYear = new Date(Date.UTC(yyyy, 0, 1));
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
  return `${provider}:week:${yyyy}-W${weekNum}`;
}

function getMonthKey(provider, date = new Date()) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${provider}:month:${yyyy}-${mm}`;
}

export class RateLimiter {
  /** Checks if request is allowed for provider. */
  static async checkLimit(provider = "adzuna") {
    const limits = PROVIDER_LIMITS[provider] || PROVIDER_LIMITS.adzuna;

    // Minute check
    const minuteHits = cleanMinuteBucket(provider);
    if (minuteHits >= limits.minute) {
      console.warn(`[RateLimiter] [${provider}] Minute limit reached (${minuteHits}/${limits.minute}).`);
      return {
        allowed: false,
        reason: `Rate limit: max ${limits.minute} requests per minute reached for ${provider}.`,
        currentUsage: { minute: minuteHits },
      };
    }

    // Daily check via MongoDB
    try {
      const dayKey = getDayKey(provider);
      const dayRecord = await RateLimitRecord.findOne({ periodKey: dayKey }).lean();
      const dayHits = dayRecord ? dayRecord.count : 0;

      if (dayHits >= limits.day) {
        console.warn(`[RateLimiter] [${provider}] Daily quota reached (${dayHits}/${limits.day}).`);
        return {
          allowed: false,
          reason: `Daily quota limit (${limits.day} req/day) reached for ${provider}.`,
          currentUsage: { minute: minuteHits, day: dayHits },
        };
      }

      return {
        allowed: true,
        currentUsage: { minute: minuteHits, day: dayHits },
      };
    } catch (err) {
      return {
        allowed: true,
        currentUsage: { minute: minuteHits },
      };
    }
  }

  /** Records API request hit. */
  static async recordHit(provider = "adzuna") {
    const bucket = minuteBuckets.get(provider) || [];
    bucket.push(Date.now());
    minuteBuckets.set(provider, bucket);

    try {
      const now = new Date();
      const dayKey = getDayKey(provider, now);
      const weekKey = getWeekKey(provider, now);
      const monthKey = getMonthKey(provider, now);

      const dayExpires = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const weekExpires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const monthExpires = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      await Promise.allSettled([
        RateLimitRecord.updateOne(
          { periodKey: dayKey },
          { $inc: { count: 1 }, $setOnInsert: { provider, expiresAt: dayExpires } },
          { upsert: true }
        ),
        RateLimitRecord.updateOne(
          { periodKey: weekKey },
          { $inc: { count: 1 }, $setOnInsert: { provider, expiresAt: weekExpires } },
          { upsert: true }
        ),
        RateLimitRecord.updateOne(
          { periodKey: monthKey },
          { $inc: { count: 1 }, $setOnInsert: { provider, expiresAt: monthExpires } },
          { upsert: true }
        ),
      ]);
    } catch (err) {
      console.warn(`[RateLimiter] Error persisting rate limit hit for ${provider}:`, err.message);
    }
  }

  /** Resets minute bucket for testing. */
  static _resetMinuteBucket(provider = "adzuna") {
    minuteBuckets.set(provider, []);
  }
}
