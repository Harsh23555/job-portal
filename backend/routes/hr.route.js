import express from "express";
import { registerHR, getHRProfile, updateHRProfile } from "../controllers/hr.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { rateLimit } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

const hrRegisterLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many HR registration attempts. Please wait and try again.",
});

// HR Registration (public)
router.route("/register").post(hrRegisterLimiter, registerHR);

// HR Profile (authenticated)
router.route("/me").get(isAuthenticated, getHRProfile);
router.route("/me").patch(isAuthenticated, updateHRProfile);

export default router;
