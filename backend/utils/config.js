/** App configuration and startup environment validation. */

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

/** Resolves JWT secret with production validation. */
function resolveJwtSecret() {
  const secret = process.env.SECRET_KEY || process.env.JWT_SECRET;

  if (!secret || secret.trim().length === 0) {
    if (IS_PRODUCTION) {
      console.error("[CONFIG FATAL] SECRET_KEY / JWT_SECRET is required in production. Set a strong random secret.");
      process.exit(1);
    }
    console.warn("[CONFIG WARNING] SECRET_KEY is not set. Using dev-only placeholder. Set it in .env before deploying.");
    return "__DEV_ONLY_PLACEHOLDER__DO_NOT_USE_IN_PRODUCTION__";
  }

  if (IS_PRODUCTION && secret.trim().length < 32) {
    console.error("[CONFIG FATAL] SECRET_KEY must be at least 32 characters in production.");
    process.exit(1);
  }

  return secret.trim();
}

export const config = {
  nodeEnv: NODE_ENV,
  isProduction: IS_PRODUCTION,
  port: parseInt(process.env.PORT, 10) || 8000,
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  githubClientId: process.env.GITHUB_CLIENT_ID || "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  githubRedirectUri: process.env.GITHUB_REDIRECT_URI || "http://localhost:8000/api/v1/user/auth/github/callback",
  emailFrom: process.env.EMAIL_FROM || "noreply@jobsphere.local",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
};
