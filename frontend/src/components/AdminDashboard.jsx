/**
 * AdminDashboard.jsx
 * Source health panel + ingestion run log viewer.
 * Accessible to users with role === "recruiter" (admin-equivalent).
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Globe,
  Database,
  Zap,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function formatDuration(ms) {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── Source Status Badge ──────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const configs = {
    active: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: CheckCircle, label: "Active" },
    unconfigured: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: AlertCircle, label: "Unconfigured" },
    unavailable: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: XCircle, label: "Unavailable" },
    disabled: { color: "#6b7280", bg: "rgba(107,114,128,0.12)", icon: XCircle, label: "Disabled" },
  };
  const cfg = configs[status] || configs.unconfigured;
  const Icon = cfg.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: "0.72rem",
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.color}33`,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      <Icon size={11} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ─── Run Status Badge ─────────────────────────────────────────────────────────

function RunBadge({ status }) {
  const configs = {
    completed: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "Completed" },
    running: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", label: "Running" },
    failed: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "Failed" },
  };
  const cfg = configs[status] || configs.running;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: "0.7rem",
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Source Card ──────────────────────────────────────────────────────────────

function SourceCard({ source, onSync, syncing }) {
  const { isDark } = useTheme();
  const [showTerms, setShowTerms] = useState(false);

  const providerIcons = {
    adzuna: "🔍",
    jooble: "🌐",
    remotive: "🏠",
    linkedin: "🔗",
    internal: "💼",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>
            {providerIcons[source.name] || "📡"}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: isDark ? "#e8e4ff" : "#1f1b3a" }}>
              {source.displayName || source.name}
            </div>
            <div style={{ fontSize: "0.72rem", color: isDark ? "#8b8499" : "#6b7280", textTransform: "capitalize" }}>
              {source.name}
            </div>
          </div>
        </div>
        <StatusBadge status={source.status} />
      </div>

      {/* Reason */}
      {source.reason && (
        <div
          style={{
            fontSize: "0.78rem",
            color: isDark ? "#9ca3af" : "#6b7280",
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
            borderRadius: 8,
            padding: "8px 12px",
            lineHeight: 1.5,
          }}
        >
          {source.reason}
        </div>
      )}

      {/* Terms Note Toggle */}
      {source.termsNote && (
        <div>
          <button
            onClick={() => setShowTerms((v) => !v)}
            style={{
              background: "none",
              border: "none",
              color: isDark ? "#7c6af7" : "#6d5ae6",
              fontSize: "0.75rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            <Info size={12} />
            {showTerms ? "Hide" : "Show"} Terms Note
          </button>
          <AnimatePresence>
            {showTerms && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  fontSize: "0.73rem",
                  color: isDark ? "#9ca3af" : "#6b7280",
                  marginTop: 8,
                  lineHeight: 1.55,
                  padding: "8px 12px",
                  background: isDark ? "rgba(124,106,247,0.06)" : "rgba(109,90,230,0.06)",
                  borderLeft: `3px solid ${isDark ? "#7c6af7" : "#6d5ae6"}`,
                  borderRadius: "0 8px 8px 0",
                }}
              >
                {source.termsNote}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sync Button */}
      {source.status !== "unavailable" && (
        <button
          onClick={() => onSync(source.name)}
          disabled={syncing}
          style={{
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            background: isDark ? "rgba(124,106,247,0.15)" : "rgba(109,90,230,0.1)",
            border: `1px solid ${isDark ? "rgba(124,106,247,0.35)" : "rgba(109,90,230,0.25)"}`,
            borderRadius: 9,
            color: isDark ? "#a89df7" : "#6d5ae6",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: syncing ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: syncing ? 0.6 : 1,
            transition: "all 0.18s",
          }}
        >
          <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
          {syncing ? "Syncing…" : "Force Sync"}
        </button>
      )}
    </motion.div>
  );
}

// ─── Ingestion Run Row ────────────────────────────────────────────────────────

