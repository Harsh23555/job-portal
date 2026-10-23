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

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const LLM_MODEL = process.env.RAG_LLM_MODEL || "llama-3.3-70b-versatile";

// ─── Cover Letter Prompt ──────────────────────────────────────────────────────

function buildCoverLetterPrompt(user, job, analysis) {
  const skills = analysis?.skills_and_technologies?.primary_skills?.slice(0, 8) || [];
  const userSkills = user.profile?.skills?.slice(0, 8) || [];
  const allSkills = [...new Set([...skills, ...userSkills])].join(", ");
  const summary = analysis?.professional_summary || user.profile?.bio || "";
  const yearsExp = analysis?.total_years_experience || user.profile?.yearsOfExperience || "several";
  const jobSkills = (job.skills || []).slice(0, 6).join(", ");
  const jobDescSnippet = (job.description || "").slice(0, 400);

  return {
    system: "You are an expert AI career agent that auto-applies to jobs for candidates. Write an authentic, compelling, 3-4 sentence cover letter paragraph tailored to the specific role using the applicant's verified profile data and skills. Never invent experience. Return JSON only.",
    user: `Tailor this application for the candidate based on their saved profile:

Applicant Profile:
- Full Name: ${user.fullname || "Applicant"}
- Summary/Bio: ${summary || "Dedicated professional with proven domain expertise"}
- Verified Skills: ${allSkills || "Technical skills, communication, problem solving"}
- Years of Experience: ${yearsExp}

Target Job:
- Title: ${job.title}
- Company: ${job.companyName || "the organization"}
- Required Skills: ${jobSkills || "Technical skills relevant to role"}
- Location: ${job.location || ""}
- Description: ${jobDescSnippet}

Output JSON strictly as: { "coverLetter": "<3-4 sentence tailored cover letter body in first person, professional, no greetings, no closing signature>" }`,
  };
}

// ─── AI Cover Letter Generation ───────────────────────────────────────────────

async function generateCoverLetter(user, job, analysis) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return generateFallbackCoverLetter(user, job, analysis);
  }

  try {
    const { system, user: userPrompt } = buildCoverLetterPrompt(user, job, analysis);
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: LLM_MODEL,
        temperature: 0.6,
        max_tokens: 300,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 12000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content);
    if (parsed?.coverLetter && typeof parsed.coverLetter === "string") {
      return { text: parsed.coverLetter.trim(), model: LLM_MODEL };
    }
  } catch {
    // Fall through to local generation
  }

  return generateFallbackCoverLetter(user, job, analysis);
}

function generateFallbackCoverLetter(user, job, analysis) {
  const skills = analysis?.skills_and_technologies?.primary_skills?.slice(0, 4) || [];
  const userSkills = user.profile?.skills?.slice(0, 4) || [];
  const allSkills = [...new Set([...skills, ...userSkills])];
  const name = user.fullname || "I";
  const yearsExp = analysis?.total_years_experience;
  const title = job.title;
  const company = job.companyName || "your organization";

  const expStr = yearsExp ? ` with ${yearsExp}+ years of experience` : "";
  const skillStr = allSkills.length > 0 ? ` My core skills include ${allSkills.slice(0, 4).join(", ")}.` : "";

  const letter = `${name} am excited to apply for the ${title} role at ${company}${expStr}.${skillStr} I am confident my background aligns well with the requirements of this position and I would love the opportunity to contribute to your team. I look forward to discussing how my experience can add value to ${company}.`;

  return { text: letter, model: "local-template" };
}

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
