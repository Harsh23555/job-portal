/**
 * EmbeddingScheduler — background loop that generates and stores embeddings
 * for ExternalJob documents that don't yet have one (or have a stale model version).
 *
 * Runs:
 *  1. On startup (after a short delay to not block boot)
 *  2. After each sync cycle is triggered externally via scheduleEmbeddingAfterSync()
 */
import { ExternalJob } from "../models/externalJob.model.js";
import { JobEmbedding } from "../models/jobEmbedding.model.js";
import { embedText, buildJobEmbeddingText, getModelVersion, getEmbeddingDimensions, hashText } from "./embeddingService.js";

const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE, 10) || 20;
const STARTUP_DELAY_MS = 15_000; // 15s after boot
const INTER_BATCH_DELAY_MS = 500;
const MODEL_VERSION = getModelVersion();

let schedulerRunning = false;

/**
 * Runs one full pass of the embedding scheduler:
 * finds unembedded (or stale) jobs and embeds them.
 */
export async function runEmbeddingPass() {
  if (schedulerRunning) {
    console.log("[EmbeddingScheduler] Pass already in progress, skipping.");
    return;
  }

  schedulerRunning = true;
  let embedded = 0;
  let skipped = 0;
  let errors = 0;

  try {
    console.log("[EmbeddingScheduler] Starting embedding pass...");

    // Find job IDs that already have current-model embeddings
    const existingEmbeds = await JobEmbedding.find({ modelVersion: MODEL_VERSION }, { jobId: 1 }).lean();
    const embeddedIds = new Set(existingEmbeds.map((e) => e.jobId.toString()));

    // Query jobs without embeddings, process in batches
    let skip = 0;
    while (true) {
      const jobs = await ExternalJob.find({})
        .select("_id title description companyName skills")
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (jobs.length === 0) break;

      const pending = jobs.filter((j) => !embeddedIds.has(j._id.toString()));
      skip += jobs.length;

      for (const job of pending) {
        try {
          const text = buildJobEmbeddingText(job);
          if (!text.trim()) { skipped++; continue; }

          const textHash = hashText(text);

          // Check if text changed (for already-embedded jobs with same model but different text)
          const existingEmbed = await JobEmbedding.findOne({ jobId: job._id, modelVersion: MODEL_VERSION });
          if (existingEmbed && existingEmbed.textHash === textHash) {
            skipped++;
            continue;
          }

          const vector = await embedText(text);
          const dims = getEmbeddingDimensions();

          await JobEmbedding.findOneAndUpdate(
            { jobId: job._id, modelVersion: MODEL_VERSION },
            {
              $set: {
                vector,
                dimensions: dims,
                textHash,
                embeddedAt: new Date(),
              },
            },
            { upsert: true, new: true }
          );

          embedded++;
          embeddedIds.add(job._id.toString());
        } catch (err) {
          console.error(`[EmbeddingScheduler] Failed to embed job ${job._id}:`, err.message);
          errors++;
        }
      }

      if (pending.length > 0) {
        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
      }
    }

    console.log(`[EmbeddingScheduler] Pass complete. embedded=${embedded} skipped=${skipped} errors=${errors}`);
  } catch (err) {
    console.error("[EmbeddingScheduler] Fatal error in embedding pass:", err.message);
  } finally {
    schedulerRunning = false;
  }

  return { embedded, skipped, errors };
}

/**
 * Starts the embedding scheduler on server startup.
 * Runs an initial pass after STARTUP_DELAY_MS.
 */
export function startEmbeddingScheduler() {
  const provider = process.env.EMBEDDING_PROVIDER || "local";
  console.log(`[EmbeddingScheduler] Scheduling embedding pass in ${STARTUP_DELAY_MS / 1000}s (provider: ${provider}, model: ${MODEL_VERSION})`);

  setTimeout(() => {
    runEmbeddingPass().catch((err) => {
      console.error("[EmbeddingScheduler] Startup pass failed:", err.message);
    });
  }, STARTUP_DELAY_MS);
}

/**
 * Hook to call after a sync cycle completes.
 * Delays briefly then runs an embedding pass to cover new jobs.
 */
export function scheduleEmbeddingAfterSync() {
  setTimeout(() => {
    runEmbeddingPass().catch((err) => {
      console.error("[EmbeddingScheduler] Post-sync pass failed:", err.message);
    });
  }, 5_000); // 5s delay after sync
}
