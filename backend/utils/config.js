import dotenv from "dotenv";
dotenv.config();

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

/** Validates admin credentials configuration. */
function resolveAdminConfig() {
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPasswordHash = (process.env.ADMIN_PASSWORD_HASH || "").trim();

  if (IS_PRODUCTION) {
    if (!adminEmail) {
      console.error("[CONFIG FATAL] ADMIN_EMAIL is required in production.");
      process.exit(1);
    }
    if (!adminPasswordHash || !adminPasswordHash.startsWith("$2")) {
      console.error("[CONFIG FATAL] ADMIN_PASSWORD_HASH must be a valid bcrypt hash in production.");
      process.exit(1);
    }
  } else {
    if (!adminEmail) {
      console.warn("[CONFIG WARNING] ADMIN_EMAIL is not set. Admin login will be unavailable.");
    }
    if (!adminPasswordHash) {
      console.warn("[CONFIG WARNING] ADMIN_PASSWORD_HASH is not set. Admin login will be unavailable.");
    }
  }

  return { adminEmail, adminPasswordHash };
}

const { adminEmail, adminPasswordHash } = resolveAdminConfig();

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
  // ─── Embedding / RAG ────────────────────────────────────────────────────────
  embeddingProvider: process.env.EMBEDDING_PROVIDER || "local",
  embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
  embeddingBatchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE, 10) || 20,
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  ragLlmProvider: process.env.RAG_LLM_PROVIDER || "groq",
  ragLlmModel: process.env.RAG_LLM_MODEL || "llama-3.3-70b-versatile",

  // ─── Remotive ───────────────────────────────────────────────────────────────
  remotiveEnabled: process.env.REMOTIVE_ENABLED !== "false",

  // Admin authentication
  adminEmail,
  adminPasswordHash,
};

