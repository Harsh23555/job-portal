import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import authorizeRole from "../middlewares/authorizeRole.js";
import {
  searchExternalJobs,
  getExternalJobById,
  triggerSync,
} from "../controllers/externalJob.controller.js";

const router = express.Router();

// Public routes
router.get("/", searchExternalJobs);
router.get("/search", searchExternalJobs);
router.get("/:id", getExternalJobById);

// Sync trigger (recruiter/admin)
router.post("/sync", isAuthenticated, authorizeRole("recruiter", "admin"), triggerSync);

export default router;
