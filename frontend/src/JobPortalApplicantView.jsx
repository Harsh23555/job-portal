"use strict";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGoogleLogin } from "@react-oauth/google";
import {
  Search,
  MapPin,
  Briefcase,
  BookmarkPlus,
  Clock,
  Banknote,
  ArrowRight,
  Bell,
  Bookmark,
  Share2,
  RotateCw,
  FileText,
  AlertTriangle,
  UploadCloud,
  Download,
  ExternalLink
} from "lucide-react";
import { Button, Input, GlassCard, getRelativeTime } from "./JobPortal";
import { ResumeAnalyzerView } from "./JobPortalResumeAnalyzer";
import { formatSalaryDisplay, getJobNumericSalary } from "./utils/currency";
import { deduplicateFrontendJobs, mergeAndDeduplicateJobs } from "./utils/jobDeduplicator";
import { STATIC_DEMO_JOBS } from "./utils/demoJobs";
import { calculateATSScore, extractJobSkills, extractUserSkills } from "./utils/atsMatcher";
import { formatRelativeTime } from "./utils/dateParser";
import API from "./services/api";
import { useTheme, ThemeToggle, T } from "./context/ThemeContext";
import JobDescriptionMarkup from "./components/JobDescriptionMarkup";

function Tag({ children, color, textColor }) {
  const { isDark } = useTheme();
  const bg = color || (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)");
  const text = textColor || (isDark ? T.textMid : T.textMid);
  return <span style={{ padding: "4px 10px", background: bg, borderRadius: 20, fontSize: "0.72rem", fontWeight: 600, color: text, whiteSpace: "nowrap" }}>
      {children}
    </span>;
}

