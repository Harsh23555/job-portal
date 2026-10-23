import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import authorizeRole from "../middlewares/authorizeRole.js";
import {
  getAllJobSources,
  triggerSourceSync,
  getIngestionRuns,
} from "../controllers/admin.controller.js";

const router = express.Router();

// All admin routes require authentication + recruiter/admin role
router.use(isAuthenticated, authorizeRole("recruiter", "admin"));

// GET /api/v1/admin/job-sources → all provider statuses
router.get("/job-sources", getAllJobSources);

// POST /api/v1/admin/job-sources/:source/sync → trigger sync
router.post("/job-sources/:source/sync", triggerSourceSync);

// GET /api/v1/admin/ingestion-runs → paginated run history
router.get("/ingestion-runs", getIngestionRuns);

export default router;
