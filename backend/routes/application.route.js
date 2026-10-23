import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import authorizeRole from "../middlewares/authorizeRole.js";
import {
  applyJob,
  getApplicants,
  getAppliedJobs,
  updateStatus,
  getRecruiterAllApplicants,
  getApplicationResume,
} from "../controllers/application.controller.js";

const router = express.Router();

// Student routes
router.route("/apply/:id").post(isAuthenticated, authorizeRole("student"), applyJob);
router.route("/apply/:id").get(isAuthenticated, authorizeRole("student"), applyJob);
router.route("/get").get(isAuthenticated, getAppliedJobs);

// Recruiter routes
router.route("/recruiter/all").get(isAuthenticated, authorizeRole("recruiter", "admin"), getRecruiterAllApplicants);
router.route("/:id/applicants").get(isAuthenticated, authorizeRole("recruiter", "admin"), getApplicants);
router.route("/status/:id/update").post(isAuthenticated, authorizeRole("recruiter", "admin"), updateStatus);

// Resume access
router.route("/:id/resume").get(isAuthenticated, getApplicationResume);

export default router;
