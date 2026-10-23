"use strict";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Zap,
  AlertTriangle,
  AlertCircle,
  Briefcase,
  Code2,
  Sparkles,
  Target,
  ArrowRight,
  RefreshCw,
  Award,
  BookOpen,
  Layers,
  ChevronRight,
  TrendingUp,
  X,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button, GlassCard } from "./JobPortal";
import API from "./services/api";
import { useTheme, T } from "./context/ThemeContext";

const SKILL_CATEGORY_LABELS = {
  programming_languages: "Programming Languages",
  frameworks: "Frameworks & Libraries",
  databases: "Databases & Storage",
  cloud_devops: "Cloud & DevOps",
  tools: "Tools & Platforms",
  technical_skills: "Technical Concepts",
  soft_skills: "Soft Skills & Leadership",
  domain_skills: "Domain Knowledge",
};

const STATUS_CONFIG = {
  explicitly_mentioned: {
    label: "Explicit",
    bg: "rgba(148, 163, 184, 0.12)",
    color: "#94a3b8",
    border: "rgba(148, 163, 184, 0.25)",
  },
  demonstrated_in_project: {
    label: "In Project",
    bg: "rgba(124, 106, 247, 0.15)",
    color: "#a090ff",
    border: "rgba(124, 106, 247, 0.35)",
  },
  demonstrated_in_experience: {
    label: "In Work Exp",
    bg: "rgba(74, 222, 128, 0.15)",
    color: "#4ade80",
    border: "rgba(74, 222, 128, 0.35)",
  },
  inferred: {
    label: "Inferred",
    bg: "rgba(250, 204, 21, 0.15)",
    color: "#facc15",
    border: "rgba(250, 204, 21, 0.35)",
  },
};

const PRIORITY_BADGES = {
  high: {
    label: "High Priority",
    bg: "rgba(239, 68, 68, 0.14)",
    color: "#f87171",
    border: "rgba(239, 68, 68, 0.3)",
  },
  medium: {
    label: "Medium Priority",
    bg: "rgba(250, 204, 21, 0.14)",
    color: "#facc15",
    border: "rgba(250, 204, 21, 0.3)",
  },
  low: {
    label: "Low Priority",
    bg: "rgba(96, 165, 250, 0.14)",
    color: "#60a5fa",
    border: "rgba(96, 165, 250, 0.3)",
  },
};

const MATCH_LEVEL_CONFIG = {
  strong: {
    label: "Strong Match",
    bg: "rgba(74, 222, 128, 0.15)",
    color: "#4ade80",
    barColor: "#4ade80",
  },
  good: {
    label: "Good Match",
    bg: "rgba(124, 106, 247, 0.15)",
    color: "#a090ff",
    barColor: "#7c6af7",
  },
  partial: {
    label: "Partial Match",
    bg: "rgba(250, 204, 21, 0.15)",
    color: "#facc15",
    barColor: "#facc15",
  },
};

