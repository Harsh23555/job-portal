import { Job } from "../models/job.model.js";
import { ExternalJob } from "../models/externalJob.model.js";
import { Company } from "../models/company.model.js";
import { convertUSDToINR, formatSalaryRangeINR, formatSalaryDisplay } from "../utils/currency.js";
import { jobProviderManager } from "../services/jobProviderManager.js";
import { deduplicateJobs } from "../services/jobDeduplicator.js";

// Job formatting helpers

/** Normalizes an internal Job document to the unified API response shape. */
export function formatInternalJob(jobObj) {
  const idStr = String(jobObj._id);
  const companyObj = jobObj.company && typeof jobObj.company === "object" ? jobObj.company : {};
  const companyName = companyObj.name || "Company";

  return {
    _id: idStr,
    id: idStr,
    title: jobObj.title || "Job Title",
    description: jobObj.description || "",
    requirements: jobObj.requirements || [],
    skills: jobObj.requirements || [],
    salary: formatSalaryDisplay(jobObj.salary),
    salaryDisplay: formatSalaryDisplay(jobObj.salary),
    salaryMin: jobObj.salary || null,
    salaryMax: jobObj.salary || null,
    salaryCurrency: "INR",
    location: jobObj.location || "India",
    isRemote: Boolean(jobObj.location && jobObj.location.toLowerCase().includes("remote")),
    jobType: jobObj.jobType || "Full-time",
    category: jobObj.category || "",
    experiencelevel: jobObj.experiencelevel || 0,
    position: jobObj.position || 1,
    company: {
      _id: String(companyObj._id || idStr),
      name: companyName,
      location: companyObj.location || jobObj.location || "India",
      logo: jobObj.logo || companyObj.logo || null,
    },
    companyName,
    logo: jobObj.logo || companyObj.logo || null,
    created_by: jobObj.created_by,
    isExternal: false,
    isDemo: false,
    provider: "internal",
    source: "JobSphere Direct",
    externalUrl: "",
    apply_url: "",
    postedAt: jobObj.createdAt || null,
    posted_date: jobObj.createdAt || null,
    importedAt: jobObj.createdAt || new Date(),
    fetched_at: jobObj.createdAt || new Date(),
    refreshedAt: new Date(),
    refreshed_at: new Date(),
    createdAt: jobObj.createdAt || new Date(),
  };
}

/** Normalizes an ExternalJob document to the unified API response shape. */
export function formatExternalJob(j) {
  const idStr = String(j._id);
  const sal = formatSalaryRangeINR(
    j.salaryMin,
    j.salaryMax,
    j.salaryCurrency || "INR",
    j.salaryDisplay || j.salaryRaw || "Competitive"
  );

  return {
    _id: idStr,
    id: idStr,
    externalId: j.externalId || idStr,
    external_id: j.externalId || idStr,
    title: j.title || "Job Title",
    description: j.description || "",
    requirements: j.skills || [],
    skills: j.skills || [],
    salary: sal,
    salaryDisplay: sal,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    salaryCurrency: j.salaryCurrency || "INR",
    location: j.location || "Remote",
    isRemote: Boolean(j.isRemote || (j.location && j.location.toLowerCase().includes("remote"))),
    jobType: j.jobType || "Full-time",
    category: j.category || "",
    experiencelevel: j.experiencelevel || 0,
    position: 1,
    company: {
      _id: idStr,
      name: j.companyName || "Company",
      location: j.location || "Remote",
      logo: null,
    },
    companyName: j.companyName || "Company",
    logo: null,
    created_by: null,
    isExternal: true,
    provider: j.provider || "external",
    source: j.provider || "external",
    externalUrl: j.externalUrl || "",
    apply_url: j.externalUrl || "",
    postedAt: j.postedAt || null,
    posted_date: j.postedAt || null,
    importedAt: j.importedAt || new Date(),
    fetched_at: j.importedAt || new Date(),
    refreshedAt: j.refreshedAt || new Date(),
    refreshed_at: j.refreshedAt || new Date(),
    createdAt: j.postedAt || j.importedAt || new Date(),
  };
}

