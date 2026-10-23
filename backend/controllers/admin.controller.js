/**
 * Admin Controller — manages job source status, ingestion run history, and HR verification.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { IngestionRun } from "../models/ingestionRun.model.js";
import { jobProviderManager } from "../services/jobProviderManager.js";
import { syncExternalJobs } from "../services/externalJobSync.js";
import { config } from "../utils/config.js";
import { sanitizeString } from "../utils/validator.js";

// ─── External Job Sources & Ingestion Runs ────────────────────────────────────

/**
 * GET /api/v1/admin/job-sources
 * Returns all provider statuses with full details.
 */
export async function getAllJobSources(req, res, next) {
  try {
    const providers = jobProviderManager.getAllProviders();
    const sources = providers.map((p) =>
      typeof p.getSourceStatus === "function"
        ? p.getSourceStatus()
        : {
            name: p.providerName,
            displayName: p.providerName,
            status: p.isConfigured() ? "active" : "unconfigured",
            configured: p.isConfigured(),
            reason: null,
            termsNote: null,
          }
    );
    return res.status(200).json({ success: true, sources });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/job-sources/:source/sync
 * Triggers an immediate force-sync for all or a specific provider.
 * Body: { force?: boolean }
 */
export async function triggerSourceSync(req, res, next) {
  try {
    const { source } = req.params;
    const force = req.body?.force !== false; // default true

    const providers = jobProviderManager.getAllProviders();
    const providerNames = providers.map((p) => p.providerName);

    if (source !== "all" && !providerNames.includes(source)) {
      return res.status(404).json({
        success: false,
        message: `Unknown provider: "${source}". Available: ${providerNames.join(", ")}.`,
      });
    }

    // Run sync in background — don't await
    syncExternalJobs({ force, triggeredBy: "manual" }).catch((err) =>
      console.error("[AdminController] Manual sync error:", err.message)
    );

    return res.status(202).json({
      success: true,
      message: `Sync triggered for ${source === "all" ? "all providers" : source}. Check ingestion-runs for results.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/ingestion-runs
 * Returns paginated ingestion run history.
 */
export async function getIngestionRuns(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      IngestionRun.find({})
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IngestionRun.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      runs,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Admin JWT helpers ────────────────────────────────────────────────────────

function signAdminToken() {
  return jwt.sign(
    { adminId: "admin", role: "admin", email: config.adminEmail },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function setAdminCookie(res, token) {
  res.cookie("admin_token", token, {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/",
  });
}

// ─── Admin Authentication ─────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/login
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    if (!config.adminEmail || !config.adminPasswordHash) {
      console.error("[adminLogin] Admin credentials not configured in environment.");
      return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail !== config.adminEmail) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }

    const isPasswordValid = await bcrypt.compare(password, config.adminPasswordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid admin credentials." });
    }

    const token = signAdminToken();
    setAdminCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Admin login successful.",
      admin: { email: config.adminEmail, role: "admin" },
    });
  } catch (error) {
    console.error("[adminLogin error]:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * POST /api/v1/admin/logout
 */
export const adminLogout = async (req, res) => {
  try {
    return res
      .status(200)
      .cookie("admin_token", "", { maxAge: 0, httpOnly: true, sameSite: "lax", secure: config.isProduction, path: "/" })
      .json({ success: true, message: "Admin logged out successfully." });
  } catch (error) {
    console.error("[adminLogout error]:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * GET /api/v1/admin/me
 */
export const adminMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    admin: { email: req.adminEmail, role: "admin" },
  });
};

// ─── Admin Dashboard Statistics ───────────────────────────────────────────────

/**
 * GET /api/v1/admin/stats
 */
export const getAdminStats = async (req, res) => {
  try {
    const [
      totalHR,
      pendingHR,
      approvedHR,
      rejectedHR,
      suspendedHR,
      totalJobs,
    ] = await Promise.all([
      User.countDocuments({ role: "recruiter" }),
      User.countDocuments({
        role: "recruiter",
        $or: [
          { verificationStatus: "pending" },
          { verificationStatus: { $exists: false } },
          { verificationStatus: null },
        ],
      }),
      User.countDocuments({ role: "recruiter", verificationStatus: "approved" }),
      User.countDocuments({ role: "recruiter", verificationStatus: "rejected" }),
      User.countDocuments({ role: "recruiter", verificationStatus: "suspended" }),
      Job.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalHR,
        pendingHR,
        approvedHR,
        rejectedHR,
        suspendedHR,
        totalJobs,
      },
    });
  } catch (error) {
    console.error("[getAdminStats error]:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─── HR Management ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/hr
 */
export const getHRList = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const status = req.query.status;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const filter = { role: "recruiter" };

    if (status && ["pending", "approved", "rejected", "suspended"].includes(status.toLowerCase())) {
      filter.verificationStatus = status.toLowerCase();
    }

    if (search) {
      filter.$or = [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "companyDetails.companyName": { $regex: search, $options: "i" } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password -resetPasswordToken -resetPasswordExpires")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      hrList: users.map((u) => ({
        _id: u._id,
        fullname: u.fullname,
        email: u.email,
        phoneNumber: u.phoneNumber,
        designation: u.designation,
        companyDetails: u.companyDetails,
        linkedinUrl: u.linkedinUrl,
        hrAccessReason: u.hrAccessReason,
        verificationStatus: u.verificationStatus || "pending",
        rejectionReason: u.rejectionReason,
        suspensionReason: u.suspensionReason,
        verificationReviewedAt: u.verificationReviewedAt,
        verificationReviewedBy: u.verificationReviewedBy,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("[getHRList error]:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * GET /api/v1/admin/hr/:id
 */
export const getHRDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid HR user ID." });
    }

    const user = await User.findById(id).select("-password -resetPasswordToken -resetPasswordExpires").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "HR user not found." });
    }

    if (user.role !== "recruiter") {
      return res.status(400).json({ success: false, message: "User is not an HR/recruiter account." });
    }

    const jobCount = await Job.countDocuments({ created_by: id });

    return res.status(200).json({
      success: true,
      hr: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        designation: user.designation,
        companyDetails: user.companyDetails,
        linkedinUrl: user.linkedinUrl,
        hrAccessReason: user.hrAccessReason,
        verificationStatus: user.verificationStatus || "pending",
        rejectionReason: user.rejectionReason,
        suspensionReason: user.suspensionReason,
        verificationReviewedAt: user.verificationReviewedAt,
        verificationReviewedBy: user.verificationReviewedBy,
        agreedToTerms: user.agreedToTerms,
        profile: user.profile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        jobCount,
      },
    });
  } catch (error) {
    console.error("[getHRDetails error]:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ─── Status Transition Helpers ────────────────────────────────────────────────

const VALID_TRANSITIONS = {
  approve: ["pending"],
  reject: ["pending"],
  suspend: ["approved"],
  reactivate: ["suspended", "rejected"],
};

async function transitionHRStatus(req, res, action, targetStatus) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid HR user ID." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "HR user not found." });
    }

    if (user.role !== "recruiter") {
      return res.status(400).json({ success: false, message: "User is not an HR/recruiter account." });
    }

    const currentStatus = user.verificationStatus || "pending";
    const allowedFrom = VALID_TRANSITIONS[action];
    if (!allowedFrom || !allowedFrom.includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot ${action} an HR account that is currently "${currentStatus}". Allowed from: [${allowedFrom?.join(", ")}].`,
      });
    }

    user.verificationStatus = targetStatus;
    user.verificationReviewedAt = new Date();
    user.verificationReviewedBy = req.adminEmail || "admin";

    if (action === "reject") {
      user.rejectionReason = reason ? sanitizeString(reason, 1000) : null;
    } else if (action === "suspend") {
      user.suspensionReason = reason ? sanitizeString(reason, 1000) : null;
    } else if (action === "approve") {
      user.rejectionReason = null;
      user.suspensionReason = null;
    } else if (action === "reactivate") {
      user.suspensionReason = null;
      user.rejectionReason = null;
    }

    await user.save();

    console.log(`[Admin] ${action} HR user ${user.email} (${user._id}) by ${req.adminEmail}`);

    return res.status(200).json({
      success: true,
      message: `HR account ${action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "suspend" ? "suspended" : "reactivated"} successfully.`,
      hr: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        verificationStatus: user.verificationStatus,
        verificationReviewedAt: user.verificationReviewedAt,
        verificationReviewedBy: user.verificationReviewedBy,
      },
    });
  } catch (error) {
    console.error(`[${action}HR error]:`, error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
}

/**
 * PATCH /api/v1/admin/hr/:id/approve
 */
export const approveHR = (req, res) => transitionHRStatus(req, res, "approve", "approved");

/**
 * PATCH /api/v1/admin/hr/:id/reject
 */
export const rejectHR = (req, res) => transitionHRStatus(req, res, "reject", "rejected");

/**
 * PATCH /api/v1/admin/hr/:id/suspend
 */
export const suspendHR = (req, res) => transitionHRStatus(req, res, "suspend", "suspended");

/**
 * PATCH /api/v1/admin/hr/:id/reactivate
 */
export const reactivateHR = (req, res) => transitionHRStatus(req, res, "reactivate", "approved");
