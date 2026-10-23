/** CSRF protection via double-submit cookie and origin validation. */

import crypto from "crypto";

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

// Exempt paths
const EXEMPT_PATH_PREFIXES = [
  "/api/v1/user/auth/github/callback",
  "/health",
];

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Generates cryptographic CSRF token. */
export function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

/** Sets CSRF cookie and response header. */
export function setCsrfCookie(req, res, next) {
  if (!req.cookies) req.cookies = {};

  req.incomingCsrfCookie = req.cookies[CSRF_COOKIE_NAME];

  let token = req.cookies[CSRF_COOKIE_NAME];
  if (!token) {
    token = generateCsrfToken();
    req.cookies[CSRF_COOKIE_NAME] = token;
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  req.csrfToken = token;
  res.setHeader("X-CSRF-Token", token);
  next();
}

/** Validates CSRF token on mutating requests. */
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const isExempt = EXEMPT_PATH_PREFIXES.some((p) => req.path.startsWith(p));
  if (isExempt) return next();

  // Bearer auth exempt
  if (req.headers.authorization?.startsWith("Bearer ")) return next();

  const cookieToken = req.incomingCsrfCookie || req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers?.[CSRF_HEADER_NAME] || req.headers?.["x-csrf-token"];

  // Double-submit token check
  if (cookieToken && headerToken) {
    try {
      const cookieBuf = Buffer.from(cookieToken, "hex");
      const headerBuf = Buffer.from(headerToken, "hex");
      if (cookieBuf.length === headerBuf.length && crypto.timingSafeEqual(cookieBuf, headerBuf)) {
        return next();
      }
    } catch {
      // Fall through on parse error
    }
  }

  // Origin verification
  let requestOrigin = req.headers.origin;
  if (!requestOrigin && req.headers.referer) {
    try { requestOrigin = new URL(req.headers.referer).origin; } catch { /* ignore */ }
  }

  const defaultOrigins = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
  ];
  const envOrigins = (process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  const isDevOrigin =
    process.env.NODE_ENV !== "production" &&
    requestOrigin &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);

  if (requestOrigin && (allowedOrigins.includes(requestOrigin) || isDevOrigin)) return next();

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ success: false, message: "CSRF token missing. Please refresh the page and try again." });
  }

  return res.status(403).json({ success: false, message: "CSRF token mismatch. Please refresh the page and try again." });
}
