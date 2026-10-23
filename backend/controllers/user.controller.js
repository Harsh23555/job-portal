import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import crypto from "crypto";
import { extractResumeText } from "../utils/resumeExtractor.js";
import { groqResumeAnalyzer } from "../services/groqService.js";
import { ResumeAnalysis } from "../models/resumeAnalysis.model.js";
import { isValidEmail, isValidPassword, isValidRole, sanitizeString } from "../utils/validator.js";
import { config } from "../utils/config.js";
import emailService from "../services/emailService.js";
import { saveResumeFile, deleteResumeFile, streamResumeFile } from "../utils/resumeStorage.js";
import { Application } from "../models/application.model.js";
import { extractSkills } from "../utils/skillExtractor.js";

// OAuth state store
const oauthStateStore = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 min TTL

function createOAuthState({ role = "student", action = "login", userId = null } = {}) {
  const state = crypto.randomBytes(24).toString("hex");
  oauthStateStore.set(state, {
    role,
    action,
    userId,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  });
  return state;
}

function consumeOAuthState(state) {
  const entry = oauthStateStore.get(state);
  if (!entry) return null;
  oauthStateStore.delete(state); // single-use
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

// Purge expired OAuth state nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of oauthStateStore.entries()) {
    if (now > val.expiresAt) oauthStateStore.delete(key);
  }
}, 5 * 60 * 1000).unref();

/** Returns sanitized user object. */
function buildUserResponse(user) {
  return {
    _id: user._id,
    fullname: user.fullname,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profile: user.profile,
  };
}

/** Signs JWT token. */
function signToken(userId, { role, email } = {}) {
  const payload = { userId };
  if (role) payload.role = role;
  if (email) payload.email = email;
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

/** Sets httpOnly auth cookie. */
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
  });
}

