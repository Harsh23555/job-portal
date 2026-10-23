"use strict";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Search,
  Eye,
  UserCheck,
  UserX,
  RotateCcw,
  Briefcase,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  ExternalLink,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
  FileText,
  Calendar,
  X,
} from "lucide-react";
import API from "./services/api";
import { useTheme, ThemeToggle, T } from "./context/ThemeContext";

/* ─── Status Badge ───────────────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const map = {
    pending: { bg: "rgba(251,191,36,0.12)", color: "#f59e0b", border: "rgba(251,191,36,0.3)", icon: <Clock size={12} />, label: "Pending" },
    approved: { bg: "rgba(74,222,128,0.12)", color: "#16a34a", border: "rgba(74,222,128,0.3)", icon: <CheckCircle2 size={12} />, label: "Approved" },
    rejected: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.3)", icon: <XCircle size={12} />, label: "Rejected" },
    suspended: { bg: "rgba(249,115,22,0.12)", color: "#ea580c", border: "rgba(249,115,22,0.3)", icon: <Ban size={12} />, label: "Suspended" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: "0.72rem", fontWeight: 600, fontFamily: T.font }}>
      {s.icon} {s.label}
    </span>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, color, onClick, active }) {
  const { isDark } = useTheme();
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      style={{
        background: active ? (isDark ? "rgba(124,106,247,0.12)" : "rgba(109,90,230,0.06)") : (isDark ? T.surface : "#fff"),
        border: `1.5px solid ${active ? T.purple + "55" : T.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: T.font,
        transition: "all 0.2s",
        boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.04)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: T.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: T.textMid, marginTop: 4 }}>{label}</div>
    </motion.button>
  );
}

/* ─── Confirmation Modal ─────────────────────────────────────────────────── */

