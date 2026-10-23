import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import authorizeRole from "../middlewares/authorizeRole.js";
import {
  searchExternalJobs,
  getExternalJobById,
  triggerSync,
} from "../controllers/externalJob.controller.js";
import {
  aiSearch,
  matchResume,
  getSourceStatuses,
  getAdminSourceStatuses,
} from "../controllers/ragSearch.controller.js";
import {
  applyToExternalJob,
  previewCoverLetter,
  getMyExternalApplications,
  checkExternalApplyStatus,
} from "../controllers/externalJobApply.controller.js";

const router = express.Router();

// Public routes
router.get("/", searchExternalJobs);
router.get("/search", searchExternalJobs);

// AI Search (public — requires no auth, but rate-limited by MongoDB)
router.post("/ai-search", aiSearch);

// Public source status (no termsNote)
router.get("/sources", getSourceStatuses);

// Admin source status (with termsNote, recruiter/admin only)
router.get("/admin/sources", isAuthenticated, authorizeRole("recruiter", "admin"), getAdminSourceStatuses);

// Resume-to-job matching (requires auth)
router.post("/match-resume", isAuthenticated, matchResume);

// Sync trigger (recruiter/admin)
router.post("/sync", isAuthenticated, authorizeRole("recruiter", "admin"), triggerSync);

// ── In-App Apply Routes (authenticated students) ──────────────────────────────
// My external applications list
router.get("/my-applications", isAuthenticated, authorizeRole("student"), getMyExternalApplications);

// Job apply status check
router.get("/:id/apply-status", isAuthenticated, checkExternalApplyStatus);

// AI cover letter preview (before submitting)
router.post("/:id/cover-letter-preview", isAuthenticated, previewCoverLetter);

// Submit in-app application
router.post("/:id/apply", isAuthenticated, authorizeRole("student"), applyToExternalJob);

// Job detail — must be last to avoid catching /sources, /ai-search, etc.
router.get("/:id", getExternalJobById);

export default router;

