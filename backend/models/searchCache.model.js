import mongoose from "mongoose";

const searchCacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    query: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "all",
    },
    page: {
      type: Number,
      default: 1,
    },
    jobIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExternalJob",
      },
    ],
    totalCount: {
      type: Number,
      default: 0,
    },
    providersQueried: [
      {
        type: String,
      },
    ],
    // 2-hour TTL
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

searchCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SearchCache = mongoose.model("SearchCache", searchCacheSchema);
