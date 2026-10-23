import jwt from "jsonwebtoken";
import { config } from "../utils/config.js";

/**
 * Middleware: Verifies that the request comes from an authenticated admin.
 * Admin tokens carry { adminId: "admin", role: "admin" }.
 * This middleware does NOT share the User model — admin is env-configured only.
 */
const isAdminAuthenticated = (req, res, next) => {
  try {
    // Try admin-specific cookie first, then shared cookie, then header
    let token = req.cookies?.admin_token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required. Please log in.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: jwtErr.name === "TokenExpiredError"
          ? "Admin session expired. Please log in again."
          : "Invalid admin authentication token.",
      });
    }

    // Admin tokens are issued with role === "admin" and adminId === "admin"
    if (decoded.role !== "admin" || decoded.adminId !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    req.adminEmail = decoded.email;
    req.isAdmin = true;
    return next();
  } catch (error) {
    console.error("[isAdminAuthenticated error]:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during admin authentication.",
    });
  }
};

export default isAdminAuthenticated;