export function ResumeAnalyzerView() {
  const { isDark } = useTheme();
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [results, setResults] = useState(null);
  const [activeFileName, setActiveFileName] = useState("");
  const [analyzedAt, setAnalyzedAt] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [activeSkillCategory, setActiveSkillCategory] = useState("all");
  const [skillStatusFilter, setSkillStatusFilter] = useState("all");
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"];

  const validateResumeFile = (selected) => {
    if (!selected) return null;
    const ext = selected.name ? selected.name.slice(selected.name.lastIndexOf(".")).toLowerCase() : "";
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      return "Unsupported file format. Please upload a PDF, DOC, DOCX, or TXT resume.";
    }
    if (selected.size > MAX_FILE_SIZE) {
      const sizeMB = (selected.size / (1024 * 1024)).toFixed(1);
      return `Selected file is too large (${sizeMB}MB). Maximum allowed size is 5MB. Please choose a smaller file.`;
    }
    return null;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const error = validateResumeFile(selected);
      if (error) {
        setErrorMsg(error);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(selected);
      setErrorMsg("");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      const error = validateResumeFile(selected);
      if (error) {
        setErrorMsg(error);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(selected);
      setErrorMsg("");
    }
  };

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analyzeResume = async () => {
    if (!file || analyzing) return;
    setAnalyzing(true);
    setErrorMsg("");
    setLoadingStage("Extracting & normalizing resume text...");

    const stageTimer1 = setTimeout(() => {
      setLoadingStage("Groq AI evaluating skills, experience & career fit...");
    }, 1800);

    const stageTimer2 = setTimeout(() => {
      setLoadingStage("Validating structured evidence & recommendations...");
    }, 4500);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const userStr = localStorage.getItem("user");
      const userHeaders = {};
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u?._id) userHeaders["x-user-id"] = u._id;
        } catch (e) {}
      }
      const token = localStorage.getItem("token");
      if (token) userHeaders["Authorization"] = `Bearer ${token}`;

      const res = await API.post("/user/analyze-resume", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...userHeaders,
        },
      });

      if (res.data.success) {
        setResults(res.data.analysis);
        setActiveFileName(res.data.fileName || file.name);
        setAnalyzedAt(res.data.createdAt || new Date().toISOString());
        setIsCached(Boolean(res.data.cached));
      } else {
        throw new Error(res.data.message || "Analysis failed");
      }
    } catch (err) {
      console.error("[ResumeAnalyzerView error]:", err);
      const serverMsg = err.response?.data?.message || err.message;
      if (err.response?.status === 413) {
        setErrorMsg("Uploaded resume exceeds the maximum 5MB limit. Please upload a smaller file.");
      } else if (err.response?.status === 429) {
        setErrorMsg("Groq AI service rate limit reached. Please wait a few moments and try again.");
      } else if (err.response?.status === 503) {
        setErrorMsg(serverMsg || "Groq AI service is not configured on the server.");
      } else {
        setErrorMsg(serverMsg || "An error occurred while analyzing the resume. Please ensure the file is a readable PDF or text file.");
      }
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setAnalyzing(false);
      setLoadingStage("");
    }
  };

  const totalSkillsCount = results?.skills
    ? Object.values(results.skills).reduce((acc, list) => acc + (list?.length || 0), 0)
    : 0;

  // Filter skills
  const getFilteredSkills = () => {
    if (!results?.skills) return [];
    let items = [];
    const categoriesToScan =
      activeSkillCategory === "all"
        ? Object.keys(SKILL_CATEGORY_LABELS)
        : [activeSkillCategory];

    for (const cat of categoriesToScan) {
      const list = results.skills[cat] || [];
      for (const skill of list) {
        if (skillStatusFilter === "all" || skill.status === skillStatusFilter) {
          items.push({ ...skill, category: cat });
        }
      }
    }
    return items;
  };

  const filteredSkills = getFilteredSkills();

  return (
    <div
      style={{
        flex: 1,
        padding: "36px 24px 60px",
        maxWidth: 1140,
        margin: "0 auto",
        width: "100%",
        fontFamily: T.font,
        boxSizing: "border-box",
      }}
    >
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: T.purpleDim,
            color: T.purpleL,
            borderRadius: 20,
            fontSize: "0.8rem",
            fontWeight: 600,
            marginBottom: 12,
            border: `1px solid ${T.borderHov}`,
          }}
        >
          <Sparkles size={14} /> Powered by Groq AI · openai/gpt-oss-120b
        </div>
        <h1
          style={{
            fontSize: "2.4rem",
            fontFamily: T.serif,
            color: T.text,
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
          }}
        >
          AI Resume Analyzer
        </h1>
        <p style={{ fontSize: "1.05rem", color: T.textMid, margin: "0 auto", maxWidth: 640, lineHeight: 1.5 }}>
          Evidence-based candidate intelligence. Get an honest audit of your actual skills, gaps, realistic job matches, and section-by-section improvements.
        </p>
      </div>

      {/* ─── Initial Loading Skeleton (while fetching latest) ─────────────── */}
      {loadingInitial && (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `3px solid ${isDark ? T.surface : "#e2e8f0"}`,
              borderTopColor: T.purple,
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: T.textMid, fontSize: "0.95rem" }}>Checking for saved resume analysis...</p>
        </div>
      )}

      {/* ─── Upload Area (Visible when no results or when requested) ─────── */}
      {!loadingInitial && !results && !analyzing && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          <div
            style={{
              background: T.surface,
              border: `2px dashed ${T.border}`,
              borderRadius: 20,
              padding: "48px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: T.purpleDim,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                border: `1px solid ${T.borderHov}`,
              }}
            >
              <UploadCloud size={36} color={T.purpleL} />
            </div>
            <h3 style={{ fontSize: "1.3rem", color: T.text, margin: "0 0 8px", fontWeight: 600 }}>
              Upload your resume
            </h3>
            <p style={{ color: T.textMid, margin: "0 0 20px", fontSize: "0.92rem", maxWidth: 460 }}>
              Drag and drop your PDF or TXT file here, or click to browse. We extract your text securely and never share your data.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.txt,.md"
              style={{ display: "none" }}
            />

            {file && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.05)",
                  border: `1px solid ${T.border}`,
                  padding: "10px 18px",
                  borderRadius: 12,
                  marginBottom: 20,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <FileText size={20} color={T.green} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: T.text, fontSize: "0.88rem", fontWeight: 600 }}>{file.name}</div>
                  <div style={{ color: T.textDim, fontSize: "0.75rem" }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  onClick={clearSelectedFile}
                  style={{
                    background: "none",
                    border: "none",
                    color: T.textDim,
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: T.red,
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontSize: "0.88rem",
                  marginBottom: 20,
                  maxWidth: 580,
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              icon={<Zap size={18} />}
              onClick={(e) => {
                e.stopPropagation();
                analyzeResume();
              }}
              disabled={!file || analyzing}
            >
              Start AI Analysis
            </Button>
          </div>

          {/* Value Props Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                icon: <ShieldCheck size={20} color={T.green} />,
                title: "100% Evidence-Based",
                desc: "No hallucinated skills or fake years of experience. Strictly factual.",
              },
              {
                icon: <Code2 size={20} color={T.purpleL} />,
                title: "Verified vs Inferred",
                desc: "Explicit skills, project-demonstrated tools, and work experience distinguished.",
              },
              {
                icon: <Briefcase size={20} color={T.orange} />,
                title: "Realistic Job Roles",
                desc: "Calculates match scores and actionable skill gaps for each potential job title.",
              },
              {
                icon: <Sparkles size={20} color={T.pink} />,
                title: "Section-by-Section Fixes",
                desc: "Actionable recommendations to upgrade your resume for human & ATS reviewers.",
              },
            ].map((prop, i) => (
              <GlassCard key={i} hover={false} style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  {prop.icon}
                  <h4 style={{ margin: 0, fontSize: "0.95rem", color: T.text, fontWeight: 600 }}>
                    {prop.title}
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem", color: T.textMid, lineHeight: 1.5 }}>
                  {prop.desc}
                </p>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Analyzing / Loading State ────────────────────────────────────── */}
      {analyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            textAlign: "center",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              border: `4px solid ${isDark ? T.surface : "#e2e8f0"}`,
              borderTopColor: T.purple,
              marginBottom: 24,
            }}
          />
          <h3 style={{ fontSize: "1.5rem", color: T.text, margin: "0 0 10px", fontFamily: T.serif }}>
            Analyzing your resume...
          </h3>
          <p style={{ color: T.purpleL, fontSize: "1rem", margin: "0 0 8px", fontWeight: 500 }}>
            {loadingStage || "Extracting resume intelligence with Groq AI..."}
          </p>
          <p style={{ color: T.textDim, fontSize: "0.85rem", margin: 0, maxWidth: 440 }}>
            Validating technical depth, extracting categorized skills, and matching realistic job markets.
          </p>
        </motion.div>
      )}

      {/* ─── Results Dashboard ────────────────────────────────────────────── */}
      <AnimatePresence>
        {results && !analyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: 28 }}
          >
            {/* Top Toolbar */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "14px 20px",
                background: T.surface,
                borderRadius: 14,
                border: `1px solid ${T.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <FileText size={20} color={T.green} />
                <span style={{ fontWeight: 600, color: T.text, fontSize: "0.95rem" }}>
                  {activeFileName || "Analyzed Resume"}
                </span>
                {isCached && (
                  <span
                    style={{
                      padding: "2px 8px",
                      background: T.purpleDim,
                      color: T.purpleL,
                      borderRadius: 12,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                    }}
                  >
                    Saved Analysis
                  </span>
                )}
                {analyzedAt && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: T.textDim,
                      fontSize: "0.78rem",
                    }}
                  >
                    <Clock size={12} />
                    {new Date(analyzedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw size={14} />}
                onClick={() => {
                  setResults(null);
                  setFile(null);
                }}
              >
                Upload Another Resume
              </Button>
            </div>

            {/* ─── Section 1: Overview & Score ───────────────────────────────── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {/* Overall Score Meter */}
              <GlassCard
                hover={false}
                style={{
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.9rem", color: T.textMid, fontWeight: 600, marginBottom: 16 }}>
                  OVERALL READINESS SCORE
                </div>
                <div
                  style={{
                    position: "relative",
                    width: 140,
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                    <circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke={isDark ? T.surface : "#e2e8f0"}
                      strokeWidth="11"
                    />
                    <motion.circle
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke={T.purple}
                      strokeWidth="11"
                      strokeDasharray="364"
                      initial={{ strokeDashoffset: 364 }}
                      animate={{
                        strokeDashoffset: 364 - (364 * (results.overall_score || 70)) / 100,
                      }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{ position: "absolute", textAlign: "center" }}>
                    <div style={{ fontSize: "2.8rem", fontWeight: 700, color: T.text, lineHeight: 1, fontFamily: T.serif }}>
                      {results.overall_score || 70}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: T.textDim, marginTop: 4 }}>out of 100</div>
                  </div>
                </div>
                <div style={{ marginTop: 18, color: T.purpleL, fontSize: "0.88rem", fontWeight: 600 }}>
                  {results.overall_score >= 85
                    ? "Exceptional Candidate Profile"
                    : results.overall_score >= 70
                    ? "Solid Technical Foundation"
                    : "Developing Candidate Profile"}
                </div>
                <div style={{ marginTop: 6, color: T.textDim, fontSize: "0.78rem" }}>
                  Composite score across demonstrated skills, project depth, and role alignment.
                </div>
              </GlassCard>

              {/* Experience Level & Narrative */}
              <GlassCard hover={false} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: "0.78rem", color: T.textDim, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6 }}>
                    IDENTIFIED EXPERIENCE LEVEL
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "6px 16px",
                        background: "linear-gradient(135deg, #7c6af7 0%, #5b4de0 100%)",
                        color: "#ffffff",
                        borderRadius: 20,
                        fontSize: "0.95rem",
                        fontWeight: 700,
                      }}
                    >
                      {results.experience_level?.level || "Insufficient evidence"}
                    </span>
                  </div>
                  <p style={{ color: T.textMid, fontSize: "0.9rem", margin: "10px 0 0", lineHeight: 1.5 }}>
                    {results.experience_level?.reason}
                  </p>
                </div>

                {results.experience_level?.evidence?.length > 0 && (
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                    <div style={{ fontSize: "0.78rem", color: T.textDim, fontWeight: 600, marginBottom: 8 }}>
                      Resume Evidence:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {results.experience_level.evidence.map((ev, i) => (
                        <span
                          key={i}
                          style={{
                            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                            border: `1px solid ${T.border}`,
                            color: T.text,
                            padding: "4px 10px",
                            borderRadius: 8,
                            fontSize: "0.78rem",
                          }}
                        >
                          "{ev}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Executive Summary */}
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                  <div style={{ fontSize: "0.78rem", color: T.textDim, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6 }}>
                    EXECUTIVE SUMMARY
                  </div>
                  <p style={{ margin: 0, color: T.text, fontSize: "0.92rem", lineHeight: 1.6 }}>
                    {results.summary}
                  </p>
                </div>
              </GlassCard>
            </div>

            {/* ─── Section 2: What is Good (Strengths with Evidence) ──────────── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <CheckCircle2 size={22} color={T.green} />
                <h2 style={{ fontSize: "1.35rem", color: T.text, margin: 0, fontWeight: 700 }}>
                  What's Good About Your Resume
                </h2>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {results.strengths?.map((str, i) => (
                  <GlassCard key={i} hover={false} style={{ padding: 22 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          background: T.greenDim,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <CheckCircle2 size={16} color={T.green} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "1rem", color: T.text, fontWeight: 600 }}>
                          {str.title}
                        </h4>
                        <p style={{ margin: "6px 0 0", color: T.textMid, fontSize: "0.88rem", lineHeight: 1.5 }}>
                          {str.description}
                        </p>
                      </div>
                    </div>
                    {str.evidence && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "8px 14px",
                          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                          borderLeft: `3px solid ${T.green}`,
                          borderRadius: "0 8px 8px 0",
                          color: T.text,
                          fontSize: "0.82rem",
                          fontStyle: "italic",
                        }}
                      >
                        Evidence: "{str.evidence}"
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            </div>

            {/* ─── Section 3: Skills Detected ────────────────────────────────── */}
            <div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Code2 size={22} color={T.purpleL} />
                  <h2 style={{ fontSize: "1.35rem", color: T.text, margin: 0, fontWeight: 700 }}>
                    Skills Detected
                  </h2>
                  <span
                    style={{
                      padding: "2px 10px",
                      background: T.purpleDim,
                      color: T.purpleL,
                      borderRadius: 14,
                      fontSize: "0.8rem",
                      fontWeight: 700,
                    }}
                  >
                    {totalSkillsCount} found
                  </span>
                </div>

                {/* Status Legend */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() =>
                        setSkillStatusFilter(skillStatusFilter === key ? "all" : key)
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 10px",
                        borderRadius: 12,
                        background: skillStatusFilter === key ? cfg.bg : "transparent",
                        border: `1px solid ${cfg.border}`,
                        color: cfg.color,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: cfg.color,
                        }}
                      />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 8,
                  marginBottom: 16,
                }}
              >
                <button
                  onClick={() => setActiveSkillCategory("all")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 10,
                    background:
                      activeSkillCategory === "all"
                        ? (isDark ? "rgba(124,106,247,0.22)" : "rgba(109,90,230,0.15)")
                        : "transparent",
                    border: `1px solid ${activeSkillCategory === "all" ? T.borderHov : T.border}`,
                    color: activeSkillCategory === "all" ? T.purpleL : T.textMid,
                    fontSize: "0.82rem",
                    fontWeight: activeSkillCategory === "all" ? 600 : 400,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  All Categories ({totalSkillsCount})
                </button>
                {Object.entries(SKILL_CATEGORY_LABELS).map(([catKey, catLabel]) => {
                  const count = results.skills?.[catKey]?.length || 0;
                  if (count === 0) return null;
                  const isActive = activeSkillCategory === catKey;
                  return (
                    <button
                      key={catKey}
                      onClick={() => setActiveSkillCategory(catKey)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 10,
                        background: isActive
                          ? (isDark ? "rgba(124,106,247,0.22)" : "rgba(109,90,230,0.15)")
                          : "transparent",
                        border: `1px solid ${isActive ? T.borderHov : T.border}`,
                        color: isActive ? T.purpleL : T.textMid,
                        fontSize: "0.82rem",
                        fontWeight: isActive ? 600 : 400,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {catLabel} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Skills Tag Cloud */}
              <GlassCard hover={false} style={{ padding: 24 }}>
                {filteredSkills.length === 0 ? (
                  <div style={{ color: T.textDim, fontSize: "0.9rem", textAlign: "center", padding: "20px 0" }}>
                    No skills matched the current filter.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {filteredSkills.map((sk, idx) => {
                      const statusCfg = STATUS_CONFIG[sk.status] || STATUS_CONFIG.explicitly_mentioned;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 12px",
                            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                            border: `1px solid ${T.border}`,
                            borderRadius: 10,
                            fontSize: "0.88rem",
                            color: T.text,
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{sk.name}</span>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 6,
                              background: statusCfg.bg,
                              color: statusCfg.color,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              border: `1px solid ${statusCfg.border}`,
                            }}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* ─── Section 4: Missing Skills (Genuine Gaps) ──────────────────── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <AlertCircle size={22} color={T.orange} />
                <h2 style={{ fontSize: "1.35rem", color: T.text, margin: 0, fontWeight: 700 }}>
                  Missing Skills & Industry Gaps
                </h2>
              </div>
              <p style={{ color: T.textMid, fontSize: "0.88rem", margin: "0 0 16px" }}>
                Targeted skill gaps relevant to your existing tech stack and likely career direction.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {results.missing_skills?.map((ms, i) => {
                  const pBadge = PRIORITY_BADGES[ms.importance] || PRIORITY_BADGES.medium;
                  return (
                    <GlassCard key={i} hover={false} style={{ padding: 22 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <h4 style={{ margin: 0, fontSize: "1.05rem", color: T.text, fontWeight: 700 }}>
                          {ms.skill}
                        </h4>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 12,
                            background: pBadge.bg,
                            color: pBadge.color,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            border: `1px solid ${pBadge.border}`,
                          }}
                        >
                          {pBadge.label}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 12px", color: T.textMid, fontSize: "0.86rem", lineHeight: 1.5 }}>
                        <strong style={{ color: T.text }}>Why it matters:</strong> {ms.reason}
                      </p>
                      <div
                        style={{
                          padding: "8px 12px",
                          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          color: T.purpleL,
                          fontSize: "0.82rem",
                          fontWeight: 500,
                        }}
                      >
                        Action: {ms.recommended_action}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>

            {/* ─── Section 5: Jobs You Can Apply For (Role Matching) ─────────── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <Briefcase size={22} color={T.green} />
                <h2 style={{ fontSize: "1.35rem", color: T.text, margin: 0, fontWeight: 700 }}>
                  Job Roles You Can Realistically Apply For
                </h2>
              </div>
              <p style={{ color: T.textMid, fontSize: "0.88rem", margin: "0 0 16px" }}>
                Realistic role matches based on skills and experience actually verified in your resume.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {results.recommended_jobs?.map((job, idx) => {
                  const matchCfg =
                    MATCH_LEVEL_CONFIG[job.match_level] || MATCH_LEVEL_CONFIG.good;
                  return (
                    <GlassCard key={idx} hover={false} style={{ padding: 26 }}>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <h3 style={{ margin: "0 0 4px", fontSize: "1.25rem", color: T.text, fontWeight: 700 }}>
                            {job.role}
                          </h3>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                padding: "3px 12px",
                                borderRadius: 14,
                                background: matchCfg.bg,
                                color: matchCfg.color,
                                fontSize: "0.78rem",
                                fontWeight: 700,
                              }}
                            >
                              {matchCfg.label}
                            </span>
                            <span style={{ fontSize: "0.85rem", color: T.textMid, fontWeight: 600 }}>
                              Match Score: {job.match_score}%
                            </span>
                          </div>
                        </div>

                        {/* Match Meter Bar */}
                        <div style={{ width: 160, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div
                            style={{
                              height: 8,
                              background: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${job.match_score}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              style={{ height: "100%", background: matchCfg.barColor }}
                            />
                          </div>
                          <span style={{ fontSize: "0.72rem", color: T.textDim, textAlign: "right" }}>
                            {job.match_score}/100 Match
                          </span>
                        </div>
                      </div>

                      {/* Why you match */}
                      {job.why_match?.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, marginBottom: 6 }}>
                            Why You Match:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 20, color: T.textMid, fontSize: "0.86rem", lineHeight: 1.6 }}>
                            {job.why_match.map((why, wIdx) => (
                              <li key={wIdx}>{why}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Skills Comparison */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: 14,
                          padding: "14px 16px",
                          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                          borderRadius: 12,
                          border: `1px solid ${T.border}`,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.78rem", color: T.green, fontWeight: 700, marginBottom: 8 }}>
                            ✓ Skills Already Demonstrated
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {job.demonstrated_skills?.map((sk, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  background: T.greenDim,
                                  color: T.green,
                                  padding: "3px 9px",
                                  borderRadius: 8,
                                  fontSize: "0.78rem",
                                  fontWeight: 500,
                                }}
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.78rem", color: T.red, fontWeight: 700, marginBottom: 8 }}>
                            ✗ Missing or Unverified Skills
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {job.missing_skills?.map((sk, mIdx) => (
                              <span
                                key={mIdx}
                                style={{
                                  background: "rgba(239, 68, 68, 0.12)",
                                  color: T.red,
                                  padding: "3px 9px",
                                  borderRadius: 8,
                                  fontSize: "0.78rem",
                                  fontWeight: 500,
                                }}
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Recommended next steps */}
                      {job.next_steps?.length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: T.text, marginBottom: 6 }}>
                            Recommended Next Steps to Qualify:
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {job.next_steps.map((step, stIdx) => (
                              <div
                                key={stIdx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                                  padding: "4px 10px",
                                  borderRadius: 8,
                                  fontSize: "0.8rem",
                                  color: T.textMid,
                                }}
                              >
                                <ChevronRight size={14} color={T.purpleL} />
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            </div>

            {/* ─── Section 6: Resume Improvements ────────────────────────────── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <Sparkles size={22} color={T.pink} />
                <h2 style={{ fontSize: "1.35rem", color: T.text, margin: 0, fontWeight: 700 }}>
                  Resume Improvements
                </h2>
              </div>
              <p style={{ color: T.textMid, fontSize: "0.88rem", margin: "0 0 16px" }}>
                Section-by-section improvements to increase recruiter response rates and ATS pass rates.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {results.resume_improvements?.map((imp, i) => {
                  const pBadge = PRIORITY_BADGES[imp.priority] || PRIORITY_BADGES.medium;
                  return (
                    <GlassCard key={i} hover={false} style={{ padding: 22 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: T.textDim,
                          }}
                        >
                          Section: {imp.section}
                        </span>
                        <span
                          style={{
                            padding: "3px 9px",
                            borderRadius: 10,
                            background: pBadge.bg,
                            color: pBadge.color,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                          }}
                        >
                          {pBadge.label}
                        </span>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: "0.78rem", color: T.red, fontWeight: 700, marginBottom: 4 }}>
                          Problem Identified:
                        </div>
                        <p style={{ margin: 0, color: T.textMid, fontSize: "0.86rem", lineHeight: 1.5 }}>
                          {imp.problem}
                        </p>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.78rem", color: T.green, fontWeight: 700, marginBottom: 4 }}>
                          Recommendation:
                        </div>
                        <p style={{ margin: 0, color: T.text, fontSize: "0.86rem", lineHeight: 1.5, fontWeight: 500 }}>
                          {imp.recommendation}
                        </p>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>

            {/* ─── Section 7: Learning Priorities ────────────────────────────── */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <Target size={22} color={T.purpleL} />
                <h2 style={{ fontSize: "1.35rem", color: T.text, margin: 0, fontWeight: 700 }}>
                  Learning Priorities Roadmap
                </h2>
              </div>
              <p style={{ color: T.textMid, fontSize: "0.88rem", margin: "0 0 16px" }}>
                Sequenced learning order to gain high-ROI skills for your targeted career roles.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {results.learning_priorities?.map((lp, i) => {
                  const pBadge = PRIORITY_BADGES[lp.priority] || PRIORITY_BADGES.medium;
                  return (
                    <GlassCard
                      key={i}
                      hover={false}
                      style={{
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: T.purpleDim,
                          color: T.purpleL,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.88rem",
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>
                      <div style={{ flex: "1 1 200px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <h4 style={{ margin: 0, fontSize: "1.05rem", color: T.text, fontWeight: 700 }}>
                            {lp.skill}
                          </h4>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 10,
                              background: pBadge.bg,
                              color: pBadge.color,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                            }}
                          >
                            {pBadge.label}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: T.textMid, fontSize: "0.86rem", lineHeight: 1.4 }}>
                          {lp.reason}
                        </p>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <Button
                variant="outline"
                size="lg"
                icon={<UploadCloud size={18} />}
                onClick={() => {
                  setResults(null);
                  setFile(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Upload Another Resume
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
