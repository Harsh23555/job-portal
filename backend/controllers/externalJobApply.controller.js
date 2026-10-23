/**
 * externalJobApply.controller.js
 * Handles in-app applications for externally sourced jobs.
 *
 * Instead of redirecting users to 3rd-party sites, JobSphere records the
 * application internally and uses Groq (with a local fallback) to generate
 * a tailored cover letter from the user's profile + resume analysis.
 */
import axios from "axios";
import { ExternalJobApplication } from "../models/externalJobApplication.model.js";
import { ExternalJob } from "../models/externalJob.model.js";
import { ResumeAnalysis } from "../models/resumeAnalysis.model.js";
import { User } from "../models/user.model.js";

import { generateCoverLetter } from "../services/coverLetterService.js";

// ─── Apply to External Job ────────────────────────────────────────────────────

export const applyToExternalJob = async (req, res, next) => {
  try {
    let user = req.user;
    const userId = user?._id || req.id;
    // Load full profile from DB to ensure skills and bio are available for RAG application
    if (userId) {
      const dbUser = await User.findById(userId).select("-password").lean();
      if (dbUser) user = { ...user, ...dbUser };
    }
    const { id: externalJobId } = req.params;
    const {
      coverLetter: submittedCoverLetter,
      yearsOfExperience,
      linkedinUrl,
      portfolioUrl,
      availableFrom,
      atsScore,
      generateAI = true,
    } = req.body;

    // Load job
    const job = await ExternalJob.findById(externalJobId).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    // Check for duplicate
    const existing = await ExternalJobApplication.findOne({
      userId: user._id,
      externalJobId: job._id,
    }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job.",
        application: existing,
      });
    }

    // Fetch latest resume analysis for cover letter generation
    let resumeAnalysis = null;
    try {
      const latestAnalysis = await ResumeAnalysis.findOne({ userId: user._id })
        .sort({ createdAt: -1 })
        .lean();
      if (latestAnalysis?.analysis) {
        resumeAnalysis = latestAnalysis.analysis;
      }
    } catch {
      // Analysis not required
    }

    // Generate or use submitted cover letter
    let finalCoverLetter = submittedCoverLetter || "";
    let aiModel = "";

    if (generateAI && !submittedCoverLetter) {
      const generated = await generateCoverLetter(user, job, resumeAnalysis);
      finalCoverLetter = generated.text;
      aiModel = generated.model;
    }

    // Save application
    const application = await ExternalJobApplication.create({
      userId: user._id,
      externalJobId: job._id,
      jobSnapshot: {
        title: job.title,
        companyName: job.companyName || "",
        location: job.location || "",
        jobType: job.jobType || "",
        salaryDisplay: job.salaryDisplay || "",
        provider: job.provider || "",
        externalUrl: job.externalUrl || "",
        skills: job.skills || [],
        isRemote: job.isRemote || false,
        description: (job.description || "").slice(0, 1000), // truncated snapshot
      },
      coverLetter: finalCoverLetter,
      applicantDetails: {
        fullname: user.fullname || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        yearsOfExperience: yearsOfExperience || "",
        linkedinUrl: linkedinUrl || "",
        portfolioUrl: portfolioUrl || "",
        availableFrom: availableFrom || "",
        skills: user.profile?.skills || [],
      },
      atsScore: atsScore ?? null,
      aiAssisted: Boolean(aiModel && aiModel !== ""),
      aiModel,
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
      application,
    });
  } catch (err) {
    console.error("[ExternalJobApply] Error:", err.message);
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this job.",
      });
    }
    next(err);
  }
};

// ─── Generate AI Cover Letter (preview endpoint) ──────────────────────────────

export const previewCoverLetter = async (req, res, next) => {
  try {
    let user = req.user;
    const userId = user?._id || req.id;
    if (userId) {
      const dbUser = await User.findById(userId).select("-password").lean();
      if (dbUser) user = { ...user, ...dbUser };
    }
    const { id: externalJobId } = req.params;

    const job = await ExternalJob.findById(externalJobId).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    let resumeAnalysis = null;
    try {
      const latest = await ResumeAnalysis.findOne({ userId: user._id })
        .sort({ createdAt: -1 })
        .lean();
      if (latest?.analysis) resumeAnalysis = latest.analysis;
    } catch {}

    const generated = await generateCoverLetter(user, job, resumeAnalysis);

    return res.json({
      success: true,
      coverLetter: generated.text,
      model: generated.model,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get My External Applications ────────────────────────────────────────────

export const getMyExternalApplications = async (req, res, next) => {
  try {
    const user = req.user;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      ExternalJobApplication.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExternalJobApplication.countDocuments({ userId: user._id }),
    ]);

    return res.json({
      success: true,
      applications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Check if Applied (for button state) ─────────────────────────────────────

export const checkExternalApplyStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const { id: externalJobId } = req.params;

    const existing = await ExternalJobApplication.findOne({
      userId: user._id,
      externalJobId,
    }).lean();

    return res.json({
      success: true,
      hasApplied: Boolean(existing),
      application: existing || null,
    });
  } catch (err) {
    next(err);
  }
};
