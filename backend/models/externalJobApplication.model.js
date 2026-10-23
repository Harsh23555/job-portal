/**
 * ExternalJobApplication — tracks internal applications submitted via JobSphere
 * for jobs sourced from external providers (Adzuna, Jooble, Remotive).
 *
 * Since we cannot submit to 3rd-party ATS systems, this is the internal record.
 * Applications show up in "My Applications" alongside internal job applications.
 */
import mongoose from "mongoose";

const externalJobApplicationSchema = new mongoose.Schema(
  {
    /** The user who applied */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** Reference to the ExternalJob record */
    externalJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExternalJob",
      default: null,
    },

    /** Snapshot of job details at time of application (provider may expire jobs) */
    jobSnapshot: {
      title: { type: String, required: true },
      companyName: { type: String, default: "" },
      location: { type: String, default: "" },
      jobType: { type: String, default: "" },
      salaryDisplay: { type: String, default: "" },
      provider: { type: String, default: "" },
      externalUrl: { type: String, default: "" },
      skills: { type: [String], default: [] },
      isRemote: { type: Boolean, default: false },
      description: { type: String, default: "" },
    },

    /** AI-generated or user-edited cover letter */
    coverLetter: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    /** Answers to standard application questions */
    applicantDetails: {
      fullname: { type: String, default: "" },
      email: { type: String, default: "" },
      phoneNumber: { type: String, default: "" },
      yearsOfExperience: { type: String, default: "" },
      linkedinUrl: { type: String, default: "" },
      portfolioUrl: { type: String, default: "" },
      availableFrom: { type: String, default: "" },
      skills: { type: [String], default: [] },
    },

    /** ATS skill match score at time of application */
    atsScore: {
      type: Number,
      default: null,
    },

    /** Application lifecycle status */
    status: {
      type: String,
      enum: ["applied", "viewed", "archived"],
      default: "applied",
    },

    /** Whether the AI helped auto-fill this application */
    aiAssisted: {
      type: Boolean,
      default: true,
    },

    /** The model that generated the cover letter */
    aiModel: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "externaljobapplications",
  }
);

// Prevent duplicate applications
externalJobApplicationSchema.index(
  { userId: 1, externalJobId: 1 },
  { unique: true, sparse: true }
);

// For "My Applications" queries
externalJobApplicationSchema.index({ userId: 1, createdAt: -1 });

export const ExternalJobApplication = mongoose.model(
  "ExternalJobApplication",
  externalJobApplicationSchema
);
