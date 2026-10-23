import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  requirements: [{
    type: String,
  }],
  salary: {
    type: Number,
    required: true,
  },
  experiencelevel: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  jobType: {
    type: String,
    required: true,
  },
  // Job category
  category: {
    type: String,
    default: "",
    trim: true,
  },
  position: {
    type: Number,
    required: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  logo: {
    type: String,
  },
  applications: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
    },
  ],
}, { timestamps: true });

// Performance indexes
jobSchema.index({ location: 1 });
jobSchema.index({ created_by: 1 });
jobSchema.index({ company: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ title: 1, createdAt: -1 });
jobSchema.index({ category: 1 });

// Full-text search index
jobSchema.index(
  { title: "text", description: "text", requirements: "text" },
  { name: "job_text_search", weights: { title: 10, requirements: 5, description: 1 } }
);

export const Job = mongoose.model("Job", jobSchema);