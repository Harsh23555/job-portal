import mongoose from "mongoose";

/** SavedJob model for bookmarked jobs. */
const savedJobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Internal job ref
    internalJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    // External job ref
    externalJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExternalJob",
      default: null,
    },
    // Job snapshot
    jobSnapshot: {
      title: { type: String, default: "" },
      companyName: { type: String, default: "" },
      location: { type: String, default: "" },
      jobType: { type: String, default: "" },
      isExternal: { type: Boolean, default: false },
      provider: { type: String, default: "internal" },
      externalUrl: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Compound unique indexes
savedJobSchema.index({ user: 1, internalJobId: 1 }, { unique: true, sparse: true });
savedJobSchema.index({ user: 1, externalJobId: 1 }, { unique: true, sparse: true });
savedJobSchema.index({ user: 1, createdAt: -1 });

export const SavedJob = mongoose.model("SavedJob", savedJobSchema);
