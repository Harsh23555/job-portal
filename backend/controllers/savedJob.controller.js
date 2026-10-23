import { SavedJob } from "../models/savedJob.model.js";
import { Job } from "../models/job.model.js";
import { ExternalJob } from "../models/externalJob.model.js";
import { formatInternalJob, formatExternalJob } from "./job.controller.js";

// saveJob
export const saveJob = async (req, res, next) => {
  try {
    const userId = req.id;
    const { jobId, isExternal } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required.", success: false });
    }

    if (isExternal) {
      const extJob = await ExternalJob.findById(jobId).catch(() => null);
      if (!extJob) {
        return res.status(404).json({ message: "External job not found.", success: false });
      }

      const doc = await SavedJob.findOneAndUpdate(
        { user: userId, externalJobId: jobId },
        {
          $setOnInsert: {
            user: userId,
            externalJobId: jobId,
            internalJobId: null,
            jobSnapshot: {
              title: extJob.title || "",
              companyName: extJob.companyName || "",
              location: extJob.location || "",
              jobType: extJob.jobType || "",
              isExternal: true,
              provider: extJob.provider || "external",
              externalUrl: extJob.externalUrl || "",
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({ message: "Job saved successfully.", savedJob: doc, success: true });
    } else {
      const intJob = await Job.findById(jobId).populate("company").catch(() => null);
      if (!intJob) {
        return res.status(404).json({ message: "Job not found.", success: false });
      }

      const doc = await SavedJob.findOneAndUpdate(
        { user: userId, internalJobId: jobId },
        {
          $setOnInsert: {
            user: userId,
            internalJobId: jobId,
            externalJobId: null,
            jobSnapshot: {
              title: intJob.title || "",
              companyName: intJob.company?.name || "",
              location: intJob.location || "",
              jobType: intJob.jobType || "",
              isExternal: false,
              provider: "internal",
              externalUrl: "",
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({ message: "Job saved successfully.", savedJob: doc, success: true });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: "Job already saved.", success: true });
    }
    console.error("[saveJob error]:", error);
    return next ? next(error) : res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// unsaveJob
export const unsaveJob = async (req, res, next) => {
  try {
    const userId = req.id;
    const { jobId, isExternal } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required.", success: false });
    }

    const filter = isExternal
      ? { user: userId, externalJobId: jobId }
      : { user: userId, internalJobId: jobId };

    const result = await SavedJob.findOneAndDelete(filter);
    if (!result) {
      return res.status(404).json({ message: "Saved job not found.", success: false });
    }

    return res.status(200).json({ message: "Job removed from saved jobs.", success: true });
  } catch (error) {
    console.error("[unsaveJob error]:", error);
    return next ? next(error) : res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// getSavedJobs
export const getSavedJobs = async (req, res, next) => {
  try {
    const userId = req.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const [total, saved] = await Promise.all([
      SavedJob.countDocuments({ user: userId }),
      SavedJob.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate({ path: "internalJobId", populate: { path: "company" } })
        .populate({ path: "externalJobId" })
        .lean(),
    ]);

    const jobs = saved.map((s) => {
      if (!s.internalJobId && !s.externalJobId) {
        // Return snapshot if references expired
        return {
          _id: String(s._id),
          id: String(s._id),
          savedAt: s.createdAt,
          expired: true,
          ...s.jobSnapshot,
        };
      }
      if (s.internalJobId) {
        const formatted = formatInternalJob(s.internalJobId);
        return { ...formatted, savedAt: s.createdAt };
      }
      if (s.externalJobId) {
        const formatted = formatExternalJob(s.externalJobId);
        return { ...formatted, savedAt: s.createdAt };
      }
    }).filter(Boolean);

    return res.status(200).json({
      success: true,
      jobs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    console.error("[getSavedJobs error]:", error);
    return next ? next(error) : res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// getSavedJobIds
export const getSavedJobIds = async (req, res, next) => {
  try {
    const userId = req.id;
    const saved = await SavedJob.find({ user: userId }).select("internalJobId externalJobId").lean();

    const ids = saved.map((s) => String(s.internalJobId || s.externalJobId)).filter(Boolean);

    return res.status(200).json({ success: true, savedJobIds: ids });
  } catch (error) {
    console.error("[getSavedJobIds error]:", error);
    return next ? next(error) : res.status(500).json({ success: false, message: "Internal server error" });
  }
};
