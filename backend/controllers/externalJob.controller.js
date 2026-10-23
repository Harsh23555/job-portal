import mongoose from "mongoose";
import { ExternalJob } from "../models/externalJob.model.js";
import { syncExternalJobs } from "../services/externalJobSync.js";
import { jobProviderManager } from "../services/jobProviderManager.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Searches external jobs with caching and pagination. */
export const searchExternalJobs = async (req, res) => {
  try {
    const rawQuery = req.query.query || req.query.keyword || "";
    const rawLocation = req.query.location || "";
    const rawSource = req.query.source || req.query.provider || "all";
    const rawPage = req.query.page || "1";
    const rawLimit = req.query.limit || String(DEFAULT_LIMIT);
    const force = req.query.force === "true";

    const pageNum = Math.max(1, parseInt(rawPage) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(rawLimit) || DEFAULT_LIMIT));

    const result = await jobProviderManager.searchJobs({
      query: rawQuery,
      location: rawLocation,
      source: rawSource,
      page: pageNum,
      limit: limitNum,
      force,
    });

    let jobs = result.jobs;

    // Filter category and remote
    if (req.query.category && req.query.category.trim()) {
      const cat = req.query.category.trim().toLowerCase();
      jobs = jobs.filter((j) => (j.category || "").toLowerCase().includes(cat));
    }
    if (req.query.remote === "true") {
      jobs = jobs.filter((j) => j.isRemote === true);
    }

    // Normalize job fields
    const formattedJobs = jobs.map((j) => {
      const id = j._id ? String(j._id) : String(j.id || j.externalId);
      return {
        ...j,
        id,
        _id: id,
        source: j.provider || j.source,
        external_id: j.externalId || j.external_id,
        company: j.companyName || j.company,
        apply_url: j.externalUrl || j.apply_url,
        source_url: j.externalUrl || j.source_url,
        posted_date: j.postedAt || j.posted_date,
        fetched_at: j.importedAt || j.fetched_at,
        refreshedAt: j.refreshedAt || j.refreshed_at || new Date(),
        refreshed_at: j.refreshedAt || j.refreshed_at || new Date(),
        job_type: j.jobType || j.job_type,
        salary_min: j.salaryMin || j.salary_min,
        salary_max: j.salaryMax || j.salary_max,
        salary_currency: j.salaryCurrency || j.salary_currency,
      };
    });

    // Sort newest first
    formattedJobs.sort((a, b) => {
      const timeA = a.postedAt ? new Date(a.postedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.postedAt ? new Date(b.postedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      jobs: formattedJobs,
      refreshedAt: new Date().toISOString(),
      pagination: {
        total: result.total || formattedJobs.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((result.total || formattedJobs.length) / limitNum) || 1,
      },
      fromCache: Boolean(result.fromCache),
      providersStatus: result.providersStatus || {},
    });
  } catch (error) {
    console.error("[externalJob.controller] searchExternalJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch external jobs.",
      error: error.message,
    });
  }
};

/** Fetches external job by ID. */
export const getExternalJobById = async (req, res) => {
  try {
    const { id } = req.params;
    let job = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      job = await ExternalJob.findById(id).lean();
    }

    if (!job) {
      job = await ExternalJob.findOne({ externalId: id }).lean();
    }

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "External job not found.",
      });
    }

    let description = job.description || "";
    // If description is truncated, attempt to fetch full description
    if (description.endsWith("…") || description.endsWith("...") || description.length <= 500) {
      try {
        const { enrichJobDescription } = await import("../services/jobDescriptionEnricher.js");
        const fullDesc = await enrichJobDescription(job);
        if (fullDesc) {
          description = fullDesc;
        }
      } catch {
        // Fall back to existing description
      }
    }

    const formattedJob = {
      ...job,
      id: String(job._id),
      _id: String(job._id),
      description,
      source: job.provider,
      external_id: job.externalId,
      company: job.companyName,
      apply_url: job.externalUrl,
      source_url: job.externalUrl,
      posted_date: job.postedAt,
      fetched_at: job.importedAt,
      job_type: job.jobType,
      salary_min: job.salaryMin,
      salary_max: job.salaryMax,
      salary_currency: job.salaryCurrency,
    };

    return res.status(200).json({ success: true, job: formattedJob });
  } catch (error) {
    console.error("[externalJob.controller] getExternalJobById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch external job.",
    });
  }
};

/** Triggers manual external jobs sync. */
export const triggerSync = async (req, res) => {
  try {
    const result = await syncExternalJobs({ force: true });
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("[externalJob.controller] triggerSync error:", error);
    return res.status(500).json({
      success: false,
      message: "Sync failed. Check server logs.",
    });
  }
};
