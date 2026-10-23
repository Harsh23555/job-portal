"use strict";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import API from "./services/api";
import { useTheme, ThemeToggle, T } from "./context/ThemeContext";

export function JobPortalAdminLogin({ onBack, onSuccess }) {
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/admin/login", {
        email: email.trim(),
        password,
      });

      if (res.data?.success) {
        onSuccess(res.data.admin);
      } else {
        setError(res.data?.message || "Invalid admin credentials.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: T.bg, fontFamily: T.font }}>
      {/* Navbar */}
      <nav style={{ borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100, background: T.bg }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 60 }}>
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontFamily: T.font, padding: "6px 10px", borderRadius: 8, transition: "all 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = T.textMid)}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #7c6af7, #4ade80)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Briefcase size={13} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: T.serif, fontSize: "1.05rem", color: T.text }}>JobSphere</span>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <ThemeToggle size="sm" />
          </div>
        </div>
      </nav>

      {/* Login Card */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            maxWidth: 440,
            width: "100%",
            background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: "40px 36px",
            boxShadow: isDark ? "none" : "0 8px 32px rgba(0,0,0,0.06)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(124,106,247,0.15))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Shield size={26} color={T.purple} />
            </div>
            <h1 style={{ fontFamily: T.serif, fontSize: "1.5rem", color: T.text, margin: "0 0 6px" }}>Admin Portal</h1>
            <p style={{ fontSize: "0.84rem", color: T.textMid, margin: 0 }}>Secure admin access for HR verification management</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: T.redDim,
                border: `1px solid ${T.red}33`,
                borderRadius: 10,
                padding: "11px 14px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: T.red,
                fontSize: "0.82rem",
              }}
            >
              <AlertCircle size={15} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 500, color: T.textMid, fontFamily: T.font }}>Admin Email</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 13, color: T.textDim, display: "flex", pointerEvents: "none" }}>
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  placeholder="admin@jobsphere.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{
                    width: "100%",
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "12px 14px 12px 40px",
                    color: T.text,
                    fontSize: "0.9rem",
                    outline: "none",
                    fontFamily: T.font,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 500, color: T.textMid, fontFamily: T.font }}>Admin Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 13, color: T.textDim, display: "flex", pointerEvents: "none" }}>
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "12px 42px 12px 40px",
                    color: T.text,
                    fontSize: "0.9rem",
                    outline: "none",
                    fontFamily: T.font,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 13, background: "transparent", border: "none", color: T.textDim, cursor: "pointer", display: "flex", padding: 0 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: "13px 20px",
                borderRadius: 10,
                background: loading ? T.textDim : "linear-gradient(135deg, #7c6af7, #a090ff)",
                color: "#fff",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
                fontWeight: 600,
                fontFamily: T.font,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "opacity 0.2s",
              }}
            >
              {loading ? <><Loader2 size={16} /> Authenticating...</> : <><Shield size={16} /> Sign In as Admin</>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
