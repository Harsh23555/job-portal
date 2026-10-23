import { ExternalJob } from "../models/externalJob.model.js";
import { SyncState } from "../models/syncState.model.js";
import { jobProviderManager } from "./jobProviderManager.js";
import { RateLimiter } from "./rateLimiter.js";
import { deduplicateJobs } from "./jobDeduplicator.js";

const DEFAULT_KEYWORDS = [
  "developer",
  "engineer",
  "designer",
  "data analyst",
  "product manager",
];

const KEYWORD_DELAY_MS = 3_000; // 3s throttle

function getSyncKeywords() {
  const env = process.env.ADZUNA_SYNC_KEYWORDS;
  if (env) return env.split(",").map((k) => k.trim()).filter(Boolean);
  return DEFAULT_KEYWORDS;
}

const PAGE_SIZE = parseInt(process.env.ADZUNA_RESULTS_PER_PAGE) || 20;

/** Upserts normalized job into MongoDB. */
async function upsertJob(job) {
  try {
    const filter = { provider: job.provider, externalId: job.externalId };
    const update = {
      $set: {
        externalUrl: job.externalUrl,
        title: job.title,
        description: job.description,
        companyName: job.companyName,
        location: job.location,
        locationRaw: job.locationRaw,
        isRemote: job.isRemote,
        jobType: job.jobType,
        category: job.category,
        skills: job.skills || [],
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        salaryDisplay: job.salaryDisplay,
        postedAt: job.postedAt,
        expiresAt: job.expiresAt,
        refreshedAt: new Date(),
      },
      $setOnInsert: {
        importedAt: new Date(),
      },
    };

    const result = await ExternalJob.updateOne(filter, update, { upsert: true });

    if (result.upsertedCount > 0) return "inserted";
    if (result.modifiedCount > 0) return "updated";
    return "unchanged";
  } catch (error) {
    if (error.code === 11000) return "unchanged";
    console.error(`[externalJobSync] Error upserting job "${job.externalId}":`, error.message);
    return "error";
  }
}

/** Runs external jobs sync cycle. */
export async function syncExternalJobs({ force = false } = {}) {
  console.log("[externalJobSync] Starting sync cycle...");

  let state = await SyncState.findOne({ key: "external_job_sync" });
  if (!state) {
    state = await SyncState.create({ key: "external_job_sync" });
  }

  const syncInterval = parseInt(process.env.EXTERNAL_JOB_SYNC_INTERVAL_MS) || 6 * 60 * 60 * 1_000;
  if (!force && state.lastSyncCompletedAt) {
    const timeSinceLastSync = Date.now() - new Date(state.lastSyncCompletedAt).getTime();
    if (timeSinceLastSync < syncInterval) {
      const minutesRemaining = Math.round((syncInterval - timeSinceLastSync) / 60_000);
      console.log(
        `[externalJobSync] Recent sync completed at ${state.lastSyncCompletedAt.toISOString()}. Skipping sync (${minutesRemaining}m until next scheduled sync).`
      );
      return { inserted: 0, updated: 0, errors: 0, skipped: true, reason: "recently_synced" };
    }
  }

  await SyncState.updateOne(
    { key: "external_job_sync" },
    { $set: { status: "running", lastSyncStartedAt: new Date() } }
  );

  const keywords = getSyncKeywords();
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  const providers = jobProviderManager.getAllProviders().filter((p) => p.isConfigured());

  if (providers.length === 0) {
    console.warn("[externalJobSync] No external job providers configured. Sync skipped.");
    await SyncState.updateOne({ key: "external_job_sync" }, { $set: { status: "idle" } });
    return { inserted: 0, updated: 0, errors: 0, skipped: true, reason: "no_providers_configured" };
  }

  for (const keyword of keywords) {
    for (const provider of providers) {
      const providerName = provider.providerName;

      // Rate limit budget check
      const budget = await RateLimiter.checkLimit(providerName);
      if (!budget.allowed) {
        console.warn(`[externalJobSync] Skipping keyword "${keyword}" on ${providerName}: ${budget.reason}`);
        continue;
      }

      try {
        await RateLimiter.recordHit(providerName);
        const jobs = await provider.searchJobs({ keyword, page: 1, pageSize: PAGE_SIZE });
        const uniqueJobs = deduplicateJobs(jobs);

        for (const job of uniqueJobs) {
          const outcome = await upsertJob(job);
          if (outcome === "inserted") inserted++;
          else if (outcome === "updated") updated++;
          else if (outcome === "unchanged") unchanged++;
          else errors++;
        }
      } catch (err) {
        console.error(`[externalJobSync] Error syncing keyword "${keyword}" on ${providerName}:`, err.message);
        errors++;
      }

      // Delay between queries
      await new Promise((resolve) => setTimeout(resolve, KEYWORD_DELAY_MS));
    }
  }

  const completedAt = new Date();
  await SyncState.updateOne(
    { key: "external_job_sync" },
    {
      $set: {
        status: "idle",
        lastSyncCompletedAt: completedAt,
        lastStats: { inserted, updated, unchanged, errors },
      },
    }
  );

  console.log(
    `[externalJobSync] Sync complete. inserted=${inserted} updated=${updated} unchanged=${unchanged} errors=${errors}`
  );
  return { inserted, updated, unchanged, errors, skipped: false };
}

/** Starts recurring sync interval. */
export function scheduleSyncLoop(intervalMs) {
  const interval = intervalMs || parseInt(process.env.EXTERNAL_JOB_SYNC_INTERVAL_MS) || 6 * 60 * 60 * 1_000;
  console.log(`[externalJobSync] Scheduling sync loop every ${Math.round(interval / 60_000)} minutes.`);

  syncExternalJobs({ force: false }).catch((err) =>
    console.error("[externalJobSync] Startup sync failed:", err.message)
  );

  setInterval(() => {
    syncExternalJobs({ force: true }).catch((err) =>
      console.error("[externalJobSync] Scheduled sync failed:", err.message)
    );
  }, interval);
}
