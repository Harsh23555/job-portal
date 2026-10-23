/** In-memory sliding-window rate limiter middleware. */
export const rateLimit = ({ windowMs = 60 * 1000, max = 15, message = "Too many requests. Please try again later." } = {}) => {
  const hits = new Map();

  // Purge expired buckets
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now - record.startTime > windowMs * 2) hits.delete(ip);
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown_ip";
    const now = Date.now();

    let record = hits.get(clientIp);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      hits.set(clientIp, record);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", max - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({ success: false, message, retryAfterSeconds });
    }

    return next();
  };
};

export default rateLimit;
