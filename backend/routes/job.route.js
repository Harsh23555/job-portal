import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import authorizeRole from "../middlewares/authorizeRole.js";
import { getAdminJobs, getAllJob, getJobById, postJob } from "../controllers/job.controller.js";

const router = express.Router();

router.route("/post").post(isAuthenticated, authorizeRole("recruiter", "admin"), postJob);
router.route("/get").get(getAllJob);
router.route("/getadminjobs").get(isAuthenticated, authorizeRole("recruiter", "admin"), getAdminJobs);
router.route("/get/:id").get(getJobById);

export default router;