// register
export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, role } = req.body;
    if (!fullname || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({
        message: "All fields (fullname, email, phoneNumber, password, role) are required.",
        success: false,
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address.", success: false });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 6 characters long.", success: false });
    }
    if (!isValidRole(role)) {
      return res.status(400).json({ message: "Role must be either 'student' or 'recruiter'.", success: false });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: "User already exists with this email.", success: false });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      fullname: sanitizeString(fullname, 100),
      email: cleanEmail,
      phoneNumber: String(phoneNumber).trim().slice(0, 20),
      password: hashedPassword,
      role,
    });

    // Send welcome email (fire-and-forget)
    emailService.sendWelcomeEmail(cleanEmail, newUser.fullname).catch((err) => {
      console.warn("[register] Welcome email delivery failed:", err.message);
    });

    return res.status(201).json({ message: "Account created successfully.", success: true });
  } catch (error) {
    console.error("[register error]:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

// login
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required.", success: false });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ message: "Incorrect email or password.", success: false });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Incorrect email or password.", success: false });
    }

    if (role !== user.role) {
      return res.status(400).json({ message: "Account doesn't exist with current role.", success: false });
    }

    const token = signToken(user._id, { role: user.role, email: user.email });
    setAuthCookie(res, token);

    // Token is delivered via httpOnly cookie only (not returned in body)
    return res.status(200).json({
      message: `Welcome back ${user.fullname}`,
      user: buildUserResponse(user),
      success: true,
    });
  } catch (error) {
    console.error("[login error]:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

// logout
export const logout = async (req, res) => {
  try {
    return res.status(200)
      .cookie("token", "", { maxAge: 0, httpOnly: true, sameSite: "lax", secure: config.isProduction })
      .cookie("csrf_token", "", { maxAge: 0, sameSite: "lax", secure: config.isProduction })
      .json({ message: "Logged out successfully.", success: true });
  } catch (error) {
    console.error("[logout error]:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

// updateProfile
export const updateProfile = async (req, res) => {
  try {
    if (!req.id) {
      return res.status(401).json({ message: "Unauthorized: missing user ID.", success: false });
    }

    const { fullname, email, phoneNumber, bio, skills } = req.body;

    // Validate fields if provided
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address.", success: false });
    }


    if (fullname !== undefined && (typeof fullname !== "string" || fullname.trim().length === 0)) {
      return res.status(400).json({ message: "Full name must be a non-empty string.", success: false });
    }


    if (phoneNumber !== undefined) {
      const cleaned = String(phoneNumber).trim();
      if (!/^[+\d\s\-().]{5,20}$/.test(cleaned)) {
        return res.status(400).json({ message: "Phone number format is invalid.", success: false });
      }
    }

    let user = await User.findById(req.id);
    if (!user) {
      return res.status(404).json({ message: "User not found.", success: false });
    }

    // Apply sanitized updates
    if (fullname) user.fullname = sanitizeString(fullname, 100);

    if (email && email !== user.email) {
      const existingEmailUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmailUser) {
        return res.status(400).json({ message: "Email is already in use by another account.", success: false });
      }
      user.email = email.toLowerCase().trim();
    }

    if (phoneNumber) user.phoneNumber = String(phoneNumber).trim().slice(0, 20);
    if (bio !== undefined) user.profile.bio = sanitizeString(bio, 1000);

    if (skills !== undefined) {
      const skillsArray = Array.isArray(skills)
        ? skills.map((s) => sanitizeString(s, 60)).filter(Boolean)
        : String(skills).split(",").map((s) => sanitizeString(s, 60)).filter(Boolean);

      user.profile.skills = skillsArray.slice(0, 50);
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: buildUserResponse(user),
      success: true,
    });
  } catch (error) {
    console.error("[updateProfile error]:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

// analyzeResume
export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded. Please upload a PDF or text resume.",
        success: false,
      });
    }

    const userId = req.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user authentication.", success: false });
    }

    let extracted;
    try {
      extracted = await extractResumeText(req.file.buffer, req.file.originalname, req.file.mimetype);
    } catch (extractErr) {
      return res.status(400).json({
        message: extractErr.message || "Failed to extract readable text from resume.",
        success: false,
      });
    }

    const { text, hash } = extracted;

    const existing = await ResumeAnalysis.findOne({ userId, resumeHash: hash }).sort({ createdAt: -1 });
    if (existing) {
      return res.status(200).json({
        success: true,
        cached: true,
        analysis: existing.analysis,
        fileName: existing.fileName || req.file.originalname,
        createdAt: existing.createdAt,
        message: "Loaded existing analysis for this resume.",
      });
    }

    const result = await groqResumeAnalyzer.analyze(text, hash);

    const saved = await ResumeAnalysis.create({
      userId,
      resumeHash: hash,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      analysis: result.analysis,
      modelUsed: result.modelUsed,
      usage: result.usage,
    });

    try {
      await User.findByIdAndUpdate(userId, { "profile.resumeOriginalName": req.file.originalname });
    } catch (userUpdateErr) {
      console.warn("Failed to update user resumeOriginalName:", userUpdateErr.message);
    }

    return res.status(200).json({
      success: true,
      cached: false,
      analysis: saved.analysis,
      fileName: saved.fileName,
      createdAt: saved.createdAt,
      message: "Resume analyzed successfully.",
    });
  } catch (error) {
    console.error("[analyzeResume error]:", error.message);
    const isRateLimit = error.message && error.message.includes("rate limit");
    return res.status(isRateLimit ? 429 : 500).json({
      message: error.message || "Internal server error while analyzing resume.",
      success: false,
    });
  }
};

// getLatestResumeAnalysis
export const getLatestResumeAnalysis = async (req, res) => {
  try {
    const userId = req.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user authentication.", success: false });
    }

    const latest = await ResumeAnalysis.findOne({ userId }).sort({ createdAt: -1 });
    if (!latest) {
      return res.status(200).json({
        success: true,
        analysis: null,
        message: "No prior resume analysis found for this candidate.",
      });
    }

    return res.status(200).json({
      success: true,
      analysis: latest.analysis,
      fileName: latest.fileName,
      createdAt: latest.createdAt,
      message: "Latest analysis retrieved successfully.",
    });
  } catch (error) {
    console.error("[getLatestResumeAnalysis error]:", error.message);
    return res.status(500).json({ message: "Internal server error while fetching latest resume analysis.", success: false });
  }
};

