/**
 * IngestionRun — records detailed per-sync-cycle logs per provider.
 * Used by the admin dashboard to show ingestion history with errors.
 */
import mongoose from "mongoose";

const errorEntrySchema = new mongoose.Schema(
  {
    keyword: { type: String, default: "" },
    message: { type: String, required: true },
    code: { type: String, default: "" },
  },
  { _id: false }
);

const providerRunSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    inserted: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    unchanged: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    errorDetails: { type: [errorEntrySchema], default: [] },
    durationMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const ingestionRunSchema = new mongoose.Schema(
  {
    /** ISO timestamp of when the sync cycle started. */
    startedAt: { type: Date, required: true },
    /** ISO timestamp of when the sync cycle ended. */
    completedAt: { type: Date, default: null },
    /** Overall outcome: running | completed | failed */
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "running",
    },
    /** Whether the run was triggered manually or by the scheduler. */
    triggeredBy: {
      type: String,
      enum: ["scheduler", "manual"],
      default: "scheduler",
    },
    /** Keywords that were searched during this run. */
    keywords: { type: [String], default: [] },
    /** Per-provider breakdowns. */
    providers: { type: [providerRunSchema], default: [] },
    /** Aggregate totals. */
    totalInserted: { type: Number, default: 0 },
    totalUpdated: { type: Number, default: 0 },
    totalUnchanged: { type: Number, default: 0 },
    totalErrors: { type: Number, default: 0 },
    /** Duration of the full run in milliseconds. */
    durationMs: { type: Number, default: 0 },
    /** Top-level error if the run itself failed. */
    fatalError: { type: String, default: null },
  },
  {
    timestamps: false,
    collection: "ingestionruns",
  }
);

// Index for paginated dashboard queries
ingestionRunSchema.index({ startedAt: -1 });
ingestionRunSchema.index({ status: 1 });

export const IngestionRun = mongoose.model("IngestionRun", ingestionRunSchema);
