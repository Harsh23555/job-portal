"use strict";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Shield,
  Play,
  Pause,
  OctagonAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Building2,
  MapPin,
  DollarSign,
  Sparkles,
  RotateCw,
} from "lucide-react";
import { useTheme, T } from "../context/ThemeContext";
import API from "../services/api";

export default function AutoApplyConfigModal({ isOpen, onClose, onConfigSaved }) {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningBatch, setRunningBatch] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [config, setConfig] = useState({
    enabled: false,
    minMatchScore: 80,
    preferredJobTitles: [],
    allowedLocations: [],
    minSalary: 0,
    remotePreference: "any",
    excludedCompanies: [],
    maxApplicationsPerDay: 5,
    appliedTodayCount: 0,
    isPaused: false,
    emergencyStop: false,
    userAuthorized: false,
  });

  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function fetchConfig() {
      setLoading(true);
      setError("");
      try {
        const res = await API.get("/user/auto-apply-config");
        if (isMounted && res.data?.success && res.data.autoApplyConfig) {
          setConfig((prev) => ({
            ...prev,
            ...res.data.autoApplyConfig,
          }));
        }
      } catch (err) {
        console.warn("[AutoApplyConfigModal] fetch error:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (overrides = {}) => {
    setSaving(true);
    setError("");
    setSuccessMsg("");

    const updated = { ...config, ...overrides };

    try {
      const res = await API.post("/user/auto-apply-config", updated);
      if (res.data?.success) {
        setConfig(res.data.autoApplyConfig);
        setSuccessMsg("Settings saved successfully.");
        if (onConfigSaved) onConfigSaved(res.data.autoApplyConfig);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save auto-apply configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleRunCycle = async () => {
    setRunningBatch(true);
    setBatchResult(null);
    setError("");

    try {
      const res = await API.post("/user/auto-apply/run");
      if (res.data?.success) {
        setBatchResult(res.data);
        setConfig((prev) => ({
          ...prev,
          appliedTodayCount: res.data.appliedTodayCount ?? prev.appliedTodayCount,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to run auto-apply cycle.");
    } finally {
      setRunningBatch(false);
    }
  };

  const handleToggleEmergencyStop = async () => {
    const nextState = !config.emergencyStop;
    await handleSave({ emergencyStop: nextState });
  };

  const handleTogglePause = async () => {
    const nextState = !config.isPaused;
    await handleSave({ isPaused: nextState });
  };

  const handleAddTitle = () => {
    if (!newTitle.trim()) return;
    if (!config.preferredJobTitles.includes(newTitle.trim())) {
      setConfig((prev) => ({
        ...prev,
        preferredJobTitles: [...prev.preferredJobTitles, newTitle.trim()],
      }));
    }
    setNewTitle("");
  };

  const handleRemoveTitle = (title) => {
    setConfig((prev) => ({
      ...prev,
      preferredJobTitles: prev.preferredJobTitles.filter((t) => t !== title),
    }));
  };

  const handleAddCompany = () => {
    if (!newCompany.trim()) return;
    if (!config.excludedCompanies.includes(newCompany.trim().toLowerCase())) {
      setConfig((prev) => ({
        ...prev,
        excludedCompanies: [...prev.excludedCompanies, newCompany.trim().toLowerCase()],
      }));
    }
    setNewCompany("");
  };

  const handleRemoveCompany = (comp) => {
    setConfig((prev) => ({
      ...prev,
      excludedCompanies: prev.excludedCompanies.filter((c) => c !== comp),
    }));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: T.modalBackdrop,
        backdropFilter: "blur(12px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          background: isDark ? "rgba(14, 12, 26, 0.98)" : "#ffffff",
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: 28,
          boxShadow: isDark ? "0 28px 60px rgba(0,0,0,0.7)" : "0 20px 48px rgba(0,0,0,0.12)",
          color: T.text,
          fontFamily: T.font,
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "none",
            border: "none",
            color: T.textDim,
            cursor: "pointer",
            padding: 4,
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg, #7c6af7, #4ade80)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 4px 16px rgba(124,106,247,0.3)",
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.35rem", fontFamily: T.serif, margin: "0 0 2px", color: T.text }}>
              Controlled Auto-Apply Engine
            </h2>
            <p style={{ margin: 0, fontSize: "0.82rem", color: T.textMid }}>
              AI-assisted automated job submissions with strict safety boundaries and candidate consent.
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.25)"}`,
              borderRadius: 10,
              color: T.red,
              fontSize: "0.85rem",
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: isDark ? "rgba(74,222,128,0.12)" : "rgba(22,163,74,0.08)",
              border: `1px solid ${isDark ? "rgba(74,222,128,0.3)" : "rgba(22,163,74,0.25)"}`,
              borderRadius: 10,
              color: T.green,
              fontSize: "0.85rem",
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Master Controls: Emergency Stop & Pause Status */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Pause / Resume */}
          <button
            onClick={handleTogglePause}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 16px",
              background: config.isPaused
                ? isDark
                  ? "rgba(250,204,21,0.18)"
                  : "rgba(217,119,6,0.12)"
                : isDark
                ? "rgba(255,255,255,0.04)"
                : "#f1f5f9",
              border: `1px solid ${
                config.isPaused
                  ? isDark
                    ? "rgba(250,204,21,0.4)"
                    : "rgba(217,119,6,0.35)"
                  : T.border
              }`,
              borderRadius: 12,
              color: config.isPaused ? T.yellow : T.text,
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            {config.isPaused ? <Play size={16} /> : <Pause size={16} />}
            <span>{config.isPaused ? "Resume Auto-Apply" : "Pause Auto-Apply"}</span>
          </button>

          {/* Emergency Stop */}
          <button
            onClick={handleToggleEmergencyStop}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 16px",
              background: config.emergencyStop
                ? isDark
                  ? "rgba(239,68,68,0.25)"
                  : "rgba(220,38,38,0.15)"
                : isDark
                ? "rgba(239,68,68,0.1)"
                : "rgba(239,68,68,0.06)",
              border: `1px solid ${
                config.emergencyStop
                  ? isDark
                    ? "rgba(239,68,68,0.5)"
                    : "rgba(220,38,38,0.4)"
                  : isDark
                  ? "rgba(239,68,68,0.25)"
                  : "rgba(239,68,68,0.2)"
              }`,
              borderRadius: 12,
              color: T.red,
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            <OctagonAlert size={16} />
            <span>{config.emergencyStop ? "Reset Emergency Stop" : "Emergency Stop"}</span>
          </button>
        </div>

        {/* Live Quota Bar */}
        <div
          style={{
            padding: "14px 18px",
            background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
            borderRadius: 12,
            border: `1px solid ${T.border}`,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.82rem", color: T.textMid, display: "block" }}>
              Daily Submissions Today
            </span>
            <strong style={{ fontSize: "1.1rem", color: T.text }}>
              {config.appliedTodayCount} / {config.maxApplicationsPerDay} Applications
            </strong>
          </div>

          <button
            onClick={handleRunCycle}
            disabled={runningBatch || config.emergencyStop || config.isPaused || !config.enabled}
            style={{
              padding: "8px 18px",
              background: "linear-gradient(135deg, #7c6af7, #5b48e0)",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor:
                runningBatch || config.emergencyStop || config.isPaused || !config.enabled
                  ? "not-allowed"
                  : "pointer",
              opacity: runningBatch || config.emergencyStop || config.isPaused || !config.enabled ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {runningBatch ? (
              <>
                <RotateCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Run Cycle Now</span>
              </>
            )}
          </button>
        </div>

        {/* Batch Result Notice */}
        {batchResult && (
          <div
            style={{
              padding: 14,
              background: isDark ? "rgba(74,222,128,0.12)" : "rgba(22,163,74,0.08)",
              border: `1px solid ${isDark ? "rgba(74,222,128,0.3)" : "rgba(22,163,74,0.25)"}`,
              borderRadius: 10,
              marginBottom: 16,
              fontSize: "0.85rem",
              color: T.green,
            }}
          >
            <strong>{batchResult.message}</strong>
            {batchResult.appliedJobs?.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                {batchResult.appliedJobs.map((j) => (
                  <li key={j.id}>
                    {j.title} at {j.company} (Match Score: {j.matchScore}%)
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Configuration Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Master Enable Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: isDark ? "rgba(255,255,255,0.02)" : "#fff",
              border: `1px solid ${T.border}`,
              borderRadius: 12,
            }}
          >
            <div>
              <strong style={{ fontSize: "0.95rem", color: T.text, display: "block" }}>
                Enable Auto-Apply Mode
              </strong>
              <span style={{ fontSize: "0.8rem", color: T.textDim }}>
                Automatically applies to vacancies meeting all criteria below
              </span>
            </div>

            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              style={{ width: 20, height: 20, accentColor: T.purple, cursor: "pointer" }}
            />
          </div>

          {/* Min Match Score Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: "0.82rem", fontWeight: 600, color: T.textDim }}>
                Minimum Match Score Threshold
              </label>
              <strong style={{ fontSize: "0.88rem", color: T.purple }}>
                {config.minMatchScore}% Match
              </strong>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              step="5"
              value={config.minMatchScore}
              onChange={(e) => setConfig({ ...config, minMatchScore: parseInt(e.target.value, 10) })}
              style={{ width: "100%", accentColor: T.purple, cursor: "pointer" }}
            />
            <span style={{ fontSize: "0.75rem", color: T.textDim }}>
              Only vacancies scoring at or above this threshold will be considered.
            </span>
          </div>

          {/* Daily Limit & Remote Preference Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
                Max Applications Per Day
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.maxApplicationsPerDay}
                onChange={(e) =>
                  setConfig({ ...config, maxApplicationsPerDay: parseInt(e.target.value, 10) || 1 })
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  color: T.text,
                  fontSize: "0.88rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
                Workplace Setting
              </label>
              <select
                value={config.remotePreference}
                onChange={(e) => setConfig({ ...config, remotePreference: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: isDark ? "rgba(255,255,255,0.06)" : "#fff",
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  color: T.text,
                  fontSize: "0.88rem",
                  boxSizing: "border-box",
                }}
              >
                <option value="any">Any (Remote, Hybrid, Onsite)</option>
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite Only</option>
              </select>
            </div>
          </div>

          {/* Excluded Companies */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: T.textDim, marginBottom: 6 }}>
              Excluded Companies (e.g. Current Employer)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {config.excludedCompanies.map((comp) => (
                <span
                  key={comp}
                  style={{
                    padding: "3px 9px",
                    background: isDark ? "rgba(239,68,68,0.15)" : "rgba(220,38,38,0.1)",
                    border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "rgba(220,38,38,0.25)"}`,
                    borderRadius: 16,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: T.red,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {comp}
                  <button
                    type="button"
                    onClick={() => handleRemoveCompany(comp)}
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
                placeholder="Add company name to exclude..."
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCompany())}
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
                onClick={handleAddCompany}
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
                Exclude
              </button>
            </div>
          </div>

          {/* Authorization Checkbox */}
          <div
            style={{
              padding: 12,
              background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <input
              type="checkbox"
              id="user-auth-check"
              checked={config.userAuthorized}
              onChange={(e) => setConfig({ ...config, userAuthorized: e.target.checked })}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: T.purple, cursor: "pointer" }}
            />
            <label htmlFor="user-auth-check" style={{ fontSize: "0.8rem", color: T.textMid, lineHeight: 1.4 }}>
              I authorize JobSphere's AI agent to auto-apply to eligible jobs matching my confirmed profile and configured thresholds using verified truthful candidate data.
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "none",
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              color: T.textMid,
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            Close
          </button>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            style={{
              padding: "10px 26px",
              background: "linear-gradient(135deg, #7c6af7, #5b48e0)",
              border: "none",
              borderRadius: 10,
              color: "white",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(124,106,247,0.3)",
            }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
