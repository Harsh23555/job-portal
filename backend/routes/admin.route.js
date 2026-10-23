import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import authorizeRole from "../middlewares/authorizeRole.js";
import isAdminAuthenticated from "../middlewares/isAdminAuthenticated.js";
import { rateLimit } from "../middlewares/rateLimitMiddleware.js";
import {
  getAllJobSources,
  triggerSourceSync,
  getIngestionRuns,
  adminLogin,
  adminLogout,
  adminMe,
  getAdminStats,
  getHRList,
  getHRDetails,
  approveHR,
  rejectHR,
  suspendHR,
  reactivateHR,
} from "../controllers/admin.controller.js";

const router = express.Router();

const adminLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many admin login attempts. Please wait and try again.",
});

// ─── External Job Sources & Ingestion Runs (Recruiter / Admin auth) ───────────
router.get("/job-sources", isAuthenticated, authorizeRole("recruiter", "admin"), getAllJobSources);
router.post("/job-sources/:source/sync", isAuthenticated, authorizeRole("recruiter", "admin"), triggerSourceSync);
router.get("/ingestion-runs", isAuthenticated, authorizeRole("recruiter", "admin"), getIngestionRuns);

// ─── Admin Authentication ─────────────────────────────────────────────────────
router.route("/login").post(adminLoginLimiter, adminLogin);
router.route("/logout").post(isAdminAuthenticated, adminLogout);
router.route("/me").get(isAdminAuthenticated, adminMe);

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.route("/stats").get(isAdminAuthenticated, getAdminStats);

// ─── HR Management ────────────────────────────────────────────────────────────
router.route("/hr").get(isAdminAuthenticated, getHRList);
router.route("/hr/:id").get(isAdminAuthenticated, getHRDetails);
router.route("/hr/:id/approve").patch(isAdminAuthenticated, approveHR);
router.route("/hr/:id/reject").patch(isAdminAuthenticated, rejectHR);
router.route("/hr/:id/suspend").patch(isAdminAuthenticated, suspendHR);
router.route("/hr/:id/reactivate").patch(isAdminAuthenticated, reactivateHR);

export default router;
