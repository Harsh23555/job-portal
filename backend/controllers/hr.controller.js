import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { isValidEmail, isValidPassword, isValidPhone, isValidUrl, sanitizeString } from "../utils/validator.js";
import emailService from "../services/emailService.js";

/**
 * POST /api/v1/hr/register
 * HR registration — creates a recruiter account with verificationStatus: "pending".
 */
export const registerHR = async (req, res) => {
  try {
    const {
      fullname,
      email,
      phoneNumber,
      password,
      confirmPassword,
      designation,
      companyName,
      companyWebsite,
      companyEmail,
      companyIndustry,
      companySize,
      companyAddress,
      companyCityState,
      companyCountry,
      companyRegistrationInfo,
      linkedinUrl,
      hrAccessReason,
      agreedToTerms,
    } = req.body;

    // ─── Required field validation ─────────────────────────────────────────
    if (!fullname || !email || !phoneNumber || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, phone number, password, and confirm password are required.",
      });
    }

    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: "Company name is required.",
      });
    }

    if (!designation) {
      return res.status(400).json({
        success: false,
        message: "Designation / job title is required.",
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({
        success: false,
        message: "You must agree to the Terms of Service and Privacy Policy.",
      });
    }

    // ─── Field format validation ───────────────────────────────────────────
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Please provide a valid work email address." });
    }

    if (!isValidPhone(phoneNumber)) {
      return res.status(400).json({ success: false, message: "Please provide a valid phone number (5-20 characters, digits/symbols only)." });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Password and confirm password do not match." });
    }

    if (companyWebsite && !isValidUrl(companyWebsite)) {
      return res.status(400).json({ success: false, message: "Company website must be a valid URL (http:// or https://)." });
    }

    if (companyEmail && !isValidEmail(companyEmail)) {
      return res.status(400).json({ success: false, message: "Company email must be a valid email address." });
    }

    if (linkedinUrl && !isValidUrl(linkedinUrl)) {
      return res.status(400).json({ success: false, message: "LinkedIn profile URL must be a valid URL." });
    }

    // ─── Duplicate check ───────────────────────────────────────────────────
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: "An account already exists with this email address." });
    }

    // ─── Create user (never store confirmPassword or plain password) ──────
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullname: sanitizeString(fullname, 100),
      email: cleanEmail,
      phoneNumber: String(phoneNumber).trim().slice(0, 20),
      password: hashedPassword,
      role: "recruiter",
      verificationStatus: "pending",
      designation: sanitizeString(designation, 100),
      companyDetails: {
        companyName: sanitizeString(companyName, 200),
        companyWebsite: companyWebsite ? companyWebsite.trim().slice(0, 500) : "",
        companyEmail: companyEmail ? companyEmail.toLowerCase().trim() : "",
        companyIndustry: sanitizeString(companyIndustry || "", 100),
        companySize: sanitizeString(companySize || "", 50),
        companyAddress: sanitizeString(companyAddress || "", 300),
        companyCityState: sanitizeString(companyCityState || "", 100),
        companyCountry: sanitizeString(companyCountry || "", 100),
        companyRegistrationInfo: sanitizeString(companyRegistrationInfo || "", 200),
      },
      linkedinUrl: linkedinUrl ? linkedinUrl.trim().slice(0, 500) : "",
      hrAccessReason: sanitizeString(hrAccessReason || "", 1000),
      agreedToTerms: true,
    });

    // Fire-and-forget notification email
    emailService.sendWelcomeEmail(cleanEmail, newUser.fullname).catch((err) => {
      console.warn("[registerHR] Welcome email delivery failed:", err.message);
    });

    return res.status(201).json({
      success: true,
      message:
        "Your HR registration has been submitted successfully. Your account is awaiting admin verification. You will be able to post jobs once your account is approved.",
    });
  } catch (error) {
    console.error("[registerHR error]:", error);

    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "An account already exists with this email address.",
      });
    }

    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * GET /api/v1/hr/me
 * Returns the authenticated HR user's profile including verification status.
 */
export const getHRProfile = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId).select("-password -resetPasswordToken -resetPasswordExpires");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.role !== "recruiter") {
      return res.status(403).json({ success: false, message: "This endpoint is for HR/recruiter accounts only." });
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        designation: user.designation,
        companyDetails: user.companyDetails,
        linkedinUrl: user.linkedinUrl,
        hrAccessReason: user.hrAccessReason,
        verificationStatus: user.verificationStatus,
        rejectionReason: user.rejectionReason,
        suspensionReason: user.suspensionReason,
        verificationReviewedAt: user.verificationReviewedAt,
        profile: user.profile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("[getHRProfile error]:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * PATCH /api/v1/hr/me
 * Update permitted profile fields. Cannot change role, verificationStatus, or audit fields.
 */
export const updateHRProfile = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.role !== "recruiter") {
      return res.status(403).json({ success: false, message: "This endpoint is for HR/recruiter accounts only." });
    }

    const { fullname, phoneNumber, designation, linkedinUrl } = req.body;

    if (fullname) user.fullname = sanitizeString(fullname, 100);
    if (phoneNumber) {
      if (!isValidPhone(phoneNumber)) {
        return res.status(400).json({ success: false, message: "Invalid phone number format." });
      }
      user.phoneNumber = String(phoneNumber).trim().slice(0, 20);
    }
    if (designation !== undefined) user.designation = sanitizeString(designation, 100);
    if (linkedinUrl !== undefined) {
      if (linkedinUrl && !isValidUrl(linkedinUrl)) {
        return res.status(400).json({ success: false, message: "LinkedIn URL must be a valid URL." });
      }
      user.linkedinUrl = linkedinUrl ? linkedinUrl.trim().slice(0, 500) : "";
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        designation: user.designation,
        linkedinUrl: user.linkedinUrl,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    console.error("[updateHRProfile error]:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
