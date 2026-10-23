import { User } from "../models/user.model.js";

/**
 * Middleware: Requires the authenticated user to be a recruiter with
 * verificationStatus === "approved". Always checks the DB (not JWT claims)
 * so that suspensions take effect immediately.
 *
 * Must be used AFTER isAuthenticated middleware.
 */
const requireApprovedHR = async (req, res, next) => {
  try {
    const userId = req.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Always fetch fresh status from DB to prevent stale-JWT bypass
    const user = await User.findById(userId).select("role verificationStatus").lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
      });
    }

    if (user.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "This action is restricted to HR/recruiter accounts.",
      });
    }

    if (user.verificationStatus !== "approved") {
      const statusMessages = {
        pending: "Your HR account is pending admin approval. You cannot perform this action until approved.",
        rejected: "Your HR registration has been rejected by an admin. You cannot perform this action.",
        suspended: "Your HR account has been suspended. Please contact the administrator for reactivation.",
      };

      return res.status(403).json({
        success: false,
        message: statusMessages[user.verificationStatus] || "Your HR account is not approved for this action.",
        verificationStatus: user.verificationStatus,
      });
    }

    // Attach fresh status to request for downstream use
    req.verificationStatus = "approved";
    return next();
  } catch (error) {
    console.error("[requireApprovedHR error]:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authorization check.",
    });
  }
};

export default requireApprovedHR;