// getCurrentUser
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }
    return res.status(200).json({ user, success: true });
  } catch (error) {
    console.error("[getCurrentUser error]:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

// googleLogin
const _googleClient = new OAuth2Client(config.googleClientId);

export const googleLogin = async (req, res) => {
  try {
    const { token, role, action } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Google token is missing", success: false });
    }

    const googleUserRes = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { email, name, picture } = googleUserRes.data;
    if (!email) {
      return res.status(400).json({ message: "Google profile has no email address configured.", success: false });
    }

    // Handle account-linking flow
    const existingToken = req.cookies.token;
    let loggedInUserId = null;
    if (existingToken && action === "link") {
      try {
        const decoded = jwt.verify(existingToken, config.jwtSecret);
        loggedInUserId = decoded.userId;
      } catch { /* ignore — proceed as normal login */ }
    }

    if (loggedInUserId) {
      const conflictUser = await User.findOne({
        $or: [{ email }, { "profile.googleEmail": email }],
        _id: { $ne: loggedInUserId },
      });
      if (conflictUser) {
        return res.status(400).json({
          message: "This Google account is already linked to another user profile.",
          success: false,
        });
      }

      const user = await User.findById(loggedInUserId);
      if (!user) {
        return res.status(400).json({ message: "User not found.", success: false });
      }
      user.profile.googleEmail = email;
      await user.save();
      return res.status(200).json({ message: "Google account linked successfully!", user: buildUserResponse(user), success: true });
    }

    let user = await User.findOne({ $or: [{ email }, { "profile.googleEmail": email }] });

    if (!user) {
      const hashedPassword = await bcrypt.hash(crypto.randomBytes(20).toString("hex"), 10);
      user = await User.create({
        fullname: sanitizeString(name || "Google User", 100),
        email,
        phoneNumber: "0000000000",
        password: hashedPassword,
        role: isValidRole(role) ? role : "student",
        profile: { bio: "", skills: [], profilePhoto: picture || "", googleEmail: email },
      });
    } else if (!user.profile.googleEmail) {
      user.profile.googleEmail = email;
      await user.save();
    }

    const jwtToken = signToken(user._id, { role: user.role, email: user.email });
    setAuthCookie(res, jwtToken);

    return res.status(200).json({
      message: `Welcome back ${user.fullname}`,
      user: buildUserResponse(user),
      success: true,
    });
  } catch (error) {
    console.error("[googleLogin error]:", error);
    return res.status(500).json({ message: "Google authentication failed", success: false });
  }
};

// githubInitiate
export const githubInitiate = (req, res) => {
  const { role = "student", action = "login" } = req.query;
  const safeRole = isValidRole(role) ? role : "student";

  // Capture logged-in user for account-linking flow
  let userId = null;
  if (action === "link" && req.cookies.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, config.jwtSecret);
      userId = decoded.userId;
    } catch { /* not authenticated — link will fail gracefully in callback */
    }
  }

  const state = createOAuthState({ role: safeRole, action, userId });

  const params = new URLSearchParams({
    client_id: config.githubClientId,
    redirect_uri: config.githubRedirectUri,
    scope: "user:email",
    state,
  });

  return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
};