// postJob
export const postJob = async (req, res, next) => {
  try {
    const {
      title,
      description,
      requirements,
      salary,
      location,
      jobType,
      experience,
      position,
      companyId,
      logo,
      category,
    } = req.body;
    const userId = req.id;

    if (
      !title || !description || !requirements ||
      salary === undefined || !location || !jobType ||
      experience === undefined || !position || !companyId
    ) {
      return res.status(400).json({ message: "Missing required job fields.", success: false });
    }

    const numericSalary = Number(salary);
    if (isNaN(numericSalary) || numericSalary < 0) {
      return res.status(400).json({ message: "Salary must be a valid positive number.", success: false });
    }

    let parsedRequirements = [];
    if (Array.isArray(requirements)) {
      parsedRequirements = requirements.map((r) => String(r).trim()).filter(Boolean);
    } else if (typeof requirements === "string") {
      parsedRequirements = requirements.split(",").map((r) => r.trim()).filter(Boolean);
    }

    const job = await Job.create({
      title: title.trim(),
      description: description.trim(),
      requirements: parsedRequirements,
      salary: numericSalary,
      location: location.trim(),
      jobType: jobType.trim(),
      category: typeof category === "string" ? category.trim() : "",
      experiencelevel: Number(experience) || 0,
      position: Number(position) || 1,
      company: companyId,
      created_by: userId,
      logo: logo || undefined,
    });

    return res.status(201).json({ message: "New job created successfully.", job, success: true });
  } catch (error) {
    console.error("[postJob error]:", error);
    return next ? next(error) : res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// getAllJob
export const getAllJob = async (req, res, next) => {
  try {
    const rawKeyword = typeof req.query.keyword === "string"
      ? req.query.keyword
      : (typeof req.query.query === "string" ? req.query.query : "");
    const keyword = rawKeyword.trim();
    const location = typeof req.query.location === "string" ? req.query.location.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const jobType = typeof req.query.jobType === "string" ? req.query.jobType.trim() : "";
    const isRemote = req.query.remote === "true" || req.query.isRemote === "true";
    const shouldRefresh = req.query.refresh === "true" || req.query.force === "true";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = req.query.limit ? Math.min(200, Math.max(1, parseInt(req.query.limit, 10))) : 200;

    // Internal jobs query
    const internalFilter = {};
    if (keyword) {
      // MongoDB text-search index
      internalFilter.$text = { $search: keyword };
    }
    if (location) {
      internalFilter.location = { $regex: location, $options: "i" };
    }
    if (category && category.toLowerCase() !== "all") {
      internalFilter.category = { $regex: `^${category}$`, $options: "i" };
    }
    if (jobType && jobType.toLowerCase() !== "all") {
      internalFilter.jobType = { $regex: `^${jobType}$`, $options: "i" };
    }

    const internalJobs = await Job.find(internalFilter)
      .populate({ path: "company" })
      .sort({ createdAt: -1 })
      .lean();

    const processedInternalJobs = (internalJobs || []).map((j) => formatInternalJob(j));

    // Proactively refresh from live providers
    const extCount = await ExternalJob.countDocuments().catch(() => 0);
    if (shouldRefresh || extCount === 0) {
      try {
        console.log(`[job.controller] Proactively fetching fresh jobs (refresh=${shouldRefresh}, extCount=${extCount})...`);
        await jobProviderManager.searchJobs({
          query: keyword || "developer",
          location: location || "India",
          page: 1,
          limit: Math.max(limit, 25),
          force: shouldRefresh,
        });
      } catch (syncErr) {
        console.warn("[job.controller] Live provider search warning:", syncErr.message);
      }
    }

    // External jobs query
    const extFilter = {};
    if (keyword) {
      extFilter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { skills: { $regex: keyword, $options: "i" } },
        { companyName: { $regex: keyword, $options: "i" } },
      ];
    }
    if (location) {
      extFilter.location = { $regex: location, $options: "i" };
    }
    if (isRemote) {
      extFilter.$or = [{ isRemote: true }, { location: { $regex: "remote", $options: "i" } }];
    }
    if (category && category.toLowerCase() !== "all") {
      extFilter.$or = [
        { category: { $regex: category, $options: "i" } },
        { title: { $regex: category, $options: "i" } },
        { skills: { $regex: category, $options: "i" } },
      ];
    }
    if (jobType && jobType.toLowerCase() !== "all") {
      extFilter.jobType = { $regex: `^${jobType}$`, $options: "i" };
    }

    let formattedExtJobs = [];
    try {
      const extDocs = await ExternalJob.find(extFilter)
        .sort({ postedAt: -1, importedAt: -1 })
        .limit(Math.min(60, limit))
        .lean();
      formattedExtJobs = extDocs.map((j) => formatExternalJob(j));
    } catch (extErr) {
      console.error("[job.controller] Error fetching external jobs:", extErr);
    }

    // Merge internal + external, sort by recency, deduplicate
    const getTime = (j) => {
      const t = j.postedAt || j.createdAt;
      return t ? new Date(t).getTime() : 0;
    };

    const combined = [...processedInternalJobs, ...formattedExtJobs];
    combined.sort((a, b) => getTime(b) - getTime(a));

    const deduplicated = deduplicateJobs(combined);

    const startIndex = (page - 1) * limit;
    const paginatedJobs = deduplicated.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      jobs: paginatedJobs,
      success: true,
      count: paginatedJobs.length,
      total: deduplicated.length,
      refreshedAt: new Date().toISOString(),
      pagination: {
        total: deduplicated.length,
        page,
        limit,
        totalPages: Math.ceil(deduplicated.length / limit) || 1,
      },
    });
  } catch (error) {
    console.error("[getAllJob error]:", error);
    return next ? next(error) : res.status(500).json({ message: "Internal server error", success: false });
  }
};

// getJobById
export const getJobById = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    let job = await Job.findById(jobId).populate({ path: "company" }).catch(() => null);

    if (job) {
      return res.status(200).json({ job: formatInternalJob(job.toObject ? job.toObject() : job), success: true });
    }

    // Also try external jobs
    let ext = null;
    if (jobId && /^[0-9a-fA-F]{24}$/.test(jobId)) {
      ext = await ExternalJob.findById(jobId).catch(() => null);
    }
    if (!ext) {
      ext = await ExternalJob.findOne({ externalId: jobId }).catch(() => null);
    }

    if (ext) {
      return res.status(200).json({ job: formatExternalJob(ext), success: true });
    }

    return res.status(404).json({ message: "Job not found.", success: false });
  } catch (error) {
    console.error("[getJobById error]:", error);
    return next ? next(error) : res.status(500).json({ message: "Internal server error", success: false });
  }
};

// getAdminJobs
export const getAdminJobs = async (req, res, next) => {
  try {
    const adminId = req.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const filter = { created_by: adminId };
    const [total, jobs] = await Promise.all([
      Job.countDocuments(filter),
      Job.find(filter)
        .populate({ path: "company" })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      jobs,
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("[getAdminJobs error]:", error);
    return next ? next(error) : res.status(500).json({ message: "Internal server error", success: false });
  }
};
