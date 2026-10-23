"use strict";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Users,
  BarChart3,
  TrendingUp,
  Bell,
  Plus,
  MapPin,
  Clock,
  Banknote,
  X,
  Check,
  AlertTriangle,
  UploadCloud,
  FileText,
  Download,
  ExternalLink,
  Mail,
  Phone,
  Search
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Button, Input, GlassCard, getRelativeTime } from "./JobPortal";
import { formatSalaryDisplay } from "./utils/currency";
import API from "./services/api";
import { useTheme, ThemeToggle, T } from "./context/ThemeContext";

function RecruiterNavbar({ onSignOut, onOpenPostModal, userName = "Recruiter", activeTab, onTabChange }) {
  const { isDark } = useTheme();
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  return <nav style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100, fontFamily: T.font }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 40 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #7c6af7, #4ade80)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Briefcase size={14} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: T.serif, fontSize: "1.15rem", color: T.text, letterSpacing: "-0.01em" }}>JobSphere</span>
        </div>

        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          {["Dashboard", "Company Profile", "My Profile"].map((l) => {
    const isActive = activeTab === l;
    return <button key={l} onClick={() => onTabChange(l)} style={{ padding: "8px 14px", background: isActive ? T.surface : "transparent", border: "none", color: isActive ? T.text : T.textMid, fontSize: "0.875rem", fontWeight: isActive ? 500 : 400, cursor: "pointer", borderRadius: 8, fontFamily: T.font, transition: "all 0.2s" }}>
                {l}
              </button>;
  })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Theme Toggle */}
          <ThemeToggle />

          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={onOpenPostModal}>Post Job</Button>
          
          <div style={{ position: "relative" }}>
            <button
    onClick={() => setIsNotifOpen(!isNotifOpen)}
    style={{ background: "none", border: "none", color: isNotifOpen ? T.purpleL : T.textDim, cursor: "pointer", display: "flex", position: "relative", padding: 4 }}
  >
              <Bell size={18} />
              {unreadCount > 0 && <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: T.purple }} />}
            </button>
            
            <AnimatePresence>
              {isNotifOpen && <div style={{ position: "absolute", top: 32, right: 0, width: 320, background: isDark ? "rgba(12,10,24,0.96)" : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, boxShadow: isDark ? "0 20px 40px rgba(0,0,0,0.6)" : "0 12px 36px rgba(0,0,0,0.12)", zIndex: 1e3, backdropFilter: "blur(12px)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, borderBottom: `1px solid ${T.border}`, paddingBottom: 8, alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }}>Notifications</span>
                    {unreadCount > 0 && <span onClick={handleMarkAllRead} style={{ fontSize: "0.72rem", color: T.purpleL, cursor: "pointer", fontWeight: 500 }}>Mark all read</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 240, overflowY: "auto" }}>
                    {notifications.map((n) => <div key={n.id} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px", borderRadius: 8, background: n.read ? "transparent" : (isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"), borderLeft: n.read ? "none" : `3px solid ${T.purple}`, transition: "all 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: T.text }}>{n.title}</span>
                          <span style={{ fontSize: "0.65rem", color: T.textDim }}>{n.time}</span>
                        </div>
                        <span style={{ fontSize: "0.72rem", color: T.textMid, lineHeight: 1.4 }}>{n.body}</span>
                      </div>)}
                  </div>
                </div>}
            </AnimatePresence>
          </div>

          <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "#fff", cursor: "pointer" }} onClick={() => onTabChange("My Profile")}>{initials}</div>
          <button onClick={onSignOut} style={{ fontSize: "0.8rem", color: T.textDim, background: "none", border: "none", cursor: "pointer" }}>Sign Out</button>
        </div>
      </div>
    </nav>;
}
function StatCard({ icon, label, value, trend, color }) {
  return <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: "0.8rem", color: T.textMid, marginBottom: 8, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: "1.8rem", fontFamily: T.serif, color: T.text, marginBottom: 6 }}>{value}</div>
        <div style={{ fontSize: "0.75rem", color, fontWeight: 600 }}>{trend}</div>
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", color }}>
        {icon}
      </div>
    </div>;
}
function RecruiterProfileView({ onUserUpdate }) {
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [fullname, setFullname] = useState(savedUser.fullname || "");
  const [email, setEmail] = useState(savedUser.email || "");
  const [phoneNumber, setPhoneNumber] = useState(savedUser.phoneNumber || "");
  const [bio, setBio] = useState(savedUser.profile?.bio || "");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
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
        bio
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
  return <div style={{ flex: 1, maxWidth: 680, width: "100%", margin: "40px auto", padding: "0 24px", fontFamily: T.font }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "2rem", fontFamily: T.serif, color: T.text, margin: "0 0 8px" }}>My Recruiter Profile</h1>
        <p style={{ color: T.textMid, margin: 0 }}>View and manage your account details and contact info.</p>
      </div>

      <GlassCard style={{ padding: 32 }}>
        {successMsg && <div style={{ color: T.green, background: T.greenDim, border: `1px solid ${T.green}40`, padding: "12px 16px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 20 }}>
            {successMsg}
          </div>}
        {errorMsg && <div style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.20)", padding: "12px 16px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 20 }}>
            {errorMsg}
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
            <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Corporate Description / Bio</label>
            <textarea
    placeholder="Tell us about yourself, your company role, or hiring objectives..."
    value={bio}
    onChange={(e) => setBio(e.target.value)}
    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.text, fontSize: "0.9rem", outline: "none", fontFamily: T.font, minHeight: 120, boxSizing: "border-box" }}
  />
          </div>

          <div style={{ marginTop: 10 }}>
            <Button type="submit" variant="primary" style={{ padding: "12px 28px" }} disabled={loading}>
              {loading ? "Saving Changes..." : "Save Profile Details"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>;
}
function CompanyProfileView({ company, onUpdate }) {
  const [name, setName] = useState(company?.name || "");
  const [description, setDescription] = useState(company?.description || "");
  const [website, setWebsite] = useState(company?.website || "");
  const [location, setLocation] = useState(company?.location || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setDescription(company.description || "");
      setWebsite(company.website || "");
      setLocation(company.location || "");
    }
  }, [company]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!company?._id) return;
    setLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const res = await API.put(`/company/update/${company._id}`, { name, description, website, location });
      if (res.data.success) {
        setMsg({ text: "Company updated successfully!", type: "success" });
        onUpdate();
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      console.error(err);
      setMsg({ text: err.response?.data?.message || err.message || "Update failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };
  if (!company) {
    return <div style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 24px", fontFamily: T.font }}>
        <p style={{ color: T.textMid }}>No company found. Please post a job first to auto-register your company.</p>
      </div>;
  }
  return <div style={{ flex: 1, maxWidth: 800, width: "100%", margin: "0 auto", padding: "40px 24px", fontFamily: T.font }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: T.serif, fontSize: "2rem", color: T.text, margin: "0 0 8px" }}>Company Profile</h1>
        <p style={{ color: T.textMid, margin: 0, fontSize: "0.95rem" }}>Manage your organization's public details.</p>
      </div>

      <GlassCard style={{ padding: 32 }}>
        {msg.text && <div style={{ padding: "12px 16px", borderRadius: 8, background: msg.type === "success" ? T.greenDim : T.redDim, color: msg.type === "success" ? T.green : T.red, marginBottom: 24, fontSize: "0.875rem" }}>
            {msg.text}
          </div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Company Name</label>
              <Input placeholder="Acme Corp" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Website</label>
              <Input placeholder="https://acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Headquarters / Location</label>
            <Input placeholder="San Francisco, CA" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.82rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>About the Company</label>
            <textarea
    placeholder="What does your company do?"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.text, fontSize: "0.9rem", outline: "none", fontFamily: T.font, minHeight: 120, boxSizing: "border-box" }}
  />
          </div>

          <div style={{ marginTop: 10 }}>
            <Button type="submit" variant="primary" style={{ padding: "12px 28px" }} disabled={loading}>
              {loading ? "Saving..." : "Save Company Details"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>;
}

function ApplicantsListView({
  jobs,
  applicants,
  selectedJobId,
  onSelectJobId,
  onUpdateStatus,
  onViewResume,
  onDownloadResume,
  isDark
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = applicants.filter((a) => {
    const matchesJob = selectedJobId === "All" || a.jobId === selectedJobId;
    if (!matchesJob) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (a.applicant?.fullname || "").toLowerCase();
    const email = (a.applicant?.email || "").toLowerCase();
    const skills = Array.isArray(a.applicant?.profile?.skills)
      ? a.applicant.profile.skills.join(" ").toLowerCase()
      : "";
    const jobTitle = (a.jobTitle || "").toLowerCase();
    return name.includes(term) || email.includes(term) || skills.includes(term) || jobTitle.includes(term);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Filter and Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", color: T.textMid, fontWeight: 500 }}>Filter by Job:</span>
          <select
            value={selectedJobId}
            onChange={(e) => onSelectJobId(e.target.value)}
            style={{
              background: isDark ? "#120a2a" : "#ffffff",
              border: `1px solid ${T.border}`,
              color: T.text,
              fontSize: "0.85rem",
              borderRadius: 8,
              padding: "8px 32px 8px 14px",
              fontFamily: T.font,
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              WebkitAppearance: "none",
              backgroundPosition: "right 10px center",
              backgroundSize: "12px",
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239090b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: "no-repeat"
            }}
          >
            <option value="All">All Jobs ({applicants.length} total applicants)</option>
            {jobs.map((j) => {
              const count = applicants.filter((a) => a.jobId === j._id).length;
              return (
                <option key={j._id} value={j._id}>
                  {j.title} ({count} applicants)
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search size={16} color={T.textDim} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search candidate, email, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "8px 12px 8px 36px",
                color: T.text,
                fontSize: "0.85rem",
                outline: "none",
                fontFamily: T.font,
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>
      </div>

      {/* Applicants List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14 }}>
          <Users size={40} color={T.textDim} style={{ margin: "0 auto 12px", opacity: 0.6 }} />
          <h3 style={{ fontSize: "1.1rem", color: T.text, margin: "0 0 6px", fontWeight: 600 }}>No Applicants Found</h3>
          <p style={{ color: T.textMid, fontSize: "0.85rem", maxWidth: 440, margin: "0 auto" }}>
            {searchTerm ? "No candidates matched your search criteria." : "Candidates who apply with their verified resumes to your job postings will appear here."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((app) => {
            const candidate = app.applicant || {};
            const cName = candidate.fullname || "Anonymous Candidate";
            const cInit = cName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            const appliedDate = new Date(app.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const resumeFilename = app.resume?.originalName || (candidate.profile?.resumeOriginalName || "Resume.pdf");
            const resumeSize = app.resume?.size ? `${Math.round(app.resume.size / 1024)} KB` : "";
            const skills = candidate.profile?.skills || [];
            const status = app.status?.toLowerCase() || "pending";
            const statusBg = status === "accepted" ? T.greenDim : status === "rejected" ? T.redDim : "rgba(250,204,21,0.12)";
            const statusColor = status === "accepted" ? T.green : status === "rejected" ? T.red : "#eab308";

            return (
              <GlassCard key={app._id} style={{ padding: "24px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  {/* Left: Candidate Details */}
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.purpleDim, border: `1px solid ${T.purpleL}40`, display: "flex", alignItems: "center", justifyContent: "center", color: T.purpleL, fontSize: "1.1rem", fontWeight: 700, flexShrink: 0 }}>
                      {cInit}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: T.text, margin: 0 }}>{cName}</h3>
                        <span style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: 12, fontWeight: 700, background: statusBg, color: statusColor, textTransform: "capitalize" }}>
                          {status}
                        </span>
                        {app.atsScore !== undefined && app.atsScore !== null && (
                          <span style={{ fontSize: "0.72rem", background: T.greenDim, color: T.green, border: `1px solid ${T.green}40`, padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>
                            ATS Match: {app.atsScore}%
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8, fontSize: "0.82rem", color: T.textMid }}>
                        <span style={{ fontWeight: 600, color: T.purpleL }}>Role: {app.jobTitle}</span>
                        {candidate.email && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Mail size={13} /> {candidate.email}
                          </span>
                        )}
                        {candidate.phoneNumber && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Phone size={13} /> {candidate.phoneNumber}
                          </span>
                        )}
                        <span>Applied: {appliedDate}</span>
                      </div>

                      {/* Skills List */}
                      {skills.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                          {skills.map((s) => (
                            <span key={s} style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: 6, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", border: `1px solid ${T.border}`, color: T.textMid }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Workflow Actions */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {status !== "accepted" && (
                      <button
                        onClick={() => onUpdateStatus(app._id, "accepted")}
                        style={{ padding: "8px 16px", background: T.greenDim, border: `1px solid ${T.green}40`, borderRadius: 8, color: T.green, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Check size={14} /> Shortlist
                      </button>
                    )}
                    {status !== "rejected" && (
                      <button
                        onClick={() => onUpdateStatus(app._id, "rejected")}
                        style={{ padding: "8px 16px", background: T.redDim, border: `1px solid ${T.red}40`, borderRadius: 8, color: T.red, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <X size={14} /> Reject
                      </button>
                    )}
                    {status !== "pending" && (
                      <button
                        onClick={() => onUpdateStatus(app._id, "pending")}
                        style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.textDim, cursor: "pointer", fontSize: "0.8rem", fontWeight: 500 }}
                      >
                        Reset Pending
                      </button>
                    )}
                  </div>
                </div>

                {/* Submitted Resume Box */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: T.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", color: T.purpleL }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: T.text, wordBreak: "break-all" }}>
                        {resumeFilename}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: T.textDim, marginTop: 2 }}>
                        Verified Snapshot submitted with application {resumeSize && `• ${resumeSize}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" variant="outline" onClick={() => onViewResume(app._id)}>
                      <ExternalLink size={13} style={{ marginRight: 6 }} /> View Resume
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDownloadResume(app._id, resumeFilename)}>
                      <Download size={13} style={{ marginRight: 6 }} /> Download
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function JobPortalRecruiterView({ onSignOut }) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [activeSubTab, setActiveSubTab] = useState("Overview");
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userVer, setUserVer] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState("All");
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobReqs, setJobReqs] = useState("");
  const [jobSalary, setJobSalary] = useState("");
  const [jobLoc, setJobLoc] = useState("");
  const [jobType, setJobType] = useState("Full-time");
  const [jobExp, setJobExp] = useState("1");
  const [jobPos, setJobPos] = useState("1");
  const [jobLogo, setJobLogo] = useState(null);
  const [jobLogoName, setJobLogoName] = useState("");
  const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = savedUser.fullname || "Recruiter";
  const fetchData = async () => {
    setLoading(true);
    try {
      const compRes = await API.get("/company/get");
      let userCompanies = [];
      if (compRes.data.success) {
        userCompanies = compRes.data.companies || [];
        setCompanies(userCompanies);
      }
      const jobsRes = await API.get("/job/getadminjobs");
      if (jobsRes.data.success) {
        const adminJobs = jobsRes.data.jobs || [];
        setJobs(adminJobs);
        let allApplicants = [];
        try {
          const batchRes = await API.get("/application/recruiter/all");
          if (batchRes.data?.success && Array.isArray(batchRes.data.applications)) {
            allApplicants = batchRes.data.applications.map((app) => ({
              ...app,
              jobTitle: app.job?.title || "Unknown Job",
              jobId: app.job?._id || app.job,
            }));
          }
        } catch (batchErr) {
          // Fallback to per-job query
          for (const j of adminJobs) {
            try {
              const appRes = await API.get(`/application/${j._id}/applicants`);
              if (appRes.data.success && appRes.data.job?.applications) {
                appRes.data.job.applications.forEach((app) => {
                  allApplicants.push({
                    ...app,
                    jobTitle: j.title,
                    jobId: j._id
                  });
                });
              }
            } catch (err) {
              console.error(`Error fetching applicants for job ${j._id}:`, err);
            }
          }
        }
        allApplicants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setApplicants(allApplicants);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleUpdateStatus = async (applicationId, status) => {
    try {
      const res = await API.post(`/application/status/${applicationId}/update`, { status });
      if (res.data.success) {
        setApplicants((prev) => prev.map(
          (app) => app._id === applicationId ? { ...app, status: status.toLowerCase() } : app
        ));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleViewResume = async (applicationId) => {
    try {
      const res = await API.get(`/application/${applicationId}/resume`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to view resume.");
    }
  };

  const handleDownloadResume = async (applicationId, filename) => {
    try {
      const res = await API.get(`/application/${applicationId}/resume?download=true`, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "applicant_resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to download resume.");
    }
  };
  const handlePostJob = async (e) => {
    e.preventDefault();
    setPostError("");
    let activeCompanyId = companies[0]?._id;
    if (!activeCompanyId) {
      setPostLoading(true);
      try {
        const compRes = await API.post("/company/register", { companyName: `${userName}'s Company` });
        if (compRes.data.success) {
          activeCompanyId = compRes.data.company?._id;
          setCompanies([compRes.data.company]);
        } else {
          throw new Error("Failed to register default company");
        }
      } catch (err) {
        setPostError(err.response?.data?.message || "Failed to register company.");
        setPostLoading(false);
        return;
      }
    }
    setPostLoading(true);
    try {
      const res = await API.post("/job/post", {
        title: jobTitle,
        description: jobDesc,
        requirements: jobReqs,
        // string, backend splits it
        salary: Number(jobSalary),
        location: jobLoc,
        jobType,
        experience: Number(jobExp),
        position: Number(jobPos),
        companyId: activeCompanyId,
        logo: jobLogo
      });
      if (res.data.success) {
        setIsPostModalOpen(false);
        setJobTitle("");
        setJobDesc("");
        setJobReqs("");
        setJobSalary("");
        setJobLoc("");
        setJobType("Full-time");
        setJobExp("1");
        setJobPos("1");
        setJobLogo(null);
        setJobLogoName("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setPostError(err.response?.data?.message || "Failed to post job.");
    } finally {
      setPostLoading(false);
    }
  };
  const activeJobsCount = jobs.length;
  const totalApplicantsCount = applicants.length;
  const shortlistedCount = applicants.filter((a) => a.status === "accepted" || a.status === "interview").length;
  const totalViewsMock = activeJobsCount > 0 ? (activeJobsCount * 1140).toLocaleString() : "0";
  const jobChartData = jobs.map((j) => {
    const jobApps = applicants.filter((a) => a.jobId === j._id).length;
    return {
      name: j.title.length > 18 ? j.title.substring(0, 15) + "..." : j.title,
      Applicants: jobApps
    };
  });
  const statusDistributionData = [
    { name: "Pending", value: applicants.filter((a) => a.status === "pending").length, color: "#facc15" },
    { name: "Shortlisted", value: shortlistedCount, color: "#4ade80" },
    { name: "Rejected", value: applicants.filter((a) => a.status === "rejected").length, color: "#ef4444" }
  ].filter((d) => d.value > 0);
  const kanbanApplicants = applicants.filter((a) => selectedJobId === "All" || a.jobId === selectedJobId);
  const columns = {
    pending: kanbanApplicants.filter((a) => a.status === "pending"),
    accepted: kanbanApplicants.filter((a) => a.status === "accepted" || a.status === "interview"),
    rejected: kanbanApplicants.filter((a) => a.status === "rejected")
  };
  return <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.font, display: "flex", flexDirection: "column" }}>
      <RecruiterNavbar
    onSignOut={onSignOut}
    onOpenPostModal={() => setIsPostModalOpen(true)}
    userName={userName}
    activeTab={activeTab}
    onTabChange={setActiveTab}
    key={userVer}
  />
      
      <AnimatePresence mode="wait">
        <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.22, ease: "easeInOut" }}
    style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}
  >
          {activeTab === "My Profile" ? <RecruiterProfileView onUserUpdate={(updatedUser) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUserVer((v) => v + 1);
  }} /> : activeTab === "Company Profile" ? <CompanyProfileView company={companies[0]} onUpdate={fetchData} /> : <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 24px" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                <div>
                  <h1 style={{ fontFamily: T.serif, fontSize: "2rem", color: T.text, margin: "0 0 8px" }}>Recruiter Dashboard</h1>
                  <p style={{ color: T.textMid, margin: 0, fontSize: "0.95rem" }}>Welcome back, {userName}. Here's what's happening with your job postings.</p>
                </div>
                <div style={{ display: "flex", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4 }}>
                  {["Overview", "Applicants", "Active Jobs"].map((t) => <button
    key={t}
    onClick={() => setActiveSubTab(t)}
    style={{ padding: "6px 16px", borderRadius: 8, fontSize: "0.85rem", fontWeight: t === activeSubTab ? 600 : 400, background: t === activeSubTab ? T.greenDim : "transparent", color: t === activeSubTab ? T.green : T.textMid, border: "none", cursor: "pointer", transition: "all 0.2s" }}
  >
                      {t}
                    </button>)}
                </div>
              </div>

              {loading && jobs.length === 0 ? <div style={{ textAlign: "center", padding: "80px 0", color: T.textMid }}>Loading dashboard data...</div> : <>
                  {
    /* Stats Row */
  }
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
                    <StatCard icon={<Briefcase size={20} />} label="Active Jobs" value={String(activeJobsCount)} trend="+1 this week" color={T.purple} />
                    <StatCard icon={<Users size={20} />} label="Total Applicants" value={String(totalApplicantsCount)} trend="Across all posts" color={T.green} />
                    <StatCard icon={<BarChart3 size={20} />} label="Shortlisted" value={String(shortlistedCount)} trend="Awaiting interview" color={T.orange} />
                    <StatCard icon={<TrendingUp size={20} />} label="Job Views" value={totalViewsMock} trend="+12% vs last week" color={T.pink} />
                  </div>

                  {activeSubTab === "Active Jobs" ? (
                    // Active Jobs Grid
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                      {jobs.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "60px 24px", color: T.textDim, background: T.surface, borderRadius: 12, border: `1px solid ${T.border}`, gridColumn: "1 / -1" }}>
                          <span style={{ fontSize: "2.5rem" }}>💼</span>
                          <h3 style={{ fontSize: "1.1rem", color: T.text, marginTop: 12, marginBottom: 8, fontWeight: 600 }}>No Job Postings Yet</h3>
                          <p style={{ color: T.textMid, fontSize: "0.85rem", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
                            You haven't posted any jobs under this recruiter account yet. Create your first job listing to start receiving candidate applications and tracking pipeline analytics.
                          </p>
                          <Button variant="primary" onClick={() => setIsPostModalOpen(true)}>+ Post Your First Job</Button>
                        </div>
                      ) : (
                        jobs.map((job) => {
                          const initials = (job.company?.name || "Company").slice(0, 2).toUpperCase();
                          return <GlassCard key={job._id} style={{ padding: "20px 24px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                              <span style={{ fontSize: "1.1rem", fontWeight: 600, color: T.text }}>{job.title}</span>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.green }} />
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "0.75rem", color: T.textDim, marginBottom: 16 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{job.location}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Banknote size={12} />{formatSalaryDisplay(job.salary, job)}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} />Posted {getRelativeTime(job.createdAt)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                              <div style={{ fontSize: "0.8rem", color: T.textMid }}>
                                <span style={{ fontWeight: 600, color: T.text }}>{job.applications?.length || 0}</span> applicants
                              </div>
                              <span style={{ fontSize: "0.8rem", color: T.purpleL, fontWeight: 500 }}>{job.jobType || "Full-time"}</span>
                            </div>
                          </GlassCard>;
                        })
                      )}
                    </div>
                  ) : activeSubTab === "Applicants" ? (
                    <ApplicantsListView
                      jobs={jobs}
                      applicants={applicants}
                      selectedJobId={selectedJobId}
                      onSelectJobId={setSelectedJobId}
                      onUpdateStatus={handleUpdateStatus}
                      onViewResume={handleViewResume}
                      onDownloadResume={handleDownloadResume}
                      isDark={isDark}
                    />
                  ) : (
                    // Overview Dashboard
                    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                      {jobs.length === 0 && (
                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
                          <h3 style={{ fontSize: "1.1rem", color: T.text, margin: "0 0 8px", fontWeight: 600 }}>Your Hiring Funnel & Analytics</h3>
                          <p style={{ color: T.textMid, fontSize: "0.85rem", maxWidth: 500, margin: "0 auto 20px", lineHeight: 1.6 }}>
                            Post your first role to unlock automated applicant distribution charts, ATS candidate funnel pipelines, and candidate review workflows.
                          </p>
                          <Button variant="primary" onClick={() => setIsPostModalOpen(true)}>+ Create Job Posting</Button>
                        </div>
                      )}
                      
                      {
      /* Interactive Visual Charts Section */
    }
                      {jobs.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
                          {
      /* Applicants per Job Chart */
    }
                          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "24px" }}>
                            <h3 style={{ fontSize: "1rem", color: T.text, margin: "0 0 18px", fontWeight: 600 }}>Applicants by Posting</h3>
                            <div style={{ width: "100%", height: 200 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={jobChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <XAxis dataKey="name" stroke={T.textDim} fontSize={11} tickLine={false} />
                                  <YAxis stroke={T.textDim} fontSize={11} tickLine={false} allowDecimals={false} />
                                  <Tooltip
      contentStyle={{ background: isDark ? "#121020" : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: isDark ? "none" : "0 4px 14px rgba(0,0,0,0.1)" }}
      labelStyle={{ color: T.text, fontSize: 12, fontWeight: 600 }}
      itemStyle={{ color: T.purple, fontSize: 12 }}
    />
                                  <Bar dataKey="Applicants" fill={T.purple} radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {
      /* Status Distribution Pie Chart */
    }
                          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "24px", display: "flex", flexDirection: "column" }}>
                            <h3 style={{ fontSize: "1rem", color: T.text, margin: "0 0 14px", fontWeight: 600 }}>Funnel Distribution</h3>
                            {statusDistributionData.length === 0 ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textDim, fontSize: "0.85rem" }}>No data available</div> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: 14 }}>
                                <div style={{ width: 130, height: 130 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
      data={statusDistributionData}
      innerRadius={36}
      outerRadius={56}
      paddingAngle={4}
      dataKey="value"
    >
                                        {statusDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                      </Pie>
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  {statusDistributionData.map((entry, index) => <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: entry.color }} />
                                      <span style={{ fontSize: "0.78rem", color: T.textMid, fontWeight: 500 }}>{entry.name}: <span style={{ color: T.text }}>{entry.value}</span></span>
                                    </div>)}
                                </div>
                              </div>}
                          </div>
                        </div>}

                      {
      /* Visual Kanban Board Pipeline */
    }
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                          <h2 style={{ fontSize: "1.2rem", color: T.text, margin: 0, fontWeight: 600 }}>Hiring Funnel Pipeline</h2>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: "0.8rem", color: T.textDim }}>Filter by Job:</span>
                            <select
      value={selectedJobId}
      onChange={(e) => setSelectedJobId(e.target.value)}
      style={{
        background: isDark ? "#120a2a" : "#ffffff",
        border: `1px solid ${T.border}`,
        color: T.text,
        fontSize: "0.8rem",
        borderRadius: 8,
        padding: "6px 28px 6px 12px",
        fontFamily: T.font,
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
        backgroundPosition: "right 10px center",
        backgroundSize: "12px",
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239090b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: "no-repeat"
      }}
    >
                              <option value="All">All Postings</option>
                              {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
                            </select>
                          </div>
                        </div>

                        {
      /* Kanban Columns */
    }
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                          
                          {
      /* Column 1: Pending */
    }
                          <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, minHeight: 380, display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 10 }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: T.textMid, display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#facc15" }} /> Pending Review
                              </span>
                              <span style={{ fontSize: "0.72rem", background: "rgba(250,204,21,0.1)", color: "#facc15", padding: "3px 8px", borderRadius: 10, fontWeight: 700 }}>
                                {columns.pending.length}
                              </span>
                            </div>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
                              {columns.pending.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: T.textDim, fontSize: "0.8rem" }}>No candidates</div> : columns.pending.map((a) => {
      const cName = a.applicant?.fullname || "Candidate";
      const cInit = cName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
      return <div key={a._id} style={{ background: isDark ? T.surface : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.06)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", color: T.purpleL, fontSize: "0.75rem", fontWeight: 700 }}>{cInit}</div>
                                        <div>
                                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }}>{cName}</div>
                                          <div style={{ fontSize: "0.72rem", color: T.textDim }}>{a.jobTitle}</div>
                                        </div>
                                      </div>
                                      <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", padding: "4px 8px", borderRadius: 6, margin: "6px 0 10px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                                          <FileText size={12} color={T.purpleL} />
                                          {a.resume?.originalName || (a.applicant?.profile?.resumeOriginalName || "Resume.pdf")}
                                        </span>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                          <span onClick={() => handleViewResume(a._id)} style={{ color: T.purpleL, cursor: "pointer", fontWeight: 600 }}>View</span>
                                          <span onClick={() => handleDownloadResume(a._id, a.resume?.originalName)} style={{ color: T.textDim, cursor: "pointer" }}>⬇</span>
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                                        <button
        onClick={() => handleUpdateStatus(a._id, "accepted")}
        style={{ flex: 1, padding: "5px 0", background: T.greenDim, border: "none", borderRadius: 6, color: T.green, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
      >
                                          <Check size={12} /> Shortlist
                                        </button>
                                        <button
        onClick={() => handleUpdateStatus(a._id, "rejected")}
        style={{ flex: 1, padding: "5px 0", background: T.redDim, border: "none", borderRadius: 6, color: T.red, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
      >
                                          <X size={12} /> Reject
                                        </button>
                                      </div>
                                    </div>;
    })}
                            </div>
                          </div>

                          {
      /* Column 2: Shortlisted */
    }
                          <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, minHeight: 380, display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 10 }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: T.textMid, display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} /> Shortlisted
                              </span>
                              <span style={{ fontSize: "0.72rem", background: "rgba(74,222,128,0.1)", color: "#4ade80", padding: "3px 8px", borderRadius: 10, fontWeight: 700 }}>
                                {columns.accepted.length}
                              </span>
                            </div>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
                              {columns.accepted.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: T.textDim, fontSize: "0.8rem" }}>No candidates</div> : columns.accepted.map((a) => {
      const cName = a.applicant?.fullname || "Candidate";
      const cInit = cName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
      return <div key={a._id} style={{ background: isDark ? T.surface : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.06)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", color: T.purpleL, fontSize: "0.75rem", fontWeight: 700 }}>{cInit}</div>
                                        <div>
                                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }}>{cName}</div>
                                          <div style={{ fontSize: "0.72rem", color: T.textDim }}>{a.jobTitle}</div>
                                        </div>
                                      </div>
                                      <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", padding: "4px 8px", borderRadius: 6, margin: "6px 0 10px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                                          <FileText size={12} color={T.purpleL} />
                                          {a.resume?.originalName || (a.applicant?.profile?.resumeOriginalName || "Resume.pdf")}
                                        </span>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                          <span onClick={() => handleViewResume(a._id)} style={{ color: T.purpleL, cursor: "pointer", fontWeight: 600 }}>View</span>
                                          <span onClick={() => handleDownloadResume(a._id, a.resume?.originalName)} style={{ color: T.textDim, cursor: "pointer" }}>⬇</span>
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                                        <button
        onClick={() => handleUpdateStatus(a._id, "pending")}
        style={{ flex: 1, padding: "5px 0", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", border: `1px solid ${T.border}`, borderRadius: 6, color: T.textMid, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
      >
                                          Reset Pending
                                        </button>
                                        <button
        onClick={() => handleUpdateStatus(a._id, "rejected")}
        style={{ padding: "5px 8px", background: T.redDim, border: "none", borderRadius: 6, color: T.red, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    </div>;
    })}
                            </div>
                          </div>

                          {
      /* Column 3: Rejected */
    }
                          <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "#f8fafc", border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, minHeight: 380, display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 10 }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: T.textMid, display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} /> Rejected
                              </span>
                              <span style={{ fontSize: "0.72rem", background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "3px 8px", borderRadius: 10, fontWeight: 700 }}>
                                {columns.rejected.length}
                              </span>
                            </div>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, overflowY: "auto" }}>
                              {columns.rejected.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: T.textDim, fontSize: "0.8rem" }}>No candidates</div> : columns.rejected.map((a) => {
      const cName = a.applicant?.fullname || "Candidate";
      const cInit = cName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
      return <div key={a._id} style={{ background: isDark ? T.surface : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.06)" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", color: T.purpleL, fontSize: "0.75rem", fontWeight: 700 }}>{cInit}</div>
                                        <div>
                                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }}>{cName}</div>
                                          <div style={{ fontSize: "0.72rem", color: T.textDim }}>{a.jobTitle}</div>
                                        </div>
                                      </div>
                                      <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", padding: "4px 8px", borderRadius: 6, margin: "6px 0 10px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                                          <FileText size={12} color={T.purpleL} />
                                          {a.resume?.originalName || (a.applicant?.profile?.resumeOriginalName || "Resume.pdf")}
                                        </span>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                          <span onClick={() => handleViewResume(a._id)} style={{ color: T.purpleL, cursor: "pointer", fontWeight: 600 }}>View</span>
                                          <span onClick={() => handleDownloadResume(a._id, a.resume?.originalName)} style={{ color: T.textDim, cursor: "pointer" }}>⬇</span>
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                                        <button
        onClick={() => handleUpdateStatus(a._id, "accepted")}
        style={{ flex: 1, padding: "5px 0", background: T.greenDim, border: "none", borderRadius: 6, color: T.green, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
      >
                                          <Check size={12} /> Shortlist
                                        </button>
                                        <button
        onClick={() => handleUpdateStatus(a._id, "pending")}
        style={{ flex: 1, padding: "5px 0", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", border: `1px solid ${T.border}`, borderRadius: 6, color: T.textMid, cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
      >
                                          Reset Pending
                                        </button>
                                      </div>
                                    </div>;
    })}
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
  )}
                </>}
            </main>}
        </motion.div>
      </AnimatePresence>

      {
    /* Post Job Modal */
  }
      <AnimatePresence>
        {isPostModalOpen && <div style={{ position: "fixed", inset: 0, zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "rgba(9, 9, 15, 0.75)" : "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(10px)" }}>
            <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 16 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 16 }}
    transition={{ duration: 0.25 }}
    style={{ background: isDark ? "rgba(12, 10, 24, 0.94)" : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 20, width: "100%", maxWidth: 540, padding: 32, boxSizing: "border-box", boxShadow: isDark ? "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)" : "0 24px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}
  >
              {
    /* Modal header */
  }
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ fontSize: "1.4rem", fontFamily: T.serif, color: T.text, margin: 0 }}>Create Job Posting</h3>
                <button
    onClick={() => setIsPostModalOpen(false)}
    style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer", display: "flex", padding: 4 }}
  >
                  <X size={20} />
                </button>
              </div>

              {postError && <div style={{ color: T.red, background: T.redDim, border: `1px solid ${T.red}40`, padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={16} />
                  {postError}
                </div>}

              <form onSubmit={handlePostJob} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Job Title</label>
                  <Input placeholder="Senior React Developer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Job/Company Logo (Optional)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <label style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: T.textMid,
    fontSize: "0.85rem",
    cursor: "pointer",
    fontFamily: T.font
  }}>
                      <UploadCloud size={16} /> Choose Logo
                      <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) {
        setJobLogoName(file.name);
        const reader = new FileReader();
        reader.onloadend = () => {
          setJobLogo(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }}
    style={{ display: "none" }}
  />
                    </label>
                    {jobLogoName && <span style={{ fontSize: "0.8rem", color: T.textMid }}>{jobLogoName}</span>}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Job Description</label>
                  <textarea
    placeholder="Describe the responsibilities, project stack, and everyday expectations..."
    value={jobDesc}
    onChange={(e) => setJobDesc(e.target.value)}
    required
    style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 14px", color: T.text, fontSize: "0.9rem", outline: "none", fontFamily: T.font, minHeight: 100, boxSizing: "border-box" }}
  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Requirements (comma separated)</label>
                  <Input placeholder="React, TypeScript, Redux, Next.js" value={jobReqs} onChange={(e) => setJobReqs(e.target.value)} required />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Salary (INR / year)</label>
                    <Input type="number" placeholder="1200000" value={jobSalary} onChange={(e) => setJobSalary(e.target.value)} required />
                    {jobSalary && Number(jobSalary) > 0 && (
                      <div style={{ fontSize: "0.75rem", color: T.purpleL, marginTop: 4 }}>
                        Display: {formatSalaryDisplay(Number(jobSalary))} / yr
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Location</label>
                    <Input placeholder="Remote or City, State" value={jobLoc} onChange={(e) => setJobLoc(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Job Type</label>
                    <select
    value={jobType}
    onChange={(e) => setJobType(e.target.value)}
    style={{
      width: "100%",
      background: `${isDark ? "#120a2a" : "#ffffff"} url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239090b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e") no-repeat right 14px center/16px`,
      appearance: "none",
      WebkitAppearance: "none",
      MozAppearance: "none",
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      padding: "11px 36px 11px 14px",
      color: T.text,
      fontSize: "0.9rem",
      outline: "none",
      fontFamily: T.font,
      cursor: "pointer",
      boxSizing: "border-box"
    }}
  >
                      <option value="Full-time" style={{ background: isDark ? "#120a2a" : "#ffffff", color: T.text }}>Full-time</option>
                      <option value="Hybrid" style={{ background: isDark ? "#120a2a" : "#ffffff", color: T.text }}>Hybrid</option>
                      <option value="Part-time" style={{ background: isDark ? "#120a2a" : "#ffffff", color: T.text }}>Part-time</option>
                      <option value="Contract" style={{ background: isDark ? "#120a2a" : "#ffffff", color: T.text }}>Contract</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Experience Level(In yr)</label>
                    <Input type="number" min="0" placeholder="Years" value={jobExp} onChange={(e) => setJobExp(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", color: T.textMid, marginBottom: 6, fontWeight: 500 }}>Positions Available</label>
                    <Input type="number" min="1" placeholder="1" value={jobPos} onChange={(e) => setJobPos(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <Button
    type="submit"
    variant="primary"
    style={{ flex: 1, justifyContent: "center" }}
    disabled={postLoading}
  >
                    {postLoading ? "Posting..." : "Publish Job"}
                  </Button>
                  <Button
    type="button"
    variant="ghost"
    onClick={() => {
      setIsPostModalOpen(false);
      setJobLogo(null);
      setJobLogoName("");
    }}
    disabled={postLoading}
  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>}
      </AnimatePresence>
    </div>;
}
