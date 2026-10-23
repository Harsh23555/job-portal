import mongoose from "mongoose";

const externalJobSchema = new mongoose.Schema(
  {
    // Source tracking
    provider: {
      type: String,
      required: true,
      enum: ["adzuna", "jooble"],
      lowercase: true,
      trim: true,
    },
    externalId: {
      type: String,
      required: true,
    },
    externalUrl: {
      type: String,
      required: true,
    },

    // Normalized job details
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    companyName: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    locationRaw: {
      type: String,
      default: "",
    },
    isRemote: {
      type: Boolean,
      default: false,
    },
    jobType: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    salaryMin: {
      type: Number,
      default: null,
    },
    salaryMax: {
      type: Number,
      default: null,
    },
    salaryCurrency: {
      type: String,
      default: "",
    },
    salaryDisplay: {
      type: String,
      default: "",
    },

    // Dates
    postedAt: {
      type: Date,
      default: null,
    },
    importedAt: {
      type: Date,
      default: Date.now,
    },
    refreshedAt: {
      type: Date,
      default: Date.now,
    },
    // TTL expiration
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Snake_case virtuals
externalJobSchema.virtual("source").get(function () {
  return this.provider;
});

externalJobSchema.virtual("external_id").get(function () {
  return this.externalId;
});

externalJobSchema.virtual("company").get(function () {
  return this.companyName;
});

externalJobSchema.virtual("apply_url").get(function () {
  return this.externalUrl;
});

externalJobSchema.virtual("source_url").get(function () {
  return this.externalUrl;
});

externalJobSchema.virtual("posted_date").get(function () {
  return this.postedAt;
});

externalJobSchema.virtual("fetched_at").get(function () {
  return this.importedAt;
});

externalJobSchema.virtual("refreshed_at").get(function () {
  return this.refreshedAt;
});

externalJobSchema.virtual("job_type").get(function () {
  return this.jobType;
});

externalJobSchema.virtual("salary_min").get(function () {
  return this.salaryMin;
});

externalJobSchema.virtual("salary_max").get(function () {
  return this.salaryMax;
});

externalJobSchema.virtual("salary_currency").get(function () {
  return this.salaryCurrency;
});

// Frontend id alias
externalJobSchema.virtual("id").get(function () {
  return this._id ? this._id.toHexString() : undefined;
});

// Deduplication index
externalJobSchema.index({ provider: 1, externalId: 1 }, { unique: true });

// TTL index
externalJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Search indexes
externalJobSchema.index({ title: "text", description: "text", companyName: "text" });
externalJobSchema.index({ location: 1 });
externalJobSchema.index({ category: 1 });
externalJobSchema.index({ postedAt: -1 });
externalJobSchema.index({ importedAt: -1 });
externalJobSchema.index({ refreshedAt: -1 });

export const ExternalJob = mongoose.model("ExternalJob", externalJobSchema);