function RunRow({ run }) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      }}
    >
      {/* Summary Row */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 90px 70px 70px 70px 80px 90px",
          gap: 12,
          padding: "12px 16px",
          alignItems: "center",
          cursor: "pointer",
          transition: "background 0.15s",
          borderRadius: expanded ? "10px 10px 0 0" : 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: isDark ? "#e8e4ff" : "#1f1b3a" }}>
            {formatDate(run.startedAt)}
          </span>
          <span style={{ fontSize: "0.7rem", color: isDark ? "#8b8499" : "#9ca3af" }}>
            {timeAgo(run.startedAt)} · {run.triggeredBy || "scheduler"}
          </span>
        </div>
        <div><RunBadge status={run.status} /></div>
        <div style={{ fontSize: "0.82rem", color: "#22c55e", textAlign: "center", fontWeight: 600 }}>{run.totalInserted ?? "—"}</div>
        <div style={{ fontSize: "0.82rem", color: "#3b82f6", textAlign: "center", fontWeight: 600 }}>{run.totalUpdated ?? "—"}</div>
        <div style={{ fontSize: "0.82rem", color: "#ef4444", textAlign: "center", fontWeight: 600 }}>{run.totalErrors ?? "—"}</div>
        <div style={{ fontSize: "0.8rem", color: isDark ? "#8b8499" : "#9ca3af", textAlign: "center" }}>
          {formatDuration(run.durationMs)}
        </div>
        <div style={{ fontSize: "0.72rem", color: isDark ? "#8b8499" : "#9ca3af", textAlign: "right" }}>
          {run.providers?.length || 0} provider{run.providers?.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Expanded Provider Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "0 16px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {run.fatalError && (
                <div
                  style={{
                    padding: "8px 12px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    color: "#ef4444",
                  }}
                >
                  ⚠ Fatal Error: {run.fatalError}
                </div>
              )}

              {/* Keywords */}
              {run.keywords?.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {run.keywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: "0.7rem",
                        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                        color: isDark ? "#b0aac8" : "#6b7280",
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Per-provider breakdown */}
              {run.providers?.map((prov) => (
                <div
                  key={prov.provider}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 60px 60px 60px 60px 1fr",
                    gap: 10,
                    padding: "8px 12px",
                    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    borderRadius: 8,
                    alignItems: "center",
                    fontSize: "0.78rem",
                  }}
                >
                  <span style={{ fontWeight: 600, color: isDark ? "#c4bfe8" : "#4b4775", textTransform: "capitalize" }}>
                    {prov.provider}
                  </span>
                  <span style={{ color: "#22c55e" }}>+{prov.inserted}</span>
                  <span style={{ color: "#3b82f6" }}>~{prov.updated}</span>
                  <span style={{ color: "#ef4444" }}>✕{prov.errors}</span>
                  <span style={{ color: isDark ? "#8b8499" : "#9ca3af" }}>{formatDuration(prov.durationMs)}</span>
                  {prov.errorDetails?.length > 0 && (
                    <span style={{ color: "#ef4444", fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {prov.errorDetails[0]?.message}
                    </span>
                  )}
                  {!prov.errorDetails?.length && <span />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main AdminDashboard Component ────────────────────────────────────────────

export default function AdminDashboard() {
  const { isDark } = useTheme();

  const [sources, setSources] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState("");

  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [syncingProvider, setSyncingProvider] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");

  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const borderClr = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
  const headingClr = isDark ? "#e8e4ff" : "#1f1b3a";
  const mutedClr = isDark ? "#8b8499" : "#9ca3af";

  // Fetch sources
  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    setSourcesError("");
    try {
      const res = await API.get("/v1/admin/job-sources");
      if (res.data?.success) {
        setSources(res.data.sources || []);
      } else {
        setSourcesError(res.data?.message || "Failed to load source status.");
      }
    } catch (err) {
      setSourcesError(err.response?.data?.message || "Failed to load source status. Make sure you have recruiter permissions.");
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  // Fetch ingestion runs
  const fetchRuns = useCallback(async (pageNum = 1) => {
    setRunsLoading(true);
    setRunsError("");
    try {
      const res = await API.get(`/v1/admin/ingestion-runs?page=${pageNum}&limit=10`);
      if (res.data?.success) {
        setRuns(res.data.runs || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      } else {
        setRunsError(res.data?.message || "Failed to load ingestion runs.");
      }
    } catch (err) {
      setRunsError(err.response?.data?.message || "Failed to load ingestion runs.");
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
    fetchRuns(1);
  }, [fetchSources, fetchRuns]);

  // Trigger sync
  const handleSync = async (providerName) => {
    setSyncingProvider(providerName);
    setSyncMessage("");
    try {
      const res = await API.post(`/v1/admin/job-sources/${providerName}/sync`, { force: true });
      setSyncMessage(res.data?.message || `Sync triggered for ${providerName}.`);
      setTimeout(() => {
        fetchRuns(1);
        setSyncMessage("");
      }, 3000);
    } catch (err) {
      setSyncMessage(err.response?.data?.message || "Failed to trigger sync.");
    } finally {
      setSyncingProvider(null);
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
        padding: "32px 24px",
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      {/* ── Page Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #7c6af7, #4ade80)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(124,106,247,0.3)",
            }}
          >
            <Database size={18} color="white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: headingClr, margin: 0, letterSpacing: "-0.02em" }}>
            Admin Dashboard
          </h1>
        </div>
        <p style={{ color: mutedClr, fontSize: "0.88rem", margin: 0 }}>
          Monitor job source health, trigger manual syncs, and review ingestion history.
        </p>
      </div>

      {/* ── Sync Feedback Toast ── */}
      <AnimatePresence>
        {syncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              marginBottom: 20,
              padding: "12px 16px",
              borderRadius: 10,
              background: syncMessage.includes("Failed") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
              border: `1px solid ${syncMessage.includes("Failed") ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
              color: syncMessage.includes("Failed") ? "#ef4444" : "#22c55e",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {syncMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          Section 1: Job Source Health
      ══════════════════════════════════════════════ */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderClr}`,
          borderRadius: 16,
          padding: "24px",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Activity size={18} color={isDark ? "#a89df7" : "#6d5ae6"} />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: headingClr, margin: 0 }}>
              Job Source Status
            </h2>
          </div>
          <button
            onClick={fetchSources}
            disabled={sourcesLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "none",
              border: `1px solid ${borderClr}`,
              borderRadius: 9,
              color: mutedClr,
              fontSize: "0.78rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <RefreshCw size={13} style={{ animation: sourcesLoading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>

        {sourcesError && (
          <div style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 16 }}>
            {sourcesError}
          </div>
        )}

        {sourcesLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 130, borderRadius: 14, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {sources.map((source) => (
              <SourceCard
                key={source.name}
                source={source}
                onSync={handleSync}
                syncing={syncingProvider === source.name}
              />
            ))}
            {sources.length === 0 && (
              <div style={{ color: mutedClr, fontSize: "0.85rem", padding: "24px 0" }}>No source data available.</div>
            )}
          </div>
        )}

        {/* Summary strip */}
        {!sourcesLoading && sources.length > 0 && (
          <div style={{ display: "flex", gap: 20, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${borderClr}`, flexWrap: "wrap" }}>
            {[
              { label: "Active", color: "#22c55e", count: sources.filter((s) => s.status === "active").length },
              { label: "Unconfigured", color: "#f59e0b", count: sources.filter((s) => s.status === "unconfigured").length },
              { label: "Unavailable", color: "#ef4444", count: sources.filter((s) => s.status === "unavailable").length },
            ].map(({ label, color, count }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                <span style={{ color: mutedClr }}>{count} {label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          Section 2: Ingestion Run History
      ══════════════════════════════════════════════ */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderClr}`,
          borderRadius: 16,
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={18} color={isDark ? "#a89df7" : "#6d5ae6"} />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: headingClr, margin: 0 }}>
              Ingestion Run History
            </h2>
            {total > 0 && (
              <span style={{ fontSize: "0.72rem", color: mutedClr, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: 10 }}>
                {total} total
              </span>
            )}
          </div>
          <button
            onClick={() => fetchRuns(page)}
            disabled={runsLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "none",
              border: `1px solid ${borderClr}`,
              borderRadius: 9,
              color: mutedClr,
              fontSize: "0.78rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <RefreshCw size={13} style={{ animation: runsLoading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>

        {runsError && (
          <div style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", marginBottom: 16 }}>
            {runsError}
          </div>
        )}

        {/* Column Headers */}
        {!runsLoading && runs.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 70px 70px 70px 80px 90px",
              gap: 12,
              padding: "6px 16px",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: mutedClr,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderBottom: `1px solid ${borderClr}`,
              marginBottom: 4,
            }}
          >
            <span>Started At</span>
            <span>Status</span>
            <span style={{ textAlign: "center" }}>Inserted</span>
            <span style={{ textAlign: "center" }}>Updated</span>
            <span style={{ textAlign: "center" }}>Errors</span>
            <span style={{ textAlign: "center" }}>Duration</span>
            <span style={{ textAlign: "right" }}>Providers</span>
          </div>
        )}

        {runsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 52, borderRadius: 10, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: mutedClr }}>
            <Zap size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: "0.9rem", margin: 0 }}>No ingestion runs yet.</p>
            <p style={{ fontSize: "0.78rem", margin: "4px 0 0" }}>Trigger a sync from the source panel above.</p>
          </div>
        ) : (
          <div>
            {runs.map((run) => (
              <RunRow key={run._id || run.startedAt} run={run} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${borderClr}` }}>
            <span style={{ fontSize: "0.78rem", color: mutedClr }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchRuns(p); }}
              disabled={page === 1 || runsLoading}
              style={{
                display: "flex", alignItems: "center", padding: "6px 10px", background: "none",
                border: `1px solid ${borderClr}`, borderRadius: 8, cursor: page === 1 ? "not-allowed" : "pointer",
                color: mutedClr, opacity: page === 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchRuns(p); }}
              disabled={page === totalPages || runsLoading}
              style={{
                display: "flex", alignItems: "center", padding: "6px 10px", background: "none",
                border: `1px solid ${borderClr}`, borderRadius: 8, cursor: page === totalPages ? "not-allowed" : "pointer",
                color: mutedClr, opacity: page === totalPages ? 0.4 : 1,
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
