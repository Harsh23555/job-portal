"use strict";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  MapPin,
  DollarSign,
  Plus,
  X,
  ArrowRight,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import { useTheme, T } from "../context/ThemeContext";
import API from "../services/api";

export default function CandidateOnboardingWizard({ user, onComplete }) {
  const { isDark } = useTheme();

  // Wizard Steps: 1: Upload & Consent, 2: AI Analyzing, 3: Review & Confirm Profile, 4: Done
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Extracted Profile Form State
  const [profile, setProfile] = useState({
    fullname: user?.fullname || "",
    currentTitle: "",
    summary: "",
    skills: [],
    softSkills: [],
    experienceYears: 0,
    education: [],
    certifications: [],
    projects: [],
    preferredJobTitles: [],
    preferredLocations: [],
    remotePreference: "any",
    expectedSalary: "",
  });

  // Temp inputs for adding skills / tags
  const [newSkill, setNewSkill] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.toLowerCase();
    if (!ext.endsWith(".pdf") && !ext.endsWith(".docx") && !ext.endsWith(".doc") && !ext.endsWith(".txt")) {
      setUploadError("Please upload a PDF, DOCX, DOC, or TXT resume file.");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB. Please upload a smaller file.");
      return;
    }

    setUploadError("");
    setFile(selected);
  };

  const handleStartAnalysis = async () => {
    if (!file) {
      setUploadError("Please select your resume file to continue.");
      return;
    }

    if (!consent) {
      setUploadError("Your consent to analyze your resume is required to proceed.");
      return;
    }

    setUploadError("");
    setIsUploading(true);
    setStep(2);

    try {
      // 1. Upload resume to private storage
      const formData = new FormData();
      formData.append("resume", file);

      const uploadRes = await API.post("/user/profile/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 2. Run structured AI analysis
      const analyzeRes = await API.post("/user/analyze-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const analysis = analyzeRes.data?.analysis || {};

      // Aggregate skills extracted from resume
      const extractedSkills = [];
      if (analysis.skills?.programming_languages) {
        extractedSkills.push(...analysis.skills.programming_languages.map((s) => s.name || s));
      }
      if (analysis.skills?.frameworks) {
        extractedSkills.push(...analysis.skills.frameworks.map((s) => s.name || s));
      }
      if (analysis.skills?.databases) {
        extractedSkills.push(...analysis.skills.databases.map((s) => s.name || s));
      }
      if (analysis.skills?.cloud_devops) {
        extractedSkills.push(...analysis.skills.cloud_devops.map((s) => s.name || s));
      }
      if (analysis.skills?.technical_skills) {
        extractedSkills.push(...analysis.skills.technical_skills.map((s) => s.name || s));
      }
      if (uploadRes.data?.user?.profile?.skills) {
        extractedSkills.push(...uploadRes.data.user.profile.skills);
      }

      const cleanSkills = [...new Set(extractedSkills.filter(Boolean))].slice(0, 30);
      const softSkills = Array.isArray(analysis.skills?.soft_skills)
        ? analysis.skills.soft_skills.map((s) => s.name || s).slice(0, 15)
        : [];

      // Determine experience years
      let expYears = 0;
      if (typeof analysis.experience_level?.level === "string") {
        const lvl = analysis.experience_level.level.toLowerCase();
        if (lvl.includes("senior")) expYears = 5;
        else if (lvl.includes("mid")) expYears = 3;
        else if (lvl.includes("junior")) expYears = 1;
      }

      // Recommended job titles
      const recommendedTitles = Array.isArray(analysis.recommended_jobs)
        ? analysis.recommended_jobs.map((j) => j.role).filter(Boolean).slice(0, 3)
        : [];

      setProfile({
        fullname: user?.fullname || "",
        currentTitle: recommendedTitles[0] || "Software Engineer",
        summary: analysis.summary || "Experienced professional seeking new growth opportunities.",
        skills: cleanSkills,
        softSkills,
        experienceYears: expYears,
        education: [],
        certifications: [],
        projects: [],
        preferredJobTitles: recommendedTitles,
        preferredLocations: ["Remote"],
        remotePreference: "any",
        expectedSalary: "",
      });

      // Move to step 3: Review profile
      setStep(3);
    } catch (err) {
      console.error("[CandidateOnboarding] Analysis failed:", err);
      setUploadError(err.response?.data?.message || err.message || "Failed to analyze resume. Please try again.");
      setStep(1);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    if (!profile.skills.includes(newSkill.trim())) {
      setProfile((prev) => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleAddTitle = () => {
    if (!newTitle.trim()) return;
    if (!profile.preferredJobTitles.includes(newTitle.trim())) {
      setProfile((prev) => ({
        ...prev,
        preferredJobTitles: [...prev.preferredJobTitles, newTitle.trim()],
      }));
    }
    setNewTitle("");
  };

  const handleRemoveTitle = (title) => {
    setProfile((prev) => ({
      ...prev,
      preferredJobTitles: prev.preferredJobTitles.filter((t) => t !== title),
    }));
  };

  const handleAddLocation = () => {
    if (!newLocation.trim()) return;
    if (!profile.preferredLocations.includes(newLocation.trim())) {
      setProfile((prev) => ({
        ...prev,
        preferredLocations: [...prev.preferredLocations, newLocation.trim()],
      }));
    }
    setNewLocation("");
  };

  const handleRemoveLocation = (loc) => {
    setProfile((prev) => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter((l) => l !== loc),
    }));
  };

  const handleConfirmProfile = async () => {
    setIsSaving(true);
    setUploadError("");

    try {
      const payload = {
        ...profile,
        dataProcessingConsent: true,
      };

      const res = await API.post("/user/profile/confirm", payload);
      if (res.data?.success && res.data?.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setStep(4);
        setTimeout(() => {
          if (onComplete) onComplete(res.data.user);
        }, 1200);
      }
    } catch (err) {
      console.error("[handleConfirmProfile error]:", err);
      setUploadError(err.response?.data?.message || "Failed to confirm profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "24px auto 60px",
        padding: "0 20px 100px",
        fontFamily: T.font,
        color: T.text,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            background: isDark ? "rgba(124,106,247,0.15)" : "rgba(109,90,230,0.1)",
            border: `1px solid ${isDark ? "rgba(124,106,247,0.3)" : "rgba(109,90,230,0.25)"}`,
            borderRadius: 30,
            fontSize: "0.82rem",
            fontWeight: 600,
            color: T.purple,
            marginBottom: 16,
          }}
        >
          <Sparkles size={14} /> AI-Powered Resume Matching Onboarding
        </div>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: "2.4rem",
            lineHeight: 1.2,
            margin: "0 0 12px",
            color: T.text,
          }}
        >
          Discover Jobs Tailored to Your Profile
        </h1>
        <p style={{ color: T.textMid, fontSize: "1rem", maxWidth: 620, margin: "0 auto" }}>
          Upload your resume to discover jobs that match your skills, experience, education, and career goals.
        </p>
      </div>

      {/* Progress Indicators */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          marginBottom: 36,
        }}
      >
        {[
          { num: 1, label: "Upload Resume" },
          { num: 2, label: "AI Analysis" },
          { num: 3, label: "Confirm Profile" },
          { num: 4, label: "Match & Explore" },
        ].map((s, idx) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  background: isDone
                    ? T.green
                    : isActive
                    ? T.purple
                    : isDark
                    ? "rgba(255,255,255,0.06)"
                    : "#e2e8f0",
                  color: isDone || isActive ? "#fff" : T.textDim,
                  transition: "all 0.2s",
                }}
              >
                {isDone ? <CheckCircle2 size={16} /> : s.num}
              </div>
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? T.text : T.textDim,
                }}
              >
                {s.label}
              </span>
              {idx < 3 && (
                <div
                  style={{
                    width: 24,
                    height: 1,
                    background: isDone ? T.green : isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
                    marginLeft: 4,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {uploadError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.25)"}`,
            borderRadius: 12,
            color: T.red,
            fontSize: "0.88rem",
            marginBottom: 24,
          }}
        >
          <AlertCircle size={18} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* STEP 1: RESUME UPLOAD & CONSENT */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: 36,
            backdropFilter: "blur(20px)",
          }}
        >
          {/* File Dropzone */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 24px",
              border: `2px dashed ${file ? T.purple : isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"}`,
              borderRadius: 16,
              background: file
                ? isDark
                  ? "rgba(124,106,247,0.08)"
                  : "rgba(109,90,230,0.05)"
                : isDark
                ? "rgba(255,255,255,0.02)"
                : "rgba(0,0,0,0.01)",
              cursor: "pointer",
              transition: "all 0.2s",
              textAlign: "center",
            }}
          >
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {file ? (
              <>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: "linear-gradient(135deg, #7c6af7, #4ade80)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    marginBottom: 16,
                  }}
                >
                  <FileText size={28} />
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: T.text }}>
                  {file.name}
                </h3>
                <span style={{ fontSize: "0.82rem", color: T.textDim }}>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI Parsing
                </span>
                <span style={{ fontSize: "0.78rem", color: T.purple, marginTop: 8, fontWeight: 600 }}>
                  Click to replace file
                </span>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: T.purple,
                    marginBottom: 16,
                  }}
                >
                  <UploadCloud size={28} />
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: T.text }}>
                  Choose a file or drag & drop here
                </h3>
                <span style={{ fontSize: "0.85rem", color: T.textDim, marginBottom: 8 }}>
                  Supports PDF, DOCX, DOC, or TXT (up to 5MB)
                </span>
              </>
            )}
          </label>

          {/* Privacy & Consent Agreement */}
          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <input
              type="checkbox"
              id="consent-checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{
                marginTop: 4,
                width: 18,
                height: 18,
                accentColor: T.purple,
                cursor: "pointer",
              }}
            />
            <label
              htmlFor="consent-checkbox"
              style={{ fontSize: "0.85rem", color: T.textMid, lineHeight: 1.5, cursor: "pointer" }}
            >
              <strong style={{ color: T.text, display: "block", marginBottom: 2 }}>
                Data Processing & AI Analysis Consent
              </strong>
              I consent to JobSphere securely storing and analyzing my resume with AI models to extract my profile, generate semantic embeddings for job matching, and prepare application materials. I can update or delete my data at any time.
            </label>
          </div>

          {/* Continue Button */}
          <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleStartAnalysis}
              disabled={!file || !consent || isUploading}
              style={{
                padding: "12px 28px",
                background:
                  file && consent
                    ? "linear-gradient(135deg, #7c6af7, #5b48e0)"
                    : isDark
                    ? "rgba(255,255,255,0.1)"
                    : "#cbd5e1",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: "0.95rem",
                cursor: file && consent ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: file && consent ? "0 4px 16px rgba(124,106,247,0.35)" : "none",
                transition: "all 0.2s",
              }}
            >
              <span>Analyze Resume with AI</span>
              <ArrowRight size={17} />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: AI ANALYZING SPINNER */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: isDark ? "rgba(124,106,247,0.15)" : "rgba(109,90,230,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              color: T.purple,
              animation: "spin 2s linear infinite",
            }}
          >
            <RotateCw size={36} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontFamily: T.serif, margin: "0 0 10px", color: T.text }}>
            Analyzing Your Resume
          </h2>
          <p style={{ color: T.textMid, fontSize: "0.95rem", maxWidth: 440, margin: "0 auto 16px" }}>
            Extracting skills, career experience, education, and computing structured candidate profile...
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: T.textDim }}>
            <ShieldCheck size={14} color={T.green} /> Truthful extraction — no qualifications will be fabricated.
          </div>
        </motion.div>
      )}

      {/* STEP 3: REVIEW & CONFIRM PROFILE */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: 32,
          }}
        >
          <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.purple, fontWeight: 600, fontSize: "0.85rem", marginBottom: 4 }}>
              <CheckCircle2 size={16} /> Resume Analyzed Successfully
            </div>
            <h2 style={{ fontSize: "1.5rem", fontFamily: T.serif, margin: "0 0 4px", color: T.text }}>
              Confirm Your Candidate Profile
            </h2>
            <p style={{ color: T.textMid, fontSize: "0.88rem", margin: 0 }}>
              Review the extracted details below. You can correct inaccurate details or add missing preferences before discovering matching jobs.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Title & Experience Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
                  Current / Primary Job Title
                </label>
                <input
                  type="text"
                  value={profile.currentTitle}
                  onChange={(e) => setProfile({ ...profile, currentTitle: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    color: T.text,
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
                  Total Relevant Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={profile.experienceYears}
                  onChange={(e) => setProfile({ ...profile, experienceYears: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    color: T.text,
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
                Professional Summary
              </label>
              <textarea
                rows={3}
                value={profile.summary}
                onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  color: T.text,
                  fontSize: "0.88rem",
                  lineHeight: 1.5,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: T.font,
                }}
              />
            </div>

            {/* Verified Skills */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
                Extracted Skills ({profile.skills.length})
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: 12,
                  background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  minHeight: 48,
                  marginBottom: 10,
                }}
              >
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      background: isDark ? "rgba(124,106,247,0.18)" : "rgba(109,90,230,0.12)",
                      border: `1px solid ${isDark ? "rgba(124,106,247,0.3)" : "rgba(109,90,230,0.25)"}`,
                      borderRadius: 20,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: T.purple,
                    }}
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      style={{
                        background: "none",
                        border: "none",
                        color: T.textDim,
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                      }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Skill Input */}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Add another skill (e.g., Docker, PostgreSQL)..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    color: T.text,
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  style={{
                    padding: "8px 16px",
                    background: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                    border: "none",
                    borderRadius: 8,
                    color: T.text,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Career Preferences Section */}
            <div
              style={{
                marginTop: 8,
                padding: 18,
                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                borderRadius: 14,
                border: `1px solid ${T.border}`,
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 12px", color: T.text }}>
                Career Preferences for Job Matching
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Remote Preference */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
                    Workplace Setting
                  </label>
                  <select
                    value={profile.remotePreference}
                    onChange={(e) => setProfile({ ...profile, remotePreference: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      color: T.text,
                      fontSize: "0.88rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="any">Any (Remote, Hybrid, or Onsite)</option>
                    <option value="remote">Remote Only</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite Only</option>
                  </select>
                </div>

                {/* Expected Salary */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
                    Expected Annual Salary (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 800000 (INR) or 80000 (USD)"
                    value={profile.expectedSalary}
                    onChange={(e) => setProfile({ ...profile, expectedSalary: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      color: T.text,
                      fontSize: "0.88rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Preferred Job Titles */}
              <div style={{ marginTop: 14 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
                  Target Job Titles
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {profile.preferredJobTitles.map((title) => (
                    <span
                      key={title}
                      style={{
                        padding: "3px 9px",
                        background: isDark ? "rgba(74,222,128,0.15)" : "rgba(22,163,74,0.1)",
                        border: `1px solid ${isDark ? "rgba(74,222,128,0.3)" : "rgba(22,163,74,0.25)"}`,
                        borderRadius: 16,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: T.green,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {title}
                      <button
                        type="button"
                        onClick={() => handleRemoveTitle(title)}
                        style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", padding: 0 }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Add target title (e.g. Python Backend Developer)..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTitle())}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      color: T.text,
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTitle}
                    style={{
                      padding: "8px 14px",
                      background: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                      border: "none",
                      borderRadius: 8,
                      color: T.text,
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Add Title
                  </button>
                </div>
              </div>
            </div>

            {/* Confirm & Save Button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: "none",
                  border: `1px solid ${T.border}`,
                  padding: "10px 18px",
                  borderRadius: 10,
                  color: T.textMid,
                  cursor: "pointer",
                  fontSize: "0.88rem",
                }}
              >
                Re-upload Resume
              </button>

              <button
                type="button"
                onClick={handleConfirmProfile}
                disabled={isSaving}
                style={{
                  padding: "12px 32px",
                  background: "linear-gradient(135deg, #7c6af7, #4ade80)",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 18px rgba(124,106,247,0.35)",
                }}
              >
                {isSaving ? (
                  <>
                    <RotateCw size={17} style={{ animation: "spin 1s linear infinite" }} />
                    <span>Generating Vector Embeddings...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirm Profile & Unlock Job Discovery</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4ade80, #22c55e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "white",
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: "1.6rem", fontFamily: T.serif, margin: "0 0 8px", color: T.text }}>
            Profile Confirmed!
          </h2>
          <p style={{ color: T.textMid, fontSize: "0.95rem", maxWidth: 420, margin: "0 auto" }}>
            Resume embeddings generated. Loading your personalized job recommendations...
          </p>
        </motion.div>
      )}
    </div>
  );
}
