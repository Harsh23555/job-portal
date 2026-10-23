import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import connectDB from "./utils/db.js";
import { config } from "./utils/config.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { setCsrfCookie, csrfProtection } from "./middlewares/csrf.js";
import userRoute from "./routes/user.routes.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";
import externalJobRoute from "./routes/externalJob.route.js";
import savedJobRoute from "./routes/savedJob.route.js";
import { scheduleSyncLoop } from "./services/externalJobSync.js";

dotenv.config({});

const app = express();

// Security headers
app.use((req, res, next) => {
  const reqId = req.headers["x-request-id"] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader("X-Request-Id", reqId);

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content security policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://accounts.google.com https://apis.google.com 'unsafe-inline'",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://api.groq.com",
    "frame-src https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
  res.setHeader("Content-Security-Policy", csp);

  next();
});

// Parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// CORS configuration
const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];
const envOrigins = config.clientOrigin
  ? config.clientOrigin.split(",").map((o) => o.trim())
  : [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (config.nodeEnv !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  exposedHeaders: ["X-CSRF-Token"],
};
app.use(cors(corsOptions));

// CSRF protection
app.use(setCsrfCookie);
app.use(csrfProtection);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// CSRF token bootstrap
app.get("/api/v1/user/csrf-token", (req, res) => {
  const token = req.csrfToken || req.cookies?.["csrf_token"];
  return res.status(200).json({ success: true, csrfToken: token });
});

// API Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);
app.use("/api/v1/external-jobs", externalJobRoute);
app.use("/api/jobs", externalJobRoute);
app.use("/api/v1/saved-jobs", savedJobRoute);

// 404 handler for API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
if (process.env.NODE_ENV !== "test") {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at port ${PORT}`);
      // Background external job synchronization
      scheduleSyncLoop();
    });
  });
}

export default app;