// githubCallback
export const githubCallback = async (req, res) => {
  const clientOrigin = config.clientOrigin || "http://localhost:5173";
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${clientOrigin}/auth?error=missing_code`);
    }

    // Validate state nonce (prevents CSRF + role injection)
    const stateData = consumeOAuthState(state);
    if (!stateData) {
      return res.redirect(`${clientOrigin}/auth?error=invalid_or_expired_state`);
    }
    const { role: intendedRole, action, userId: loggedInUserId } = stateData;

    // Exchange OAuth code for access token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
        redirect_uri: config.githubRedirectUri,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      return res.redirect(`${clientOrigin}/auth?error=token_failed`);
    }

    const userProfileRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { login, name, avatar_url } = userProfileRes.data;
    let email = userProfileRes.data.email;

    if (!email) {
      try {
        const emailsRes = await axios.get("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const primary = emailsRes.data.find((e) => e.primary);
        email = primary ? primary.email : emailsRes.data[0]?.email || null;
      } catch (err) {
        console.error("Failed to fetch GitHub email list:", err.message);
      }
    }

    if (!email) {
      email = `${login}@github.users.noreply.com`;
    }

    // Account linking flow
    if (loggedInUserId && action === "link") {
      const currentUser = await User.findById(loggedInUserId);
      if (currentUser && currentUser.profile.githubEmail === email) {
        return res.redirect(`${clientOrigin}/?link=github_success`);
      }

      const conflictUser = await User.findOne({
        $or: [{ email }, { "profile.githubEmail": email }],
        _id: { $ne: loggedInUserId },
      });
      if (conflictUser) {
        return res.redirect(`${clientOrigin}/?error=github_already_linked`);
      }

      if (!currentUser) {
        return res.redirect(`${clientOrigin}/?error=user_not_found`);
      }

      currentUser.profile.githubEmail = email;
      await currentUser.save();
      return res.redirect(`${clientOrigin}/?link=github_success`);
    }

    // Normal login / register flow
    let user = await User.findOne({ $or: [{ email }, { "profile.githubEmail": email }] });

    if (!user) {
      const hashedPassword = await bcrypt.hash(crypto.randomBytes(20).toString("hex"), 10);
      user = await User.create({
        fullname: sanitizeString(name || login || "GitHub User", 100),
        email,
        phoneNumber: "0000000000",
        password: hashedPassword,
        role: intendedRole, // from server-issued state, not attacker-controlled
        profile: { bio: "", skills: [], profilePhoto: avatar_url || "", githubEmail: email },
      });
    } else if (!user.profile.githubEmail) {
      user.profile.githubEmail = email;
      await user.save();
    }

    const jwtToken = signToken(user._id);
    res.cookie("token", jwtToken, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
    });

    return res.redirect(`${clientOrigin}/`);
  } catch (error) {
    console.error("[githubCallback error]:", error);
    return res.redirect(`${clientOrigin}/auth?error=github_failed`);
  }
};

// unlinkSocialAccount
export const unlinkSocialAccount = async (req, res) => {
  try {
    const userId = req.id;
    const { provider } = req.body;

    if (!provider || (provider !== "google" && provider !== "github")) {
      return res.status(400).json({ message: "Invalid provider specified", success: false });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found", success: false });
    }

    if (provider === "google") {
      if (!user.password && !user.profile.githubEmail) {
        return res.status(400).json({
          message: "You cannot disconnect Google as it is your only way to log in. Set up GitHub or a password first.",
          success: false,
        });
      }
      user.profile.googleEmail = undefined;
    } else if (provider === "github") {
      if (!user.password && !user.profile.googleEmail) {
        return res.status(400).json({
          message: "You cannot disconnect GitHub as it is your only way to log in. Set up Google or a password first.",
          success: false,
        });
      }
      user.profile.githubEmail = undefined;
    }

    await user.save();

    return res.status(200).json({
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked successfully!`,
      user: buildUserResponse(user),
      success: true,
    });
  } catch (error) {
    console.error("[unlinkSocialAccount error]:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

// forgotPassword
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address.", success: false });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    // Mitigate account enumeration — return identical response whether user exists or not
    if (!user) {
      return res.status(200).json({
        message: "If an account exists with that email, a password reset link has been sent.",
        success: true,
      });
    }

    // Generate secure reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const clientOrigin = config.clientOrigin ? config.clientOrigin.split(",")[0].trim() : "http://localhost:5173";
    emailService.sendPasswordResetEmail(cleanEmail, rawToken, clientOrigin).catch((err) => {
      console.warn("[forgotPassword] Email delivery failed:", err.message);
    });

    return res.status(200).json({
      message: "If an account exists with that email, a password reset link has been sent.",
      success: true,
    });
  } catch (error) {
    console.error("[forgotPassword error]:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

// resetPassword
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Reset token is required.", success: false });
    }
    if (!newPassword || !isValidPassword(newPassword)) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long.",
        success: false,
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Password reset link is invalid or has expired.",
        success: false,
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      message: "Password has been reset successfully. Please log in with your new password.",
      success: true,
    });
  } catch (error) {
    console.error("[resetPassword error]:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

// uploadProfileResume
export const uploadProfileResume = async (req, res) => {
  try {
    const userId = req.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required.", success: false });
    }

    if (req.user && req.user.role && req.user.role !== "student") {
      return res.status(403).json({
        message: "Forbidden: Only applicants can upload a profile resume.",
        success: false,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No resume file uploaded. Please upload a PDF, DOC, DOCX, or TXT file.",
        success: false,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found.", success: false });
    }

    // Persist resume to private storage
    const saved = await saveResumeFile(req.file.buffer, req.file.originalname, req.file.mimetype);

    // If a previous resume exists, delete it only if no application snapshot references it
    const oldFileId = user.profile?.resumeMetadata?.fileId;
    const oldStorageKey = user.profile?.resumeMetadata?.storageKey || user.profile?.resume;
    if (oldFileId && oldStorageKey && oldFileId !== saved.fileId) {
      try {
        const isReferenced = await Application.exists({ "resume.fileId": oldFileId });
        if (!isReferenced) {
          await deleteResumeFile(oldStorageKey);
        }
      } catch (cleanupErr) {
        console.warn("[uploadProfileResume] Old resume cleanup check failed:", cleanupErr.message);
      }
    }

    // Extract skills from resume text to update profile
    let extractedSkills = [];
    try {
      const extracted = await extractResumeText(req.file.buffer, req.file.originalname, req.file.mimetype);
      if (extracted?.text) {
        extractedSkills = extractSkills(extracted.text);

        // Fire-and-forget: trigger Groq AI analysis in background
        groqResumeAnalyzer.analyze(extracted.text, extracted.hash).then(async (result) => {
          try {
            await ResumeAnalysis.create({
              userId,
              resumeHash: extracted.hash,
              fileName: saved.originalName,
              fileSize: saved.size,
              analysis: result.analysis,
              modelUsed: result.modelUsed,
              usage: result.usage,
            });
          } catch (analysisErr) {
            console.warn("[uploadProfileResume] Background analysis save failed:", analysisErr.message);
          }
        }).catch((err) => {
          console.warn("[uploadProfileResume] Background analysis notice:", err.message);
        });
      }
    } catch (extractErr) {
      console.warn("[uploadProfileResume] Text/skills extraction notice:", extractErr.message);
    }

    // Persist resume metadata to user profile
    if (!user.profile) user.profile = {};
    user.profile.resume = saved.storageKey;
    user.profile.resumeOriginalName = saved.originalName;
    user.profile.resumeMetadata = saved;

    // Merge extracted skills into profile (deduped, max 50)
    if (extractedSkills.length > 0) {
      const existingSkills = new Set(user.profile.skills || []);
      extractedSkills.forEach((s) => existingSkills.add(s));
      user.profile.skills = Array.from(existingSkills).slice(0, 50);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Resume uploaded successfully.",
      resume: saved,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("[uploadProfileResume error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while uploading resume.",
    });
  }
};

// getProfileResume
export const getProfileResume = async (req, res) => {
  try {
    const userId = req.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required.", success: false });
    }

    if (req.user && req.user.role && req.user.role !== "student") {
      return res.status(403).json({
        message: "Forbidden: Only applicants can access their profile resume.",
        success: false,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found.", success: false });
    }

    const metadata = user.profile?.resumeMetadata;
    const storageKey = metadata?.storageKey || user.profile?.resume;

    if (!storageKey) {
      return res.status(404).json({
        success: false,
        message: "No resume uploaded for this profile.",
      });
    }

    const download = req.query.download === "true" || req.query.download === "1";
    return streamResumeFile(res, {
      storageKey,
      originalName: metadata?.originalName || user.profile?.resumeOriginalName || "resume.pdf",
      mimeType: metadata?.mimeType || "application/pdf",
      download,
    });
  } catch (error) {
    console.error("[getProfileResume error]:", error);
    if (error.code === "ENOENT") {
      return res.status(404).json({ success: false, message: "Resume file not found on disk." });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error while retrieving resume.",
    });
  }
};

// deleteProfileResume
export const deleteProfileResume = async (req, res) => {
  try {
    const userId = req.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required.", success: false });
    }

    if (req.user && req.user.role && req.user.role !== "student") {
      return res.status(403).json({
        message: "Forbidden: Only applicants can remove their profile resume.",
        success: false,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found.", success: false });
    }

    const fileId = user.profile?.resumeMetadata?.fileId;
    const storageKey = user.profile?.resumeMetadata?.storageKey || user.profile?.resume;

    if (!storageKey && !fileId) {
      return res.status(400).json({
        success: false,
        message: "No resume found to remove.",
      });
    }

    // Only physically delete if no application snapshot references this file
    if (fileId && storageKey) {
      try {
        const isReferenced = await Application.exists({ "resume.fileId": fileId });
        if (!isReferenced) {
          await deleteResumeFile(storageKey);
        }
      } catch (checkErr) {
        console.warn("[deleteProfileResume] Application reference check notice:", checkErr.message);
      }
    }

    // Clear resume metadata from profile
    user.profile.resume = null;
    user.profile.resumeOriginalName = null;
    user.profile.resumeMetadata = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Resume removed from your profile.",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("[deleteProfileResume error]:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while removing resume.",
    });
  }
};