function ApplicantNavbar({ onSignOut, activeTab, onTabChange, userName = "Candidate" }) {
  const { isDark } = useTheme();
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const NAV_TABS = ["Browse Jobs", "My Applications", "AI Resume Analyzer", "Saved", "My Profile"];
  return <nav style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100, fontFamily: T.font, height: 64, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", height: "100%", gap: 16 }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #7c6af7, #4ade80)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(124,106,247,0.3)" }}>
            <Briefcase size={15} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: T.serif, fontSize: "1.2rem", color: T.text, letterSpacing: "-0.02em", lineHeight: 1 }}>JobSphere</span>
        </div>

        {/* Desktop Nav Tabs */}
        <div style={{ display: "flex", gap: 2, flex: 1, overflow: "hidden" }}>
          {NAV_TABS.map((l) => {
    const isActive = activeTab === l;
    return <button key={l} onClick={() => { onTabChange(l); setMobileMenuOpen(false); }} style={{ padding: "7px 13px", background: isActive ? (isDark ? "linear-gradient(135deg, rgba(124,106,247,0.22), rgba(91,78,224,0.16))" : "rgba(109,90,230,0.12)") : "transparent", border: isActive ? `1px solid ${isDark ? "rgba(124,106,247,0.35)" : "rgba(109,90,230,0.28)"}` : "1px solid transparent", color: isActive ? (isDark ? "#e8e4ff" : "#5b48e0") : T.textMid, fontSize: "0.82rem", fontWeight: isActive ? 600 : 400, cursor: "pointer", borderRadius: 9, fontFamily: T.font, transition: "all 0.18s", whiteSpace: "nowrap", flexShrink: 0 }}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = T.text; e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"; }}}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = T.textMid; e.currentTarget.style.background = "transparent"; }}}
    >
              {l}
            </button>;
  })}
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            <button
    onClick={() => { setIsNotifOpen(!isNotifOpen); setMobileMenuOpen(false); }}
    style={{ background: isNotifOpen ? "rgba(124,106,247,0.12)" : "none", border: isNotifOpen ? `1px solid rgba(124,106,247,0.35)` : `1px solid transparent`, borderRadius: 9, color: isNotifOpen ? T.purpleL : T.textDim, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "7px", transition: "all 0.18s", width: 36, height: 36 }}
    onMouseEnter={(e) => { if (!isNotifOpen) { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; e.currentTarget.style.color = T.textMid; }}}
    onMouseLeave={(e) => { if (!isNotifOpen) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = T.textDim; }}}
  >
              <Bell size={17} />
              {unreadCount > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: "50%", background: T.purple, border: `1.5px solid ${T.bg}` }} />}
            </button>
            
            <AnimatePresence>
              {isNotifOpen && <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.15 }} style={{ position: "absolute", top: 44, right: 0, width: 320, background: isDark ? "rgba(10,8,20,0.97)" : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: isDark ? "0 24px 48px rgba(0,0,0,0.65)" : "0 12px 36px rgba(0,0,0,0.12)", zIndex: 1e3, backdropFilter: "blur(20px)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.border}`, alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }}>Notifications</span>
                    {unreadCount > 0 && <span onClick={handleMarkAllRead} style={{ fontSize: "0.72rem", color: T.purpleL, cursor: "pointer", fontWeight: 500 }}>Mark all read</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
                    {notifications.length === 0
                      ? <div style={{ textAlign: "center", padding: "24px 0", color: T.textDim, fontSize: "0.82rem" }}>🔔 No notifications yet</div>
                      : notifications.map((n) => <div key={n.id} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px", borderRadius: 8, background: n.read ? "transparent" : (isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"), borderLeft: n.read ? "none" : `3px solid ${T.purple}`, transition: "all 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: T.text }}>{n.title}</span>
                          <span style={{ fontSize: "0.65rem", color: T.textDim }}>{n.time}</span>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: T.textMid, lineHeight: 1.4 }}>{n.body}</span>
                      </div>)}
                  </div>
                </motion.div>}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <div
    style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #7c6af7, #5b4de0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, color: "#fff", cursor: "pointer", border: `2px solid rgba(124,106,247,0.35)`, flexShrink: 0, boxShadow: "0 2px 8px rgba(124,106,247,0.25)", transition: "all 0.18s" }}
    onClick={() => onTabChange("My Profile")}
    title={`${userName} — View Profile`}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(124,106,247,0.6)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,106,247,0.4)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(124,106,247,0.35)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(124,106,247,0.25)"; }}
  >
              {initials}
            </div>
          
          {/* Sign Out */}
          <button onClick={onSignOut} style={{ fontSize: "0.78rem", color: T.textDim, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", padding: "6px 12px", fontFamily: T.font, transition: "all 0.18s", whiteSpace: "nowrap" }}
    onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.color = T.textDim; e.currentTarget.style.borderColor = T.border; }}
  >Sign Out</button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {mobileMenuOpen && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ borderTop: `1px solid ${T.border}`, background: isDark ? "rgba(9,9,15,0.98)" : "#ffffff", overflow: "hidden" }}>
            <div style={{ padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV_TABS.map((l) => {
    const isActive = activeTab === l;
    return <button key={l} onClick={() => { onTabChange(l); setMobileMenuOpen(false); }} style={{ padding: "10px 14px", background: isActive ? T.purpleDim : "transparent", border: "none", color: isActive ? T.purpleL : T.textMid, fontSize: "0.875rem", fontWeight: isActive ? 600 : 400, cursor: "pointer", borderRadius: 9, fontFamily: T.font, textAlign: "left" }}>
                {l}
              </button>;
  })}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                <button onClick={onSignOut} style={{ padding: "10px 14px", background: "transparent", border: "none", color: T.textDim, fontSize: "0.875rem", cursor: "pointer", borderRadius: 9, fontFamily: T.font, textAlign: "left", width: "100%" }}>Sign Out</button>
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>
    </nav>;
}
function ProfileView({
  onUserUpdate,
  externalError = "",
  externalSuccess = "",
  onClearExternal
}) {
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [fullname, setFullname] = useState(savedUser.fullname || "");
  const [email, setEmail] = useState(savedUser.email || "");
  const [phoneNumber, setPhoneNumber] = useState(savedUser.phoneNumber || "");
  const [bio, setBio] = useState(savedUser.profile?.bio || "");
  const [skills, setSkills] = useState((savedUser.profile?.skills || []).join(", "));
  const [googleEmail, setGoogleEmail] = useState(savedUser.profile?.googleEmail);
  const [githubEmail, setGithubEmail] = useState(savedUser.profile?.githubEmail);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Resume Management State
  const [resumeActionLoading, setResumeActionLoading] = useState(false);
  const [resumeSuccessMsg, setResumeSuccessMsg] = useState("");
  const [resumeErrorMsg, setResumeErrorMsg] = useState("");
  const resumeInputRef = useRef(null);

  const resumeMetadata = savedUser.profile?.resumeMetadata;
  const hasResume = Boolean(resumeMetadata?.fileId || savedUser.profile?.resume);
  const resumeName = resumeMetadata?.originalName || savedUser.profile?.resumeOriginalName || (savedUser.profile?.resume ? "Resume.pdf" : "");
  const resumeUploadDate = resumeMetadata?.uploadedAt
    ? new Date(resumeMetadata.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : (savedUser.updatedAt ? new Date(savedUser.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently");
  const resumeSizeStr = resumeMetadata?.size
    ? (resumeMetadata.size > 1024 * 1024
      ? `${(resumeMetadata.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(resumeMetadata.size / 1024)} KB`)
    : "";

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setResumeErrorMsg("");
    setResumeSuccessMsg("");

    const ext = file.name ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
    const allowed = [".pdf", ".doc", ".docx", ".txt"];
    if (ext && !allowed.includes(ext)) {
      setResumeErrorMsg("Resume must be a PDF or DOCX file (PDF, DOC, DOCX, or TXT).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeErrorMsg("Resume is too large. Maximum allowed size is 5 MB.");
      return;
    }
    if (file.size === 0) {
      setResumeErrorMsg("The selected resume file is empty.");
      return;
    }

    setResumeActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await API.post("/user/profile/resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success) {
        setResumeSuccessMsg("Resume uploaded successfully!");
        onUserUpdate(res.data.user);
        setTimeout(() => setResumeSuccessMsg(""), 3500);
      } else {
        throw new Error(res.data?.message || "Failed to upload resume.");
      }
    } catch (err) {
      console.error(err);
      setResumeErrorMsg(err.response?.data?.message || err.message || "Failed to upload resume.");
    } finally {
      setResumeActionLoading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm("Are you sure you want to remove your resume? You will not be able to apply to jobs until you upload a new one.")) {
      return;
    }
    setResumeActionLoading(true);
    setResumeErrorMsg("");
    setResumeSuccessMsg("");
    try {
      const res = await API.delete("/user/profile/resume");
      if (res.data?.success) {
        setResumeSuccessMsg("Resume removed from profile.");
        onUserUpdate(res.data.user);
        setTimeout(() => setResumeSuccessMsg(""), 3500);
      } else {
        throw new Error(res.data?.message || "Failed to remove resume.");
      }
    } catch (err) {
      console.error(err);
      setResumeErrorMsg(err.response?.data?.message || err.message || "Failed to remove resume.");
    } finally {
      setResumeActionLoading(false);
    }
  };

  const handleViewResume = async () => {
    setResumeActionLoading(true);
    try {
      const res = await API.get("/user/profile/resume", { responseType: "blob" });
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error(err);
      setResumeErrorMsg(err.response?.data?.message || "Failed to load resume.");
    } finally {
      setResumeActionLoading(false);
    }
  };

  const handleDownloadResume = async () => {
    setResumeActionLoading(true);
    try {
      const res = await API.get("/user/profile/resume?download=true", { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resumeName || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setResumeErrorMsg(err.response?.data?.message || "Failed to download resume.");
    } finally {
      setResumeActionLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await API.post("/user/profile/update", {
        fullname,
        email,
        phoneNumber,
        bio,
        skills
      });
      if (res.data.success) {
        setSuccessMsg("Profile updated successfully!");
        onUserUpdate(res.data.user);
        setTimeout(() => setSuccessMsg(""), 3e3);
      } else {
        throw new Error(res.data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };
  const linkGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await API.post("/user/auth/google", {
          token: tokenResponse.access_token,
          action: "link"
        });
        if (res.data.success) {
          onUserUpdate(res.data.user);
          setGoogleEmail(res.data.user.profile?.googleEmail);
          setSuccessMsg("Google account linked successfully!");
          setTimeout(() => setSuccessMsg(""), 3e3);
        } else {
          throw new Error(res.data.message || "Linking failed");
        }
      } catch (err) {
        setErrorMsg(err.response?.data?.message || err.message || "Failed to link Google account");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setErrorMsg("Google linking was cancelled.");
    }
  });
  const handleLinkSocial = (provider) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (provider === "Google") {
      const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientID || clientID.includes("dummy")) {
        setErrorMsg("Google Client credentials are not configured in local environment.");
      } else {
        linkGoogle();
      }
    } else if (provider === "GitHub") {
      const clientID = import.meta.env.VITE_GITHUB_CLIENT_ID;
      if (!clientID || clientID.includes("dummy")) {
        setErrorMsg("GitHub Client credentials are not configured in local environment.");
      } else {
        const redirectURI = encodeURIComponent("http://localhost:8000/api/v1/user/auth/github/callback");
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectURI}&scope=user:email&state=link`;
        window.location.href = githubAuthUrl;
      }
    }
  };
  const handleUnlinkSocial = async (provider) => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await API.post("/user/profile/unlink", { provider });
      if (res.data.success) {
        onUserUpdate(res.data.user);
        if (provider === "google") setGoogleEmail(void 0);
        if (provider === "github") setGithubEmail(void 0);
        setSuccessMsg(res.data.message || `${provider} account disconnected successfully!`);
        setTimeout(() => setSuccessMsg(""), 3e3);
      } else {
        throw new Error(res.data.message || "Unlinking failed");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || `Failed to unlink ${provider} account`);
    } finally {
      setLoading(false);
    }
  };
  return <div style={{ flex: 1, maxWidth: 680, width: "100%", margin: "40px auto", padding: "0 24px", fontFamily: T.font }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "2rem", fontFamily: T.serif, color: T.text, margin: "0 0 8px" }}>My Profile</h1>
        <p style={{ color: T.textMid, margin: 0 }}>View and manage your account details and technical skills.</p>
      </div>

      <GlassCard style={{ padding: 32 }}>
        {successMsg && <div style={{ color: T.green, background: T.greenDim, border: `1px solid ${T.green}40`, padding: "12px 16px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 20 }}>
            {successMsg}
          </div>}
        {errorMsg && <div style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.20)", padding: "12px 16px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 20 }}>
            {errorMsg}
          </div>}
        {externalError && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.20)", padding: "12px 16px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 20 }}>
            <span>{externalError}</span>
            <button onClick={onClearExternal} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "0 0 0 12px" }}>✕</button>
          </div>}
        {externalSuccess && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: T.green, background: T.greenDim, border: `1px solid ${T.green}40`, padding: "12px 16px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 20 }}>
            <span>{externalSuccess}</span>
            <button onClick={onClearExternal} style={{ background: "none", border: "none", color: T.green, cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "0 0 0 12px" }}>✕</button>
          </div>}

        <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Full Name</label>
            <Input placeholder="John Doe" value={fullname} onChange={(e) => setFullname(e.target.value)} required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Email Address</label>
              <Input placeholder="john@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Phone Number</label>
              <Input placeholder="1234567890" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Professional Bio</label>
            <textarea
    placeholder="Tell us about yourself, your background, and your aspirations..."
    value={bio}
    onChange={(e) => setBio(e.target.value)}
    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.text, fontSize: "0.9rem", outline: "none", fontFamily: T.font, minHeight: 80, boxSizing: "border-box" }}
  />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Skills (comma separated)</label>
            <Input placeholder="React, Node.js, TypeScript, PostgreSQL" value={skills} onChange={(e) => setSkills(e.target.value)} />
            <span style={{ fontSize: "0.72rem", color: T.textDim, display: "block", marginTop: 4 }}>Separating skills with a comma lets us calculate ATS matches for your profile automatically.</span>
          </div>

          <div style={{ marginTop: 10 }}>
            <Button type="submit" variant="primary" style={{ padding: "12px 28px" }} disabled={loading}>
              {loading ? "Saving Changes..." : "Save Profile Details"}
            </Button>
          </div>
        </form>
      </GlassCard>

      {/* ─── Resume Management Section (Job Seekers Only) ──────────────── */}
      <GlassCard style={{ padding: 32, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", color: T.text, margin: "0 0 6px", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} color={T.purpleL} /> Resume Management
            </h3>
            <p style={{ color: T.textMid, fontSize: "0.82rem", margin: 0 }}>
              Your resume is required to apply for jobs and powers your automated ATS skills matching.
            </p>
          </div>
          <span style={{
            padding: "4px 10px",
            borderRadius: 12,
            fontSize: "0.72rem",
            fontWeight: 700,
            background: hasResume ? T.greenDim : "rgba(239,68,68,0.12)",
            color: hasResume ? T.green : "#ef4444",
            border: `1px solid ${hasResume ? T.green + "40" : "rgba(239,68,68,0.25)"}`
          }}>
            {hasResume ? "✓ Active Resume" : "No Resume Uploaded"}
          </span>
        </div>

        {resumeSuccessMsg && (
          <div style={{ color: T.green, background: T.greenDim, border: `1px solid ${T.green}40`, padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 16 }}>
            {resumeSuccessMsg}
          </div>
        )}
        {resumeErrorMsg && (
          <div style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.20)", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 16 }}>
            {resumeErrorMsg}
          </div>
        )}

        {hasResume ? (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: T.purpleDim, border: `1px solid ${T.purpleL}40`, display: "flex", alignItems: "center", justifyContent: "center", color: T.purpleL, flexShrink: 0 }}>
                  <FileText size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: T.text, wordBreak: "break-all" }}>
                    {resumeName}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: T.textDim, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>Uploaded: {resumeUploadDate}</span>
                    {resumeSizeStr && <span>• Size: {resumeSizeStr}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Button size="sm" variant="outline" onClick={handleViewResume} disabled={resumeActionLoading}>
                  View Resume
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDownloadResume} disabled={resumeActionLoading}>
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => resumeInputRef.current?.click()} disabled={resumeActionLoading}>
                  Replace Resume
                </Button>
                <button
                  onClick={handleDeleteResume}
                  disabled={resumeActionLoading}
                  style={{
                    fontSize: "0.78rem",
                    color: "#ef4444",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    cursor: resumeActionLoading ? "not-allowed" : "pointer",
                    padding: "7px 12px",
                    fontFamily: T.font,
                    fontWeight: 600,
                    transition: "all 0.18s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: T.surface, border: `1px dashed ${T.border}`, borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", margin: "0 auto 12px" }}>
              <AlertTriangle size={22} />
            </div>
            <h4 style={{ fontSize: "1rem", color: T.text, margin: "0 0 6px", fontWeight: 600 }}>No resume uploaded yet</h4>
            <p style={{ color: T.textMid, fontSize: "0.85rem", maxWidth: 440, margin: "0 auto 18px", lineHeight: 1.5 }}>
              You need to upload a resume before applying for jobs. Supported formats: PDF, DOC, DOCX, TXT (up to 5MB).
            </p>
            <Button
              variant="primary"
              onClick={() => resumeInputRef.current?.click()}
              disabled={resumeActionLoading}
              icon={<UploadCloud size={16} />}
            >
              {resumeActionLoading ? "Uploading..." : "Upload Resume"}
            </Button>
          </div>
        )}

        <input
          ref={resumeInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={handleFileSelected}
          style={{ display: "none" }}
        />
      </GlassCard>

      <GlassCard style={{ padding: 32, marginTop: 24 }}>
        <h3 style={{ fontSize: "1.1rem", color: T.text, margin: "0 0 8px", fontWeight: 600 }}>Linked Accounts</h3>
        <p style={{ color: T.textMid, fontSize: "0.82rem", margin: "0 0 20px" }}>
          Connect your social accounts to log in using either method seamlessly.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91C16.46 14.28 17.64 11.95 17.64 9.2Z" fill="#4285F4" /><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" fill="#34A853" /><path d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z" fill="#FBBC05" /><path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96L3.96 7.3C4.67 5.16 6.66 3.58 9 3.58Z" fill="#EA4335" /></svg>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }}>Google Account</div>
                <div style={{ fontSize: "0.72rem", color: T.textDim }}>{googleEmail || "Not connected"}</div>
              </div>
            </div>
            {googleEmail ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.75rem", color: T.green, fontWeight: 600 }}>✓ Connected</span>
                <button
    onClick={() => handleUnlinkSocial("google")}
    style={{ fontSize: "0.72rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}
  >
                  Disconnect
                </button>
              </div> : <Button size="sm" variant="ghost" onClick={() => handleLinkSocial("Google")}>Connect</Button>}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }}>GitHub Account</div>
                <div style={{ fontSize: "0.72rem", color: T.textDim }}>{githubEmail || "Not connected"}</div>
              </div>
            </div>
            {githubEmail ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.75rem", color: T.green, fontWeight: 600 }}>✓ Connected</span>
                <button
    onClick={() => handleUnlinkSocial("github")}
    style={{ fontSize: "0.72rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}
  >
                  Disconnect
                </button>
              </div> : <Button size="sm" variant="ghost" onClick={() => handleLinkSocial("GitHub")}>Connect</Button>}
          </div>
        </div>
      </GlassCard>
    </div>;
}
export function JobPortalApplicantView({ onSignOut, initialJobId = null, onJobConsumed }) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("Browse Jobs");
  const [jobs, setJobs] = useState(() => mergeAndDeduplicateJobs([], [], STATIC_DEMO_JOBS));
  const [applications, setApplications] = useState([]);
  const [savedIds, setSavedIds] = useState(/* @__PURE__ */ new Set());
  const [activeJobId, setActiveJobId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(null);
  const [userVer, setUserVer] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState(/* @__PURE__ */ new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 10;
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [enrichingDesc, setEnrichingDesc] = useState(false);
  const abortControllerRef = useRef(null);

  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = savedUser._id || "";
  const userName = savedUser.fullname || "Candidate";
  const hasResume = Boolean(savedUser.profile?.resumeMetadata?.fileId || savedUser.profile?.resume);

  // Fetch latest resume analysis
  useEffect(() => {
    let isMounted = true;
    async function loadResumeAnalysis() {
      try {
        const res = await API.get("/user/resume-analysis/latest");
        if (isMounted && res.data?.success && res.data?.analysis) {
          setResumeAnalysis(res.data.analysis);
        }
      } catch {
        // silent if no analysis or unauthenticated
      }
    }
    loadResumeAnalysis();
    return () => {
      isMounted = false;
    };
  }, [userId, userVer]);

  // Combined user skills
  const combinedUserSkills = useMemo(() => {
    return extractUserSkills(savedUser, resumeAnalysis);
  }, [savedUser, resumeAnalysis, userVer]);

  const fetchJobs = async (isManualRefresh = false) => {
    if (!isManualRefresh && jobs.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const endpoint = isManualRefresh ? "/job/get?refresh=true" : "/job/get";
      const res = await API.get(endpoint, { signal: abortControllerRef.current.signal });
      if (res.data?.success && Array.isArray(res.data.jobs)) {
        setJobs((prevJobs) => {
          const merged = mergeAndDeduplicateJobs(prevJobs, res.data.jobs, STATIC_DEMO_JOBS);

          // Retain or select active job
          if (initialJobId) {
            const match = merged.find((j) => (j._id || j.id) === initialJobId);
            if (match) {
              setActiveJobId(match._id || match.id);
            } else if (merged.length > 0 && !activeJobId) {
              setActiveJobId(merged[0]._id || merged[0].id);
            }
            onJobConsumed?.();
          } else if (!activeJobId && merged.length > 0) {
            setActiveJobId(merged[0]._id || merged[0].id);
          } else if (activeJobId) {
            const stillExists = merged.some((j) => (j._id || j.id) === activeJobId);
            if (!stillExists && merged.length > 0) {
              setActiveJobId(merged[0]._id || merged[0].id);
            }
          }

          return merged;
        });
        setLastRefreshed(new Date());
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        return;
      }
      console.error("Error fetching jobs in applicant view:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await API.get("/application/get");
      if (res.data.success) {
        setApplications(res.data.application || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, selectedFilters]);

  useEffect(() => {
    fetchJobs();
    fetchApplications();
    // Fetch saved job IDs
    API.get("/saved-jobs/ids")
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.savedJobIds)) {
          setSavedIds(new Set(res.data.savedJobIds));
          localStorage.setItem(`saved_jobs_${userId}`, JSON.stringify(res.data.savedJobIds));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem(`saved_jobs_${userId}`);
        if (saved) {
          try {
            setSavedIds(new Set(JSON.parse(saved)));
          } catch {}
        }
      });
    const params = new URLSearchParams(window.location.search);
    const linkStatus = params.get("link");
    const errorStatus = params.get("error");
    if (linkStatus === "github_success") {
      window.history.replaceState({}, document.title, window.location.pathname);
      const updateMe = async () => {
        try {
          const res = await API.get("/user/me");
          if (res.data.success) {
            localStorage.setItem("user", JSON.stringify(res.data.user));
            setUserVer((v) => v + 1);
            setActiveTab("My Profile");
          }
        } catch (err) {
          console.error(err);
        }
      };
      updateMe();
    } else if (errorStatus === "github_already_linked") {
      window.history.replaceState({}, document.title, window.location.pathname);
      setActiveTab("My Profile");
      setLinkError("This GitHub account is already connected to another user profile.");
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userId]);

  // Load saved jobs on tab switch
  useEffect(() => {
    if (activeTab === "Saved") {
      API.get("/saved-jobs")
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.jobs)) {
            setJobs((prevJobs) => mergeAndDeduplicateJobs(prevJobs, res.data.jobs, STATIC_DEMO_JOBS));
            const newIds = res.data.jobs.map((j) => j._id || j.id);
            setSavedIds((prev) => new Set([...prev, ...newIds]));
          }
        })
        .catch((err) => console.warn("[fetchSavedJobs error]:", err.message));
    }
  }, [activeTab]);

  // Background auto-refresh
  useEffect(() => {
    const refreshIntervalMs = Number(import.meta.env.VITE_AUTO_REFRESH_INTERVAL_MS) || 300000;
    const intervalTimer = setInterval(() => {
      fetchJobs(true);
    }, refreshIntervalMs);

    const handleFocus = () => {
      if (lastRefreshed && Date.now() - new Date(lastRefreshed).getTime() > 120000) {
        fetchJobs(true);
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [lastRefreshed]);

  const handleViewAppResume = async (appId) => {
    try {
      const res = await API.get(`/application/${appId}/resume`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to view submitted resume.");
    }
  };

  const handleDownloadAppResume = async (appId, filename) => {
    try {
      const res = await API.get(`/application/${appId}/resume?download=true`, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to download submitted resume.");
    }
  };

  const handleApply = async (jobId) => {
    const job = jobs.find((j) => (j._id || j.id) === jobId);
    if (job?.isExternal && (job.externalUrl || job.apply_url)) {
      window.open(job.externalUrl || job.apply_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (job?.isDemo) {
      setApplyLoading(true);
      setApplySuccess(null);
      setTimeout(() => {
        setApplySuccess("Application submitted successfully for this demo position!");
        setApplyLoading(false);
      }, 400);
      return;
    }
    if (!hasResume) {
      setApplySuccess("Resume required. Please upload your resume in My Profile before applying.");
      setActiveTab("My Profile");
      return;
    }
    setApplyLoading(true);
    setApplySuccess(null);
    try {
      const res = await API.post(`/application/apply/${jobId}`);
      if (res.data?.success) {
        setApplySuccess("Successfully applied to this position!");
        fetchApplications();
      } else {
        setApplySuccess(res.data?.message || "Failed to submit application.");
      }
    } catch (err) {
      console.error(err);
      setApplySuccess(err.response?.data?.message || "Failed to submit application.");
    } finally {
      setApplyLoading(false);
    }
  };

  const handleToggleSave = async (jobId) => {
    const targetJob = jobs.find((j) => (j._id || j.id) === jobId);
    const isCurrentlySaved = savedIds.has(jobId);
    const nextSaved = new Set(savedIds);

    // Optimistic UI update
    if (isCurrentlySaved) {
      nextSaved.delete(jobId);
    } else {
      nextSaved.add(jobId);
    }
    setSavedIds(nextSaved);
    localStorage.setItem(`saved_jobs_${userId}`, JSON.stringify(Array.from(nextSaved)));

    try {
      if (isCurrentlySaved) {
        await API.post("/saved-jobs/unsave", {
          jobId,
          isExternal: Boolean(targetJob?.isExternal),
        });
      } else {
        await API.post("/saved-jobs/save", {
          jobId,
          isExternal: Boolean(targetJob?.isExternal),
        });
      }
    } catch (saveErr) {
      console.warn("[SavedJobs sync error]:", saveErr.message);
    }
  };

  const handleToggleFilter = (filter) => {
    const nextFilters = new Set(selectedFilters);
    if (nextFilters.has(filter)) {
      nextFilters.delete(filter);
    } else {
      nextFilters.add(filter);
    }
    setSelectedFilters(nextFilters);
  };

  const displayedJobs = jobs.filter((job) => {
    const titleStr = (job.title || "").toLowerCase();
    const compName = (job.company?.name || (typeof job.company === "string" ? job.company : "") || job.companyName || "").toLowerCase();
    const locStr = (job.location || "").toLowerCase();
    const descStr = (job.description || "").toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      const matchSearch = titleStr.includes(q) || compName.includes(q) || locStr.includes(q) || descStr.includes(q);
      if (!matchSearch) return false;
    }

    if (selectedFilters.size > 0) {
      let matchesFilter = true;
      selectedFilters.forEach((f) => {
        if (f === "Remote") {
          const isRem = job.isRemote || locStr.includes("remote");
          if (!isRem) matchesFilter = false;
        }
        if (f === "Engineering") {
          const isEng = /(engineer|developer|frontend|backend|fullstack|software|architect|devops|data|sre|programmer|coder)/i.test(titleStr) ||
            (job.category || "").toLowerCase().includes("engineer");
          if (!isEng) matchesFilter = false;
        }
        if (f === "Full-time") {
          const jt = (job.jobType || job.type || "").toLowerCase();
          if (!jt.includes("full")) matchesFilter = false;
        }
        if (f === "₹10L+") {
          if (getJobNumericSalary(job) < 1000000) matchesFilter = false;
        }
        if (f === "₹20L+") {
          if (getJobNumericSalary(job) < 2000000) matchesFilter = false;
        }
      });
      if (!matchesFilter) return false;
    }

    if (activeTab === "Saved") {
      return savedIds.has(job._id || job.id);
    }
    return true;
  });

  const totalPages = Math.ceil(displayedJobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const paginatedJobs = displayedJobs.slice(startIndex, startIndex + jobsPerPage);
  const formatSal = (sal, item = null) => {
    return formatSalaryDisplay(item?.salaryDisplay || sal, item);
  };
  const activeJob = jobs.find((j) => (j._id || j.id) === activeJobId) || jobs[0];
  const activeJobSkills = useMemo(() => extractJobSkills(activeJob), [activeJob]);
  const activeAts = useMemo(() => calculateATSScore(combinedUserSkills, activeJobSkills, hasResume), [combinedUserSkills, activeJobSkills, hasResume]);

  const getJobCardAts = (job) => {
    const skills = extractJobSkills(job);
    return calculateATSScore(combinedUserSkills, skills, hasResume);
  };

  const hasAppliedToActiveJob = activeJob && applications.some((app) => app.job?._id === activeJob._id || app.job === activeJob._id);

  // Auto-fetch complete job description for external jobs if snippet is truncated
  useEffect(() => {
    if (!activeJob?.isExternal) return;
    const desc = activeJob.description || "";
    const isTruncated = desc.endsWith("…") || desc.endsWith("...") || desc.length <= 500;
    const targetId = activeJob._id || activeJob.id;
    if (isTruncated && targetId) {
      setEnrichingDesc(true);
      API.get(`/external-jobs/${targetId}`)
        .then((res) => {
          if (res.data?.success && res.data.job?.description && res.data.job.description.length > desc.length) {
            setJobs((prevJobs) =>
              prevJobs.map((j) =>
                (j._id === targetId || j.id === targetId)
                  ? { ...j, description: res.data.job.description }
                  : j
              )
            );
          }
        })
        .catch(() => {})
        .finally(() => {
          setEnrichingDesc(false);
        });
    }
  }, [activeJob?._id, activeJob?.id]);

  const isJobsTab = activeTab === "Browse Jobs" || activeTab === "Saved";

  return <div className={isJobsTab ? "jobs-page-container" : ""} style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: T.bg, color: T.text }}>
      <ApplicantNavbar
    onSignOut={onSignOut}
    activeTab={activeTab}
    onTabChange={(tab) => {
      setActiveTab(tab);
      if (tab === "My Applications") {
        fetchApplications();
      } else if (tab === "Saved") {
        const savedArr = Array.from(savedIds);
        if (savedArr.length > 0) {
          setActiveJobId(savedArr[0]);
        }
      } else if (tab === "Browse Jobs") {
        if (jobs.length > 0) {
          setActiveJobId(jobs[0]._id);
        }
      }
    }}
    userName={userName}
    key={userVer}
  />
      <AnimatePresence mode="wait">
        <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.22, ease: "easeInOut" }}
    className={isJobsTab ? "jobs-motion-container" : ""}
    style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", minHeight: 0 }}
  >
          {activeTab === "AI Resume Analyzer" ? <ResumeAnalyzerView /> : activeTab === "My Profile" ? <ProfileView
    onUserUpdate={(updatedUser) => {
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUserVer((v) => v + 1);
    }}
    externalError={linkError}
    externalSuccess={linkSuccess}
    onClearExternal={() => {
      setLinkError("");
      setLinkSuccess("");
    }}
  /> : activeTab === "My Applications" ? (
    // My Applications
    <div style={{ flex: 1, maxWidth: 1e3, width: "100%", margin: "40px auto", padding: "0 24px", fontFamily: T.font }}>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: "2rem", fontFamily: T.serif, color: T.text, margin: "0 0 8px" }}>My Applications</h1>
                <p style={{ color: T.textMid, margin: 0 }}>Track the status of roles you've applied for.</p>
              </div>

              {applications.length === 0 ? <div style={{ textAlign: "center", padding: "80px 0", color: T.textDim, background: T.surface, borderRadius: 16, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: "3rem", marginBottom: 16 }}>💼</div>
                  <h3 style={{ fontSize: "1.2rem", color: T.text, margin: "0 0 8px" }}>No applications yet</h3>
                  <p style={{ color: T.textMid, marginBottom: 20 }}>Explore available roles and submit your application.</p>
                  <Button variant="primary" onClick={() => setActiveTab("Browse Jobs")}>Find Jobs</Button>
                </div> : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {applications.map((app) => {
      const statusColors = {
        pending: ["rgba(250,204,21,0.15)", "#facc15"],
        accepted: ["rgba(74,222,128,0.15)", "#4ade80"],
        rejected: ["rgba(248,113,113,0.15)", "#f87171"]
      };
      const [statusBg, statusColor] = statusColors[app.status?.toLowerCase()] || ["rgba(255,255,255,0.08)", T.textMid];
      const compName = app.job?.company?.name || "Company";
      const initials = compName.slice(0, 2).toUpperCase();
      return <GlassCard key={app._id} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#5b6af7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                              {app.job?.logo ? <img src={app.job.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff" }}>{initials}</span>}
                            </div>
                            <div>
                              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: T.text, margin: "0 0 4px" }}>{app.job?.title || "Unknown Title"}</h3>
                              <p style={{ fontSize: "0.85rem", color: T.textMid, margin: 0 }}>{compName} · {app.job?.location || "Remote"}</p>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "0.75rem", color: T.textDim, marginBottom: 4 }}>Applied on</div>
                              <div style={{ fontSize: "0.8rem", color: T.textMid }}>{new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                            </div>
                            <span style={{ padding: "6px 14px", background: statusBg, color: statusColor, borderRadius: 20, fontSize: "0.78rem", fontWeight: 600, textTransform: "capitalize" }}>
                              {app.status}
                            </span>
                          </div>
                        </div>

                        {
        /* Visual Timeline Stepper */
      }
                        <div style={{ display: "flex", alignItems: "center", width: "100%", maxWidth: 500, margin: "8px 0 0 60px", borderTop: `1px dashed ${T.border}`, paddingTop: 16 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative" }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.greenDim, border: `2px solid ${T.green}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.green, fontSize: "0.65rem", fontWeight: 800 }}>✓</div>
                            <span style={{ fontSize: "0.68rem", color: T.text, marginTop: 4, fontWeight: 500 }}>Applied</span>
                            <span style={{ fontSize: "0.6rem", color: T.textDim, marginTop: 2 }}>{new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            
                            <div style={{ position: "absolute", top: 11, left: "calc(50% + 11px)", right: "-50%", height: 2, background: app.status?.toLowerCase() !== "pending" ? T.green : T.border, zIndex: 1 }} />
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative", zIndex: 2 }}>
                            <div style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: app.status?.toLowerCase() !== "pending" ? T.greenDim : T.purpleDim,
        border: `2px solid ${app.status?.toLowerCase() !== "pending" ? T.green : T.purple}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: app.status?.toLowerCase() !== "pending" ? T.green : T.purpleL,
        fontSize: "0.65rem",
        fontWeight: 800
      }}>
                              {app.status?.toLowerCase() !== "pending" ? "\u2713" : "\u2022"}
                            </div>
                            <span style={{ fontSize: "0.68rem", color: T.text, marginTop: 4, fontWeight: 500 }}>Screening</span>
                            <span style={{ fontSize: "0.6rem", color: T.textDim, marginTop: 2 }}>{app.status?.toLowerCase() !== "pending" ? "Completed" : "Under Review"}</span>

                            <div style={{ position: "absolute", top: 11, left: "calc(50% + 11px)", right: "-50%", height: 2, background: app.status?.toLowerCase() === "accepted" ? T.green : app.status?.toLowerCase() === "rejected" ? T.red : T.border, zIndex: 1 }} />
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative", zIndex: 2 }}>
                            <div style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: app.status?.toLowerCase() === "accepted" ? T.greenDim : app.status?.toLowerCase() === "rejected" ? T.redDim : T.surface,
        border: `2px solid ${app.status?.toLowerCase() === "accepted" ? T.green : app.status?.toLowerCase() === "rejected" ? T.red : T.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: app.status?.toLowerCase() === "accepted" ? T.green : app.status?.toLowerCase() === "rejected" ? T.red : T.textDim,
        fontSize: "0.65rem",
        fontWeight: 800
      }}>
                              {app.status?.toLowerCase() === "accepted" ? "\u2713" : app.status?.toLowerCase() === "rejected" ? "\u2715" : "\u2022"}
                            </div>
                            <span style={{ fontSize: "0.68rem", color: T.text, marginTop: 4, fontWeight: 500 }}>Decision</span>
                            <span style={{ fontSize: "0.6rem", color: T.textDim, marginTop: 2 }}>
                              {app.status?.toLowerCase() === "accepted" ? "Shortlisted" : app.status?.toLowerCase() === "rejected" ? "Rejected" : "Awaiting"}
                            </span>
                          </div>
                        </div>

                        {/* Submitted Resume Snapshot */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 0 60px", borderTop: `1px solid ${T.border}`, paddingTop: 14, flexWrap: "wrap", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: T.textMid }}>
                            <FileText size={16} color={T.purpleL} />
                            <span>Submitted Resume: <strong style={{ color: T.text }}>{app.resume?.originalName || (app.applicant?.profile?.resumeOriginalName || "Resume.pdf")}</strong></span>
                            {app.atsScore !== undefined && app.atsScore !== null && (
                              <span style={{ fontSize: "0.72rem", background: T.greenDim, color: T.green, padding: "2px 8px", borderRadius: 8, fontWeight: 700, border: `1px solid ${T.green}30`, marginLeft: 8 }}>
                                ATS Match: {app.atsScore}%
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Button size="sm" variant="outline" onClick={() => handleViewAppResume(app._id)}>
                              View Resume
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDownloadAppResume(app._id, app.resume?.originalName)}>
                              Download
                            </Button>
                          </div>
                        </div>
                      </GlassCard>;
    })}
                </div>}
            </div>
  ) : (
    // Browse Jobs & Saved
    <div className="jobs-main-layout" style={{ display: "flex", flex: 1, maxWidth: 1440, width: "100%", margin: "0 auto", height: "calc(100vh - 64px)", minHeight: 0, overflow: "hidden" }}>
              
              {
      /* Left Column: Search & Job List */
    }
              <div className="jobs-left-panel" style={{ flex: "0 0 40%", minWidth: 380, display: "flex", flexDirection: "column", height: "100%", minHeight: 0, borderRight: `1px solid ${T.border}`, background: isDark ? "rgba(9,9,15,0.6)" : "#f8fafc", overflowY: "auto" }}>
                <div style={{ padding: "24px 24px 16px", borderBottom: `1px solid ${T.border}`, background: T.bg, flexShrink: 0, position: "sticky", top: 0, zIndex: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h1 style={{ fontSize: "1.4rem", fontFamily: T.serif, color: T.text, margin: 0 }}>
                      {activeTab === "Saved" ? "Your Saved Jobs" : "Recommended for you"}
                    </h1>
                    {lastRefreshed && (
                      <span style={{ fontSize: "0.72rem", color: T.textDim }}>
                        Updated {formatRelativeTime(lastRefreshed, "just now")}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
                    <Input
                      icon={<Search size={15} />}
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      wrapStyle={{ flex: 1 }}
                    />
                    <button
                      onClick={() => fetchJobs(true)}
                      disabled={refreshing}
                      title="Refresh job listings"
                      style={{
                        height: 42,
                        padding: "0 14px",
                        background: refreshing ? T.surfaceHov : T.surface,
                        border: `1px solid ${T.purpleL}44`,
                        borderRadius: 10,
                        color: T.purpleL,
                        cursor: refreshing ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        fontFamily: T.font,
                        flexShrink: 0,
                        transition: "all 0.18s"
                      }}
                    >
                      <RotateCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                      <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {["Remote", "Engineering", "Full-time", "₹10L+", "₹20L+"].map((f) => {
      const isSel = selectedFilters.has(f);
      return <button
        key={f}
        onClick={() => handleToggleFilter(f)}
        style={{
          padding: "6px 14px",
          background: isSel ? "linear-gradient(135deg, #7c6af7, #5b4de0)" : T.surface,
          border: `1px solid ${isSel ? T.purpleL : T.border}`,
          borderRadius: 20,
          fontSize: "0.75rem",
          color: isSel ? "#fff" : T.textMid,
          whiteSpace: "nowrap",
          cursor: "pointer",
          transition: "all 0.2s",
          fontWeight: isSel ? 600 : 400
        }}
      >
                          {f}
                        </button>;
    })}
                  </div>
                </div>

                {
      /* Job List */
    }
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {loading ? <div style={{ textAlign: "center", padding: "40px 0", color: T.textDim, margin: "auto" }}>Loading...</div> : activeTab === "Saved" && savedIds.size === 0 ? <div style={{ textAlign: "center", padding: "60px 24px", color: T.textDim, margin: "auto" }}>
                    <span style={{ fontSize: "2.5rem" }}>🔖</span>
                    <h3 style={{ fontSize: "1.1rem", color: T.text, marginTop: 14, marginBottom: 8, fontWeight: 600 }}>Save some jobs first</h3>
                    <p style={{ fontSize: "0.82rem", color: T.textMid, marginBottom: 20 }}>Tap the bookmark icon on any job to save it here.</p>
                    <Button variant="primary" size="sm" onClick={() => setActiveTab("Browse Jobs")}>Browse Jobs</Button>
                  </div> : displayedJobs.length === 0 ? <div style={{ textAlign: "center", padding: "60px 24px", color: T.textDim, margin: "auto" }}>
                    <span style={{ fontSize: "2rem" }}>🔍</span>
                    <p style={{ marginTop: 10 }}>No jobs found.</p>
                  </div> : <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {paginatedJobs.map((job) => {
      const active = (job._id || job.id) === (activeJob?._id || activeJob?.id);
      const compName = job.company?.name || job.companyName || "Company";
      const initials = compName.slice(0, 2).toUpperCase();
      const isSaved = savedIds.has(job._id || job.id);
      const cardAts = getJobCardAts(job);
      const relTime = formatRelativeTime(job.postedAt || job.posted_date || job.createdAt, "Recently posted");
      return <div
        key={job._id || job.id}
        onClick={() => setActiveJobId(job._id || job.id)}
        style={{
          background: active ? (isDark ? T.purpleDim : "rgba(124,106,247,0.12)") : (isDark ? T.surface : "#ffffff"),
          border: `1px solid ${active ? T.purpleL + (isDark ? "55" : "88") : T.border}`,
          borderRadius: 12,
          padding: "16px 18px",
          cursor: "pointer",
          transition: "all 0.2s",
          position: "relative",
          flexShrink: 0,
          boxShadow: isDark ? "none" : (active ? "0 4px 14px rgba(124,106,247,0.12)" : "0 1px 3px rgba(0,0,0,0.05)")
        }}
      >
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#5b6af7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                                {job.logo ? <img src={job.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fff" }}>{initials}</span>}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: T.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</div>
                                <div style={{ fontSize: "0.78rem", color: T.textDim }}>{compName}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              {job.isExternal ? (
                                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: T.purpleL, background: T.purpleDim, padding: "2px 6px", borderRadius: 6, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                                  {job.provider === "jooble" ? "Jooble" : (job.provider === "adzuna" ? "Adzuna" : job.provider || "Partner")}
                                </span>
                              ) : job.isDemo ? (
                                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: T.orange, background: "rgba(251,146,60,0.12)", padding: "2px 6px", borderRadius: 6, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                                  Demo
                                </span>
                              ) : (
                                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: T.green, background: T.greenDim, padding: "2px 6px", borderRadius: 6, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                                  Direct
                                </span>
                              )}
                              <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleSave(job._id || job.id);
        }}
        style={{ background: "none", border: "none", color: isSaved ? T.purple : T.textDim, cursor: "pointer", display: "flex", padding: 0 }}
      >
                              <Bookmark size={16} fill={isSaved ? T.purple : "none"} />
                            </button>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", gap: 12, fontSize: "0.75rem", color: T.textMid, marginBottom: 10 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{job.location || "India"}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Banknote size={12} />{formatSal(job.salary, job)}</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <Tag>{job.jobType || "Full-time"}</Tag>
                              {relTime && <Tag>{relTime}</Tag>}
                            </div>
                            {cardAts.score !== null ? (
                              <span style={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: cardAts.score >= 70 ? T.green : (cardAts.score >= 40 ? T.orange : T.textDim),
                                background: cardAts.score >= 70 ? T.greenDim : (cardAts.score >= 40 ? T.orange + "20" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)")),
                                padding: "3px 8px",
                                borderRadius: 12,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4
                              }}>
                                ✨ {cardAts.score}% Match
                              </span>
                            ) : (
                              <span style={{
                                fontSize: "0.68rem",
                                fontWeight: 500,
                                color: T.textDim,
                                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                                padding: "3px 8px",
                                borderRadius: 12
                              }}>
                                ATS Ready
                              </span>
                            )}
                          </div>
                        </div>;
    })}
                  </div>}
                </div>

                {
      /* Pagination Controls */
    }
                {totalPages > 1 && <div style={{
      padding: "16px 24px",
      borderTop: `1px solid ${T.border}`,
      background: T.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: T.font,
      flexShrink: 0
    }}>
                    <button
      onClick={() => {
        const prevPage = currentPage - 1;
        setCurrentPage(prevPage);
        const pageFirstJob = displayedJobs[(prevPage - 1) * jobsPerPage];
        if (pageFirstJob) setActiveJobId(pageFirstJob._id);
      }}
      disabled={currentPage === 1}
      style={{
        padding: "6px 12px",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        color: currentPage === 1 ? T.textDim : T.textMid,
        fontSize: "0.78rem",
        fontWeight: 600,
        cursor: currentPage === 1 ? "not-allowed" : "pointer",
        transition: "all 0.18s"
      }}
    >
                      Previous
                    </button>

                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {Array.from({ length: totalPages }).map((_, idx) => {
      const pageNum = idx + 1;
      const isActive = pageNum === currentPage;
      return <button
        key={pageNum}
        onClick={() => {
          setCurrentPage(pageNum);
          const pageFirstJob = displayedJobs[(pageNum - 1) * jobsPerPage];
          if (pageFirstJob) setActiveJobId(pageFirstJob._id);
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: isActive ? T.purpleDim : "transparent",
          border: `1px solid ${isActive ? T.purpleL + "55" : "transparent"}`,
          color: isActive ? T.purpleL : T.textMid,
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.18s"
        }}
      >
                            {pageNum}
                          </button>;
    })}
                    </div>

                    <button
      onClick={() => {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        const pageFirstJob = displayedJobs[(nextPage - 1) * jobsPerPage];
        if (pageFirstJob) setActiveJobId(pageFirstJob._id);
      }}
      disabled={currentPage === totalPages}
      style={{
        padding: "6px 12px",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        color: currentPage === totalPages ? T.textDim : T.textMid,
        fontSize: "0.78rem",
        fontWeight: 600,
        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
        transition: "all 0.18s"
      }}
    >
                      Next
                    </button>
                  </div>}
              </div>

              {
      /* Right Column: Job Description / Detail Empty State */
    }
              {activeTab === "Saved" && savedIds.size === 0 ? <div className="jobs-right-panel" style={{ flex: "1 1 60%", height: "100%", minHeight: 0, background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.textDim, padding: 32, textAlign: "center", overflowY: "auto" }}>
                  <span style={{ fontSize: "3.5rem", marginBottom: 16 }}>🔖</span>
                  <h2 style={{ fontSize: "1.4rem", fontFamily: T.serif, color: T.text, margin: "0 0 8px" }}>Your Saved Queue is Empty</h2>
                  <p style={{ color: T.textMid, fontSize: "0.9rem", maxWidth: 360, margin: "0 0 24px", lineHeight: 1.6 }}>Save job postings that interest you, so you can review and apply to them later.</p>
                  <Button variant="primary" onClick={() => setActiveTab("Browse Jobs")}>Find Jobs Now</Button>
                </div> : activeJob && (activeTab !== "Saved" || savedIds.has(activeJob._id)) ? <div className="jobs-right-panel" style={{ flex: "1 1 60%", height: "100%", minHeight: 0, background: T.bg, display: "flex", flexDirection: "column", overflowY: "auto" }}>
                  <div style={{ position: "relative", height: 160, flexShrink: 0, background: `linear-gradient(135deg, rgba(91,106,247,0.15) 0%, rgba(124,106,247,0.06) 100%)`, borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ position: "absolute", bottom: -28, left: 32, width: 72, height: 72, borderRadius: 16, background: "#5b6af7", border: `4px solid ${T.bg}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", zIndex: 2 }}>
                      {activeJob.logo ? <img src={activeJob.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>{(activeJob.company?.name || activeJob.companyName || "Co").slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <div style={{ position: "absolute", top: 20, right: 24, display: "flex", gap: 8 }}>
                      <Button variant="ghost" size="sm" icon={<Share2 size={14} />}>Share</Button>
                      <Button
      variant="ghost"
      size="sm"
      icon={<BookmarkPlus size={14} />}
      onClick={() => handleToggleSave(activeJob._id)}
      style={{ color: savedIds.has(activeJob._id) ? T.purpleL : T.textMid }}
    >
                        {savedIds.has(activeJob._id) ? "Saved" : "Save"}
                      </Button>
                    </div>
                    {activeJob.isExternal ? (
                      <div style={{ position: "absolute", top: 20, left: 24, display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: T.purpleDim, border: `1px solid ${T.purpleL}44`, borderRadius: 20 }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: T.purpleL }}>via {activeJob.provider === "jooble" ? "Jooble India" : (activeJob.provider === "adzuna" ? "Adzuna India" : activeJob.provider || "Partner")}</span>
                      </div>
                    ) : activeJob.isDemo ? (
                      <div style={{ position: "absolute", top: 20, left: 24, display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(251,146,60,0.12)", border: `1px solid ${T.orange}44`, borderRadius: 20 }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: T.orange }}>Featured Demo Role</span>
                      </div>
                    ) : (
                      <div style={{ position: "absolute", top: 20, left: 24, display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: T.greenDim, border: `1px solid ${T.green}44`, borderRadius: 20 }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: T.green }}>JobSphere Direct</span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "44px 32px 32px", flex: 1 }}>
                    <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h1 style={{ fontSize: "1.6rem", fontFamily: T.serif, color: T.text, margin: "0 0 8px", lineHeight: 1.2 }}>{activeJob.title}</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", color: T.textMid, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 500, color: T.text }}>{activeJob.company?.name || activeJob.companyName || "Company"}</span>
                          <span style={{ color: T.textDim }}>•</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} />{activeJob.location || "India"}</span>
                          <span style={{ color: T.textDim }}>•</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} />Posted {formatRelativeTime(activeJob.postedAt || activeJob.posted_date || activeJob.createdAt, "Recently")}</span>
                        </div>
                      </div>
                      {activeAts.score !== null ? (
                        <span style={{
                          flexShrink: 0,
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: activeAts.score >= 70 ? T.green : (activeAts.score >= 40 ? T.orange : T.textDim),
                          background: activeAts.score >= 70 ? T.greenDim : (activeAts.score >= 40 ? T.orange + "20" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)")),
                          padding: "5px 12px",
                          borderRadius: 20,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          border: `1px solid ${activeAts.score >= 70 ? T.green + "40" : (activeAts.score >= 40 ? T.orange + "40" : T.border)}`,
                          whiteSpace: "nowrap"
                        }}>
                          ✨ {activeAts.score}% Match
                        </span>
                      ) : (
                        <span style={{
                          flexShrink: 0,
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          color: T.textDim,
                          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                          padding: "5px 12px",
                          borderRadius: 20,
                          border: `1px solid ${T.border}`
                        }}>
                          📊 ATS Analysis
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                      <Tag color={T.greenDim} textColor={T.green}>{activeJob.jobType || "Full-time"}</Tag>
                      <Tag>{formatSal(activeJob.salary, activeJob)}</Tag>
                      {(activeJob.requirements || activeJob.skills || []).slice(0, 5).map((t) => <Tag key={t}>{t}</Tag>)}
                    </div>

                    {!activeJob.isExternal && !activeJob.isDemo && !hasResume ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <Button
                            variant="primary"
                            size="lg"
                            style={{ padding: "12px 32px", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                            onClick={() => setActiveTab("My Profile")}
                          >
                            Upload Resume to Apply
                          </Button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#d97706", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", padding: "10px 14px", borderRadius: 8, fontSize: "0.84rem" }}>
                          <AlertTriangle size={16} />
                          <span>Resume required before applying. Please upload your resume in My Profile.</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                        <Button
                          variant="primary"
                          size="lg"
                          iconRight={!applyLoading && <ArrowRight size={16} />}
                          style={{ padding: "12px 32px" }}
                          onClick={() => handleApply(activeJob._id || activeJob.id)}
                          disabled={applyLoading || (!activeJob.isExternal && !activeJob.isDemo && hasAppliedToActiveJob)}
                        >
                          {applyLoading
                            ? "Applying..."
                            : activeJob.isExternal
                            ? `Apply on ${activeJob.provider === "jooble" ? "Jooble India" : (activeJob.provider === "adzuna" ? "Adzuna India" : activeJob.provider || "External Site")}`
                            : activeJob.isDemo
                            ? "Demo Application (Instant)"
                            : hasAppliedToActiveJob
                            ? "Already Applied"
                            : "Easy Apply"}
                        </Button>
                        
                        {applySuccess && <span style={{ fontSize: "0.9rem", color: applySuccess.includes("Successfully") || applySuccess.includes("successfully") ? T.green : "#ef4444", fontWeight: 600 }}>
                            {applySuccess}
                          </span>}
                      </div>
                    )}

                    {/* ATS Skills Match Analysis */}
                    <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, marginBottom: 32 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                        <h3 style={{ fontSize: "0.95rem", color: T.text, margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          📊 ATS Skills Match Analysis
                        </h3>
                        {activeAts.score !== null && (
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: activeAts.score >= 70 ? T.green : (activeAts.score >= 40 ? T.orange : T.textDim) }}>
                            Match: {activeAts.score}% ({activeAts.totalMatched}/{activeAts.totalRequired} skills)
                          </span>
                        )}
                      </div>

                      {activeAts.status === "no_resume" ? (
                        <div style={{ fontSize: "0.84rem", color: T.textMid, lineHeight: 1.5 }}>
                          <p style={{ margin: "0 0 8px", color: T.orange }}>{activeAts.summaryMessage}</p>
                          <span style={{ color: T.purpleL, cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }} onClick={() => setActiveTab("My Profile")}>
                            → Go to My Profile to Upload Resume
                          </span>
                        </div>
                      ) : activeAts.status === "no_user_skills" ? (
                        <div style={{ fontSize: "0.84rem", color: T.textMid, lineHeight: 1.5 }}>
                          <p style={{ margin: "0 0 8px" }}>{activeAts.summaryMessage}</p>
                          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                            <span style={{ color: T.purpleL, cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }} onClick={() => setActiveTab("My Profile")}>→ Edit My Profile</span>
                            <span style={{ color: T.purpleL, cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }} onClick={() => setActiveTab("AI Resume Analyzer")}>→ Upload Resume</span>
                          </div>
                        </div>
                      ) : activeAts.status === "no_job_requirements" ? (
                        <div style={{ fontSize: "0.84rem", color: T.textMid, lineHeight: 1.5 }}>
                          <p style={{ margin: 0 }}>{activeAts.summaryMessage}</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ fontSize: "0.82rem", color: activeAts.score >= 70 ? T.green : (activeAts.score >= 40 ? T.orange : T.textMid), fontWeight: 500 }}>
                            {activeAts.summaryMessage}
                          </div>

                          {activeAts.matched.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: "0.78rem", color: T.green, fontWeight: 600, minWidth: 110 }}>Matched Skills ({activeAts.matched.length}):</span>
                              {activeAts.matched.map((s) => (
                                <span key={s} style={{ fontSize: "0.72rem", background: T.greenDim, color: T.green, padding: "3px 8px", borderRadius: 8, border: `1px solid ${T.green}30` }}>
                                  ✓ {s}
                                </span>
                              ))}
                            </div>
                          )}

                          {activeAts.missing.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: "0.78rem", color: T.orange, fontWeight: 600, minWidth: 110 }}>Missing Skills ({activeAts.missing.length}):</span>
                              {activeAts.missing.map((s) => (
                                <span key={s} style={{ fontSize: "0.72rem", background: T.orange + "15", color: T.orange, padding: "3px 8px", borderRadius: 8, border: `1px solid ${T.orange}30` }}>
                                  + {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.78rem", color: T.green, fontWeight: 600 }}>
                              ✨ You have all the matching skills for this position!
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ height: 1, background: T.border, marginBottom: 24 }} />

                    <div style={{ color: T.textMid, fontSize: "0.92rem", lineHeight: 1.75 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <h3 style={{ fontSize: "1.05rem", color: T.text, fontWeight: 700, margin: 0 }}>About the role</h3>
                        {enrichingDesc && (
                          <span style={{ fontSize: "0.75rem", color: T.purpleL, display: "inline-flex", alignItems: "center", gap: 6, background: T.purpleDim, padding: "3px 10px", borderRadius: 12 }}>
                            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "inline-block" }}>⟳</motion.span>
                            Loading full job description...
                          </span>
                        )}
                      </div>
                      <JobDescriptionMarkup content={activeJob.description} />

                      {activeJob.isExternal && (activeJob.externalUrl || activeJob.apply_url) && (
                        <div style={{ marginTop: 28, padding: "16px 20px", borderRadius: 14, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                          <div>
                            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: T.text }}>Official Job Posting</div>
                            <div style={{ fontSize: "0.75rem", color: T.textDim }}>Direct from {activeJob.provider === "jooble" ? "Jooble India" : (activeJob.provider === "adzuna" ? "Adzuna India" : "Partner")}</div>
                          </div>
                          <a
                            href={activeJob.externalUrl || activeJob.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: T.purpleL,
                              textDecoration: "none",
                              padding: "8px 16px",
                              borderRadius: 10,
                              background: T.purpleDim,
                              border: `1px solid ${T.purpleL}40`,
                              transition: "all 0.15s ease"
                            }}
                          >
                            <span>View Source Listing</span>
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div> : <div className="jobs-right-panel" style={{ flex: "1 1 60%", height: "100%", minHeight: 0, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.textDim, overflowY: "auto" }}>
                  Select a job to view details
                </div>}
            </div>
  )}
        </motion.div>
      </AnimatePresence>
    </div>;
}
