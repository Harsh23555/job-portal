import mongoose from "mongoose";

const syncStateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "external_job_sync",
    },
    lastSyncStartedAt: {
      type: Date,
      default: null,
    },
    lastSyncCompletedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["idle", "running", "failed"],
      default: "idle",
    },
    lastStats: {
      inserted: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const SyncState = mongoose.model("SyncState", syncStateSchema);