function ConfirmModal({ open, title, message, confirmLabel, confirmColor, onConfirm, onCancel, showReason, reasonLabel }) {
  const { isDark } = useTheme();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: T.modalBackdrop }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: isDark ? "#141220" : "#fff",
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: "28px 24px",
          maxWidth: 440,
          width: "90%",
          boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: T.text, fontFamily: T.font }}>{title}</h3>
        <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: T.textMid, lineHeight: 1.5 }}>{message}</p>
        {showReason && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 500, color: T.textMid, fontFamily: T.font, display: "block", marginBottom: 5 }}>
              {reasonLabel || "Reason"} <span style={{ color: T.textDim }}>(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide a reason..."
              style={{
                width: "100%",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: T.text,
                fontSize: "0.85rem",
                fontFamily: T.font,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ padding: "9px 18px", borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.textMid, cursor: "pointer", fontSize: "0.82rem", fontFamily: T.font }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setLoading(true);
              await onConfirm(reason);
              setLoading(false);
              setReason("");
            }}
            disabled={loading}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              background: confirmColor || T.purple,
              color: "#fff",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
              fontFamily: T.font,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {loading ? <Loader2 size={13} /> : null} {confirmLabel || "Confirm"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── HR Detail Panel ────────────────────────────────────────────────────── */

function HRDetailPanel({ hr, onClose, onAction }) {
  const { isDark } = useTheme();
  if (!hr) return null;

  const InfoRow = ({ icon, label, value }) => value ? (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.84rem" }}>
      <span style={{ color: T.textDim, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <div style={{ color: T.textDim, fontSize: "0.72rem", marginBottom: 2 }}>{label}</div>
        <div style={{ color: T.text, wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      style={{
        background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "24px 22px",
        maxHeight: "80vh",
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem", color: T.text, fontFamily: T.font }}>HR Details</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textDim, cursor: "pointer" }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "14px 16px", borderRadius: 12, background: T.surface }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #7c6af7, #a090ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "1rem" }}>
          {hr.fullname?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: "1rem", color: T.text }}>{hr.fullname}</div>
          <div style={{ fontSize: "0.78rem", color: T.textMid }}>{hr.designation || "HR Professional"}</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <StatusBadge status={hr.verificationStatus} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <InfoRow icon={<Mail size={14} />} label="Email" value={hr.email} />
        <InfoRow icon={<Phone size={14} />} label="Phone" value={hr.phoneNumber} />
        <InfoRow icon={<Building2 size={14} />} label="Company" value={hr.companyDetails?.companyName} />
        <InfoRow icon={<Globe size={14} />} label="Website" value={hr.companyDetails?.companyWebsite} />
        <InfoRow icon={<Mail size={14} />} label="Company Email" value={hr.companyDetails?.companyEmail} />
        <InfoRow icon={<Briefcase size={14} />} label="Industry" value={hr.companyDetails?.companyIndustry} />
        <InfoRow icon={<Users size={14} />} label="Company Size" value={hr.companyDetails?.companySize} />
        <InfoRow icon={<MapPin size={14} />} label="Address" value={[hr.companyDetails?.companyAddress, hr.companyDetails?.companyCityState, hr.companyDetails?.companyCountry].filter(Boolean).join(", ")} />
        <InfoRow icon={<FileText size={14} />} label="Registration Info" value={hr.companyDetails?.companyRegistrationInfo} />
        <InfoRow icon={<ExternalLink size={14} />} label="LinkedIn" value={hr.linkedinUrl} />
        <InfoRow icon={<FileText size={14} />} label="Access Reason" value={hr.hrAccessReason} />
        <InfoRow icon={<Calendar size={14} />} label="Registered" value={hr.createdAt ? new Date(hr.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""} />
        {hr.verificationReviewedAt && (
          <InfoRow icon={<Calendar size={14} />} label="Last Reviewed" value={new Date(hr.verificationReviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
        )}
        {hr.rejectionReason && (
          <InfoRow icon={<AlertCircle size={14} />} label="Rejection Reason" value={hr.rejectionReason} />
        )}
        {hr.suspensionReason && (
          <InfoRow icon={<AlertCircle size={14} />} label="Suspension Reason" value={hr.suspensionReason} />
        )}
        {hr.jobCount !== undefined && (
          <InfoRow icon={<Briefcase size={14} />} label="Jobs Posted" value={String(hr.jobCount)} />
        )}
      </div>

      {/* Action Buttons */}
      {(() => {
        const status = hr.verificationStatus || "pending";
        return (
          <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
            {status === "pending" && (
              <>
                <button onClick={() => onAction("approve", hr)} style={{ padding: "8px 16px", borderRadius: 8, background: "#16a34a", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: T.font, display: "flex", alignItems: "center", gap: 5 }}>
                  <UserCheck size={13} /> Approve
                </button>
                <button onClick={() => onAction("reject", hr)} style={{ padding: "8px 16px", borderRadius: 8, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: T.font, display: "flex", alignItems: "center", gap: 5 }}>
                  <UserX size={13} /> Reject
                </button>
              </>
            )}
            {status === "approved" && (
              <button onClick={() => onAction("suspend", hr)} style={{ padding: "8px 16px", borderRadius: 8, background: "#ea580c", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: T.font, display: "flex", alignItems: "center", gap: 5 }}>
                <Ban size={13} /> Suspend
              </button>
            )}
            {(status === "suspended" || status === "rejected") && (
              <button onClick={() => onAction("reactivate", hr)} style={{ padding: "8px 16px", borderRadius: 8, background: "#7c6af7", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: T.font, display: "flex", alignItems: "center", gap: 5 }}>
                <RotateCcw size={13} /> Reactivate
              </button>
            )}
          </div>
        );
      })()}
    </motion.div>
  );
}

/* ─── Main Admin Dashboard ───────────────────────────────────────────────── */

export function JobPortalAdminDashboard({ admin, onSignOut }) {
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [hrList, setHrList] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedHR, setSelectedHR] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionError, setActionError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get("/admin/stats");
      if (res.data?.success) setStats(res.data.stats);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  const fetchHRList = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await API.get(`/admin/hr?${params.toString()}`);
      if (res.data?.success) {
        setHrList(res.data.hrList);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to load HR list:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchStats();
    fetchHRList(1);
  }, [fetchStats, fetchHRList]);

  const handleAction = (action, hr) => {
    setConfirmAction({ action, hr });
    setActionError("");
  };

  const executeAction = async (reason) => {
    if (!confirmAction) return;
    const { action, hr } = confirmAction;

    try {
      const res = await API.patch(`/admin/hr/${hr._id}/${action}`, { reason });
      if (res.data?.success) {
        setConfirmAction(null);
        setSelectedHR(null);
        fetchStats();
        fetchHRList(pagination.page);
      } else {
        setActionError(res.data?.message || "Action failed.");
      }
    } catch (err) {
      setActionError(err.response?.data?.message || "Action failed.");
    }
  };

  const viewDetails = async (hr) => {
    try {
      const res = await API.get(`/admin/hr/${hr._id}`);
      if (res.data?.success) {
        setSelectedHR(res.data.hr);
      }
    } catch (err) {
      console.error("Failed to load HR details:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await API.post("/admin/logout");
    } catch (err) {
      // ignore
    }
    onSignOut();
  };

  const FILTERS = [
    { key: "", label: "All", icon: <Users size={13} /> },
    { key: "pending", label: "Pending", icon: <Clock size={13} /> },
    { key: "approved", label: "Approved", icon: <CheckCircle2 size={13} /> },
    { key: "rejected", label: "Rejected", icon: <XCircle size={13} /> },
    { key: "suspended", label: "Suspended", icon: <Ban size={13} /> },
  ];

  const actionConfigs = {
    approve: { title: "Approve HR Account", message: "This will allow the HR user to create and manage job postings. Are you sure?", confirmLabel: "Approve", confirmColor: "#16a34a", showReason: false },
    reject: { title: "Reject HR Registration", message: "This will deny the HR user access to recruiter features. Please provide a reason if possible.", confirmLabel: "Reject", confirmColor: "#ef4444", showReason: true, reasonLabel: "Rejection Reason" },
    suspend: { title: "Suspend HR Account", message: "This will temporarily revoke the HR user's recruiter privileges and hide their job postings.", confirmLabel: "Suspend", confirmColor: "#ea580c", showReason: true, reasonLabel: "Suspension Reason" },
    reactivate: { title: "Reactivate HR Account", message: "This will restore the HR user's recruiter privileges.", confirmLabel: "Reactivate", confirmColor: "#7c6af7", showReason: false },
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      {/* Navbar */}
      <nav style={{ borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100, background: T.bg }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 24 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #ef4444, #7c6af7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={14} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: T.serif, fontSize: "1.1rem", color: T.text }}>Admin Dashboard</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ThemeToggle size="sm" />
            <span style={{ fontSize: "0.8rem", color: T.textMid }}>{admin?.email}</span>
            <button
              onClick={handleLogout}
              style={{ padding: "6px 14px", borderRadius: 8, background: T.surface, border: `1px solid ${T.border}`, color: T.textMid, cursor: "pointer", fontSize: "0.8rem", fontFamily: T.font, display: "flex", alignItems: "center", gap: 6 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = T.red)}
              onMouseLeave={(e) => (e.currentTarget.style.color = T.textMid)}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 24px 48px" }}>
        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard icon={<Users size={18} color="#7c6af7" />} label="Total HR" value={stats?.totalHR ?? "—"} color="#7c6af7" onClick={() => { setStatusFilter(""); fetchHRList(1); }} active={statusFilter === ""} />
          <StatCard icon={<Clock size={18} color="#f59e0b" />} label="Pending" value={stats?.pendingHR ?? "—"} color="#f59e0b" onClick={() => { setStatusFilter("pending"); fetchHRList(1); }} active={statusFilter === "pending"} />
          <StatCard icon={<CheckCircle2 size={18} color="#16a34a" />} label="Approved" value={stats?.approvedHR ?? "—"} color="#16a34a" onClick={() => { setStatusFilter("approved"); fetchHRList(1); }} active={statusFilter === "approved"} />
          <StatCard icon={<XCircle size={18} color="#ef4444" />} label="Rejected" value={stats?.rejectedHR ?? "—"} color="#ef4444" onClick={() => { setStatusFilter("rejected"); fetchHRList(1); }} active={statusFilter === "rejected"} />
          <StatCard icon={<Ban size={18} color="#ea580c" />} label="Suspended" value={stats?.suspendedHR ?? "—"} color="#ea580c" onClick={() => { setStatusFilter("suspended"); fetchHRList(1); }} active={statusFilter === "suspended"} />
          <StatCard icon={<Briefcase size={18} color="#06b6d4" />} label="Total Jobs" value={stats?.totalJobs ?? "—"} color="#06b6d4" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selectedHR ? "1fr 380px" : "1fr", gap: 20 }}>
          {/* HR Table */}
          <div>
            {/* Search & Filter */}
            <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 280px" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textDim }}><Search size={15} /></span>
                <input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchHRList(1)}
                  style={{
                    width: "100%",
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "10px 14px 10px 38px",
                    color: T.text,
                    fontSize: "0.85rem",
                    fontFamily: T.font,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => { setStatusFilter(f.key); fetchHRList(1); }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: statusFilter === f.key ? T.purpleDim : T.surface,
                      border: `1px solid ${statusFilter === f.key ? T.purple + "44" : T.border}`,
                      color: statusFilter === f.key ? T.purple : T.textMid,
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontFamily: T.font,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: statusFilter === f.key ? 600 : 400,
                      transition: "all 0.15s",
                    }}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{
              background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              overflow: "hidden",
            }}>
              {loading ? (
                <div style={{ padding: 60, textAlign: "center", color: T.textDim }}>
                  <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
                  <div style={{ marginTop: 10, fontSize: "0.85rem" }}>Loading HR registrations...</div>
                </div>
              ) : hrList.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: T.textDim, fontSize: "0.88rem" }}>
                  No HR registrations found for the selected filter.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc" }}>
                        {["Name", "Email", "Phone", "Designation", "Company", "Registered", "Status", "Actions"].map((h) => (
                          <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: T.textDim, fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hrList.map((hr) => (
                        <tr key={hr._id} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.15s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "#f9fafb")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "12px 14px", color: T.text, fontWeight: 500 }}>{hr.fullname}</td>
                          <td style={{ padding: "12px 14px", color: T.textMid, fontSize: "0.78rem" }}>{hr.email}</td>
                          <td style={{ padding: "12px 14px", color: T.textMid, fontSize: "0.78rem" }}>{hr.phoneNumber}</td>
                          <td style={{ padding: "12px 14px", color: T.textMid, fontSize: "0.78rem" }}>{hr.designation || "—"}</td>
                          <td style={{ padding: "12px 14px", color: T.textMid, fontSize: "0.78rem" }}>{hr.companyDetails?.companyName || "—"}</td>
                          <td style={{ padding: "12px 14px", color: T.textDim, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                            {hr.createdAt ? new Date(hr.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                          </td>
                          <td style={{ padding: "12px 14px" }}><StatusBadge status={hr.verificationStatus} /></td>
                          <td style={{ padding: "12px 14px" }}>
                            {(() => {
                              const status = hr.verificationStatus || "pending";
                              return (
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <button onClick={() => viewDetails(hr)} title="View Details" style={{ padding: "5px 8px", borderRadius: 6, background: T.purpleDim, border: "none", color: T.purple, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.74rem" }}>
                                    <Eye size={13} />
                                  </button>
                                  {status === "pending" && (
                                    <>
                                      <button onClick={() => handleAction("approve", hr)} title="Approve HR" style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.35)", color: "#16a34a", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.74rem", fontWeight: 600 }}>
                                        <UserCheck size={13} /> Approve
                                      </button>
                                      <button onClick={() => handleAction("reject", hr)} title="Reject HR" style={{ padding: "5px 10px", borderRadius: 6, background: T.redDim, border: `1px solid ${T.red}33`, color: T.red, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.74rem", fontWeight: 600 }}>
                                        <UserX size={13} /> Reject
                                      </button>
                                    </>
                                  )}
                                  {status === "approved" && (
                                    <button onClick={() => handleAction("suspend", hr)} title="Suspend HR" style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.35)", color: "#ea580c", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.74rem", fontWeight: 600 }}>
                                      <Ban size={13} /> Suspend
                                    </button>
                                  )}
                                  {(status === "suspended" || status === "rejected") && (
                                    <button onClick={() => handleAction("reactivate", hr)} title="Reactivate HR" style={{ padding: "5px 10px", borderRadius: 6, background: T.purpleDim, border: `1px solid ${T.purple}33`, color: T.purple, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.74rem", fontWeight: 600 }}>
                                      <RotateCcw size={13} /> Reactivate
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
                  <button
                    onClick={() => fetchHRList(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    style={{ padding: "6px 10px", borderRadius: 6, background: T.surface, border: `1px solid ${T.border}`, color: pagination.page <= 1 ? T.textDim : T.text, cursor: pagination.page <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: "0.8rem", color: T.textMid }}>
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </span>
                  <button
                    onClick={() => fetchHRList(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    style={{ padding: "6px 10px", borderRadius: 6, background: T.surface, border: `1px solid ${T.border}`, color: pagination.page >= pagination.totalPages ? T.textDim : T.text, cursor: pagination.page >= pagination.totalPages ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <AnimatePresence>
            {selectedHR && (
              <HRDetailPanel hr={selectedHR} onClose={() => setSelectedHR(null)} onAction={handleAction} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmModal
          open={true}
          {...(actionConfigs[confirmAction.action] || {})}
          onConfirm={executeAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Spinner animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
