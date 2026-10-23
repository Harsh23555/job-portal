/**
 * Admin Controller — manages job source status and ingestion run history.
 */
import { IngestionRun } from "../models/ingestionRun.model.js";
import { jobProviderManager } from "../services/jobProviderManager.js";
import { syncExternalJobs } from "../services/externalJobSync.js";

/**
 * GET /api/v1/admin/job-sources
 * Returns all provider statuses with full details.
 */
export async function getAllJobSources(req, res, next) {
  try {
    const providers = jobProviderManager.getAllProviders();
    const sources = providers.map((p) =>
      typeof p.getSourceStatus === "function"
        ? p.getSourceStatus()
        : {
            name: p.providerName,
            displayName: p.providerName,
            status: p.isConfigured() ? "active" : "unconfigured",
            configured: p.isConfigured(),
            reason: null,
            termsNote: null,
          }
    );
    return res.status(200).json({ success: true, sources });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/job-sources/:source/sync
 * Triggers an immediate force-sync for all or a specific provider.
 * Body: { force?: boolean }
 */
export async function triggerSourceSync(req, res, next) {
  try {
    const { source } = req.params;
    const force = req.body?.force !== false; // default true

    // Optional: validate source exists
    const providers = jobProviderManager.getAllProviders();
    const providerNames = providers.map((p) => p.providerName);

    if (source !== "all" && !providerNames.includes(source)) {
      return res.status(404).json({
        success: false,
        message: `Unknown provider: "${source}". Available: ${providerNames.join(", ")}.`,
      });
    }

    // Run sync in background — don't await
    syncExternalJobs({ force, triggeredBy: "manual" }).catch((err) =>
      console.error("[AdminController] Manual sync error:", err.message)
    );

    return res.status(202).json({
      success: true,
      message: `Sync triggered for ${source === "all" ? "all providers" : source}. Check ingestion-runs for results.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/ingestion-runs
 * Returns paginated ingestion run history.
 * Query params: page (default 1), limit (default 20, max 100)
 */
export async function getIngestionRuns(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      IngestionRun.find({})
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IngestionRun.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      runs,
    });
  } catch (err) {
    next(err);
  }
}
