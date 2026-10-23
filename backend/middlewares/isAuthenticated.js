import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { config } from "../utils/config.js";

/** Verifies JWT from cookie or Authorization header. */
const isAuthenticated = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Support Bearer token
    const authHeader = req.headers.authorization;
    if (!token && authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // Support x-access-token
    if (!token && req.headers["x-access-token"]) {
      token = req.headers["x-access-token"];
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication required. Please log in.", success: false });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (jwtErr) {
      return res.status(401).json({
        message: jwtErr.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid authentication token.",
        success: false,
      });
    }

    if (!decoded?.userId) {
      return res.status(401).json({ message: "Invalid token payload.", success: false });
    }

    // Skip DB lookup when token has embedded claims
    if (decoded.role && decoded.email) {
      req.id = String(decoded.userId);
      req.user = { _id: decoded.userId, role: decoded.role, email: decoded.email };
      return next();
    }

    // Fallback DB lookup
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User account no longer exists.", success: false });
    }

    req.id = user._id.toString();
    req.user = user;
    return next();
  } catch (error) {
    console.error("[isAuthenticated error]:", error);
    return res.status(500).json({ message: "Internal server error during authentication.", success: false });
  }
};

export default isAuthenticated;