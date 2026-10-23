import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "recruiter"],
      required: true,
    },
    profile: {
      bio: { type: String },
      skills: [{ type: String }],
      resume: { type: String },
      resumeOriginalName: { type: String },
      resumeMetadata: {
        fileId: { type: String },
        storageKey: { type: String },
        originalName: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date },
        updatedAt: { type: Date },
      },
      company: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
      profilePhoto: {
        type: String,
        default: "",
      },
      googleEmail: { type: String },
      githubEmail: { type: String },
    },

    // ─── HR / Recruiter Verification Fields ───────────────────────────────────
    /** HR account verification status. Only applicable when role === "recruiter". */
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    /** Job title / designation of the HR professional. */
    designation: {
      type: String,
      trim: true,
      default: "",
    },
    /** Structured company details submitted during HR registration. */
    companyDetails: {
      companyName: { type: String, trim: true, default: "" },
      companyWebsite: { type: String, trim: true, default: "" },
      companyEmail: { type: String, trim: true, default: "" },
      companyIndustry: { type: String, trim: true, default: "" },
      companySize: { type: String, trim: true, default: "" },
      companyAddress: { type: String, trim: true, default: "" },
      companyCityState: { type: String, trim: true, default: "" },
      companyCountry: { type: String, trim: true, default: "" },
      companyRegistrationInfo: { type: String, trim: true, default: "" },
    },
    /** Optional LinkedIn profile URL. */
    linkedinUrl: {
      type: String,
      trim: true,
      default: "",
    },
    /** Reason the user is requesting HR access. */
    hrAccessReason: {
      type: String,
      trim: true,
      default: "",
    },
    /** Whether the HR user agreed to Terms & Privacy Policy during registration. */
    agreedToTerms: {
      type: Boolean,
      default: false,
    },

    // ─── Verification Audit Trail ─────────────────────────────────────────────
    /** Timestamp of the most recent admin verification decision. */
    verificationReviewedAt: {
      type: Date,
      default: null,
    },
    /** Admin identifier who made the verification decision. */
    verificationReviewedBy: {
      type: String,
      default: null,
    },
    /** Reason provided by admin when rejecting the HR registration. */
    rejectionReason: {
      type: String,
      default: null,
    },
    /** Reason provided by admin when suspending the HR account. */
    suspensionReason: {
      type: String,
      default: null,
    },

    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index({ "profile.googleEmail": 1 }, { sparse: true });
userSchema.index({ "profile.githubEmail": 1 }, { sparse: true });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });
// HR verification queries
userSchema.index({ role: 1, verificationStatus: 1 });
userSchema.index({ "companyDetails.companyName": 1 }, { sparse: true });

export const User = mongoose.model("User", userSchema);