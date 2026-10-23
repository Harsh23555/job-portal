/**
 * ExternalApplyModal.jsx
 * AI-powered in-app apply modal for external jobs.
 *
 * Steps:
 *   1. "AI Filling" — animated pre-fill from profile + Groq
 *   2. "Review"    — user reviews/edits all fields
 *   3. "Success"   — confirmation with link to My Applications
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  CheckCircle,
  User,
  Mail,
  Phone,
  Clock,
  FileText,
  Briefcase,
  MapPin,
  Edit3,
  Send,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

// ─── Animated Typing Text ─────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
          }}
        />
      ))}
    </span>
  );
}

// ─── AI Fill Progress Bar ─────────────────────────────────────────────────────

function AIFillAnimation({ isDark }) {
  const steps = [
    "Reading your profile and skills...",
    "Analyzing job requirements...",
    "Crafting tailored cover letter...",
    "Pre-filling application form...",
  ];
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepDuration = 700;
    const timer = setInterval(() => {
      setStepIdx((prev) => Math.min(prev + 1, steps.length - 1));
    }, stepDuration);
    const progressTimer = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95));
    }, 50);
    return () => {
      clearInterval(timer);
      clearInterval(progressTimer);
    };
  }, []);

  return (
    <div style={{ padding: "48px 40px", textAlign: "center" }}>
      {/* Spark icon */}
      <motion.div
        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "linear-gradient(135deg, #7c6af7, #4ade80)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 12px 40px rgba(124,106,247,0.4)",
        }}
      >
        <Sparkles size={32} color="white" strokeWidth={1.5} />
      </motion.div>

      <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: isDark ? "#e8e4ff" : "#1f1b3a", margin: "0 0 8px" }}>
        AI is filling your application
      </h2>
      <p style={{ fontSize: "0.88rem", color: isDark ? "#8b8499" : "#6b7280", margin: "0 0 32px" }}>
        Using your profile, resume analysis, and job details
      </p>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          borderRadius: 99,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut" }}
          style={{ height: "100%", background: "linear-gradient(90deg, #7c6af7, #4ade80)", borderRadius: 99 }}
        />
      </div>

      {/* Step list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: i <= stepIdx ? 1 : 0.3, x: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.84rem",
              color: i < stepIdx
                ? (isDark ? "#4ade80" : "#22c55e")
                : i === stepIdx
                ? (isDark ? "#e8e4ff" : "#1f1b3a")
                : (isDark ? "#4b4775" : "#d1d5db"),
              fontWeight: i <= stepIdx ? 500 : 400,
            }}
          >
            <span style={{ width: 18, textAlign: "center" }}>
              {i < stepIdx ? "✓" : i === stepIdx ? <TypingDots /> : "○"}
            </span>
            {step}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Field Component ──────────────────────────────────────────────────────────

function Field({ label, icon: Icon, children, isDark }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          color: isDark ? "#a89df7" : "#6d5ae6",
          display: "flex",
          alignItems: "center",
          gap: 5,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {Icon && <Icon size={12} strokeWidth={2.5} />}
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, isDark, multiline }) {
  const base = {
    width: "100%",
    background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    borderRadius: 10,
    padding: multiline ? "10px 14px" : "9px 14px",
    color: isDark ? "#e8e4ff" : "#1f1b3a",
    fontSize: "0.9rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    resize: multiline ? "vertical" : undefined,
    minHeight: multiline ? 120 : undefined,
    transition: "border-color 0.15s",
  };

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={base}
        onFocus={(e) => {
          e.target.style.borderColor = isDark ? "rgba(124,106,247,0.5)" : "rgba(109,90,230,0.4)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
        }}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={base}
      onFocus={(e) => {
        e.target.style.borderColor = isDark ? "rgba(124,106,247,0.5)" : "rgba(109,90,230,0.4)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
      }}
    />
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ExternalApplyModal({ job, onClose, onSuccess, user, atsScore }) {
  const { isDark } = useTheme();
  const [step, setStep] = useState("filling"); // filling | review | success

  // Form state — pre-filled by AI
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLoading, setCoverLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const jobId = job?._id || job?.id;
  const provider = job?.provider || "external";
  const providerLabel = provider === "adzuna" ? "Adzuna" : provider === "jooble" ? "Jooble" : provider === "remotive" ? "Remotive" : "External Site";

  // ── Step 1: AI Fill ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!job || !user) return;

    // Pre-fill from profile immediately
    setFullname(user.fullname || "");
    setEmail(user.email || "");
    setPhone(user.phoneNumber || "");

    // Fetch AI cover letter & transition to review after delay
    const fillAndTransition = async () => {
      setCoverLoading(true);
      try {
        const res = await API.post(`/external-jobs/${jobId}/cover-letter-preview`);
        if (res.data?.success) {
          setCoverLetter(res.data.coverLetter || "");
        }
      } catch {
        // Compose fallback inline
        const skills = (user.profile?.skills || []).slice(0, 4).join(", ");
        setCoverLetter(
          `I am excited to apply for the ${job.title} role at ${job.companyName || "your organization"}. ${skills ? `My core skills include ${skills}.` : ""} I am confident my experience aligns with your requirements and I look forward to contributing to your team.`
        );
      } finally {
        setCoverLoading(false);
      }
      // Small artificial delay for polish
      await new Promise((r) => setTimeout(r, 2800));
      setStep("review");
    };

    fillAndTransition();
  }, [job?._id]);

  // ── Step 2: Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await API.post(`/external-jobs/${jobId}/apply`, {
        coverLetter,
        yearsOfExperience: yearsExp,
        linkedinUrl: linkedin,
        portfolioUrl: portfolio,
        availableFrom,
        atsScore: atsScore ?? null,
        generateAI: false, // we already have the cover letter
      });

      if (res.data?.success) {
        setStep("success");
        onSuccess?.();
      } else {
        setSubmitError(res.data?.message || "Failed to submit application.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to submit application.";
      if (msg.toLowerCase().includes("already")) {
        setStep("success"); // Already applied — show success
        onSuccess?.();
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const bg = isDark ? "rgba(12,10,24,0.98)" : "#ffffff";
  const borderClr = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.09)";
  const headClr = isDark ? "#e8e4ff" : "#1f1b3a";
  const mutedClr = isDark ? "#8b8499" : "#9ca3af";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <motion.div
          initial={{ scale: 0.94, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          style={{
            background: bg,
            border: `1px solid ${borderClr}`,
            borderRadius: 20,
            width: "100%",
            maxWidth: 600,
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: isDark
              ? "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,106,247,0.15)"
              : "0 24px 60px rgba(0,0,0,0.15)",
            fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: `1px solid ${borderClr}`,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              position: "sticky",
              top: 0,
              background: bg,
              zIndex: 10,
              borderRadius: "20px 20px 0 0",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Provider badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "2px 9px",
                  borderRadius: 20,
                  background: isDark ? "rgba(124,106,247,0.12)" : "rgba(109,90,230,0.08)",
                  border: `1px solid ${isDark ? "rgba(124,106,247,0.3)" : "rgba(109,90,230,0.2)"}`,
                  marginBottom: 8,
                }}
              >
                <Sparkles size={10} color={isDark ? "#a89df7" : "#6d5ae6"} />
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: isDark ? "#a89df7" : "#6d5ae6", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  AI Easy Apply via {providerLabel}
                </span>
              </div>

              <h2
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: headClr,
                  margin: "0 0 3px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {job?.title}
              </h2>
              <div style={{ fontSize: "0.82rem", color: mutedClr, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Briefcase size={12} />
                  {job?.companyName || "Company"}
                </span>
                {job?.location && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={12} />
                    {job.location}
                  </span>
                )}
                {atsScore !== null && atsScore !== undefined && (
                  <span
                    style={{
                      padding: "1px 7px",
                      borderRadius: 10,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: atsScore >= 70 ? "rgba(34,197,94,0.12)" : atsScore >= 40 ? "rgba(251,146,60,0.12)" : "rgba(255,255,255,0.06)",
                      color: atsScore >= 70 ? "#22c55e" : atsScore >= 40 ? "#fb923c" : mutedClr,
                    }}
                  >
                    ✨ {atsScore}% Match
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: mutedClr,
                cursor: "pointer",
                padding: 4,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* ── Body ── */}
          <AnimatePresence mode="wait">
            {step === "filling" && (
              <motion.div
                key="filling"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AIFillAnimation isDark={isDark} />
              </motion.div>
            )}

            {step === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ padding: "24px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #7c6af7, #4ade80)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Edit3 size={14} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: headClr }}>Review Your Application</div>
                    <div style={{ fontSize: "0.75rem", color: mutedClr }}>AI pre-filled your details — edit anything before submitting</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Name + Email row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Full Name" icon={User} isDark={isDark}>
                      <TextInput value={fullname} onChange={setFullname} placeholder="Your full name" isDark={isDark} />
                    </Field>
                    <Field label="Email" icon={Mail} isDark={isDark}>
                      <TextInput value={email} onChange={setEmail} placeholder="your@email.com" isDark={isDark} />
                    </Field>
                  </div>

                  {/* Phone + Experience row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Phone Number" icon={Phone} isDark={isDark}>
                      <TextInput value={phone} onChange={setPhone} placeholder="+91 00000 00000" isDark={isDark} />
                    </Field>
                    <Field label="Years of Experience" icon={Briefcase} isDark={isDark}>
                      <TextInput value={yearsExp} onChange={setYearsExp} placeholder="e.g. 3" isDark={isDark} />
                    </Field>
                  </div>

                  {/* LinkedIn + Portfolio */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="LinkedIn URL" icon={ExternalLink} isDark={isDark}>
                      <TextInput value={linkedin} onChange={setLinkedin} placeholder="linkedin.com/in/your-name" isDark={isDark} />
                    </Field>
                    <Field label="Portfolio / GitHub" icon={ExternalLink} isDark={isDark}>
                      <TextInput value={portfolio} onChange={setPortfolio} placeholder="github.com/you or portfolio.dev" isDark={isDark} />
                    </Field>
                  </div>

                  {/* Available From */}
                  <Field label="Available From" icon={Clock} isDark={isDark}>
                    <TextInput value={availableFrom} onChange={setAvailableFrom} placeholder="e.g. Immediately, 1 month notice" isDark={isDark} />
                  </Field>

                  {/* Cover Letter */}
                  <Field label="Cover Letter (AI Generated — Edit Freely)" icon={FileText} isDark={isDark}>
                    <div style={{ position: "relative" }}>
                      <TextInput
                        value={coverLetter}
                        onChange={setCoverLetter}
                        placeholder="Your cover letter..."
                        isDark={isDark}
                        multiline
                      />
                      {coverLoading && (
                        <div
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.72rem",
                            color: isDark ? "#a89df7" : "#6d5ae6",
                          }}
                        >
                          <TypingDots />
                          Generating...
                        </div>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: mutedClr }}>
                      ✨ Generated by AI using your profile and job description. You can edit freely.
                    </p>
                  </Field>

                  {/* Error banner */}
                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        color: "#ef4444",
                        fontSize: "0.84rem",
                      }}
                    >
                      {submitError}
                    </motion.div>
                  )}

                  {/* Submit button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      width: "100%",
                      padding: "14px 24px",
                      background: submitting
                        ? (isDark ? "rgba(124,106,247,0.4)" : "rgba(109,90,230,0.4)")
                        : "linear-gradient(135deg, #7c6af7, #5b4de0)",
                      border: "none",
                      borderRadius: 12,
                      color: "#fff",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      cursor: submitting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontFamily: "inherit",
                      boxShadow: submitting ? "none" : "0 8px 24px rgba(124,106,247,0.35)",
                      transition: "all 0.2s",
                      marginTop: 4,
                    }}
                  >
                    {submitting ? (
                      <>
                        <TypingDots />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Submit Application
                      </>
                    )}
                  </motion.button>

                  <p style={{ textAlign: "center", fontSize: "0.72rem", color: mutedClr, margin: 0 }}>
                    ⓘ Your application is stored in JobSphere and tracked under "My Applications". This does not submit to {providerLabel}'s platform directly.
                  </p>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ padding: "48px 40px", textAlign: "center" }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(74,222,128,0.08))",
                    border: "2px solid rgba(34,197,94,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                  }}
                >
                  <CheckCircle size={40} color="#22c55e" strokeWidth={1.5} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: headClr, margin: "0 0 8px" }}>
                    Application Submitted! 🎉
                  </h2>
                  <p style={{ fontSize: "0.9rem", color: mutedClr, margin: "0 0 8px", lineHeight: 1.6 }}>
                    Your application for <strong style={{ color: headClr }}>{job?.title}</strong> at{" "}
                    <strong style={{ color: headClr }}>{job?.companyName || "the company"}</strong> has been saved.
                  </p>
                  <p style={{ fontSize: "0.8rem", color: mutedClr, margin: "0 0 32px" }}>
                    Track your application status under "My Applications".
                  </p>

                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      style={{
                        padding: "10px 24px",
                        background: "linear-gradient(135deg, #7c6af7, #5b4de0)",
                        border: "none",
                        borderRadius: 10,
                        color: "#fff",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        boxShadow: "0 6px 18px rgba(124,106,247,0.3)",
                      }}
                    >
                      Close
                    </motion.button>

                    {job?.externalUrl && (
                      <a
                        href={job.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "10px 20px",
                          background: "none",
                          border: `1px solid ${borderClr}`,
                          borderRadius: 10,
                          color: mutedClr,
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        View Original Posting
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
