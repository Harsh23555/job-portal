/**
 * RAG Search Controller — handles /api/v1/external-jobs/ai-search and /match-resume.
 */
import { ragSearch } from "../services/ragSearchService.js";
import { matchResumeToJobs } from "../services/resumeMatchService.js";
import { jobProviderManager } from "../services/jobProviderManager.js";

/**
 * POST /api/v1/external-jobs/ai-search
 * Body: { query: string, topK?: number }
 */
export async function aiSearch(req, res, next) {
  try {
    const { query, topK } = req.body;
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "query is required and must be a non-empty string.",
      });
    }

    if (query.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "query must be 500 characters or fewer.",
      });
    }

    const results = await ragSearch(query.trim(), {
      topK: Math.min(parseInt(topK, 10) || 10, 50),
    });

    return res.status(200).json({
      success: true,
      query: results.query,
      parsedQuery: results.parsedQuery,
      answer: results.answer,
      totalCandidates: results.totalCandidates,
      count: results.results.length,
      durationMs: results.durationMs,
      jobs: results.results,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/external-jobs/match-resume
 * Requires authentication (userId from JWT cookie).
 * Body: { topK?: number }
 */
export async function matchResume(req, res, next) {
  try {
    const userId = req.id; // set by isAuthenticated middleware
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const topK = Math.min(parseInt(req.body?.topK, 10) || 10, 50);
    const result = await matchResumeToJobs(userId, { topK });

    return res.status(200).json({
      success: true,
      resumeSkills: result.resumeSkills,
      totalCandidates: result.totalCandidates,
      count: result.jobs.length,
      jobs: result.jobs,
    });
  } catch (err) {
    if (err.message?.includes("No resume analysis")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * GET /api/v1/external-jobs/sources
 * Returns public view of all provider statuses.
 */
export async function getSourceStatuses(req, res, next) {
  try {
    const providers = jobProviderManager.getAllProviders();
    const statuses = providers.map((p) => {
      const status = typeof p.getSourceStatus === "function"
        ? p.getSourceStatus()
        : { name: p.providerName, status: p.isConfigured() ? "active" : "unconfigured", configured: p.isConfigured() };
      // Strip termsNote from public endpoint
      const { termsNote, ...publicStatus } = status;
      return publicStatus;
    });

    return res.status(200).json({ success: true, sources: statuses });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/external-jobs/admin/sources
 * Returns detailed source status including termsNote (recruiter/admin only).
 */
export async function getAdminSourceStatuses(req, res, next) {
  try {
    const providers = jobProviderManager.getAllProviders();
    const statuses = providers.map((p) =>
      typeof p.getSourceStatus === "function"
        ? p.getSourceStatus()
        : { name: p.providerName, status: p.isConfigured() ? "active" : "unconfigured", configured: p.isConfigured() }
    );
    return res.status(200).json({ success: true, sources: statuses });
  } catch (err) {
    next(err);
  }
}
