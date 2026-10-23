"use strict";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  GraduationCap,
  Building2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  IndianRupee,
  Clock,
  Users,
  Star,
  TrendingUp,
  ChevronRight,
  BarChart3,
  Phone
} from "lucide-react";
import { Button, Input } from "./JobPortal";
import { useGoogleLogin } from "@react-oauth/google";
import API from "./services/api";
import { useTheme, ThemeToggle, T } from "./context/ThemeContext";

function Field({ label, children, hint }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 500, color: T.textMid, fontFamily: T.font }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: "0.7rem", color: T.textDim }}>{hint}</span>}
    </div>;
}

function PasswordInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <span style={{ position: "absolute", left: 13, color: focused ? T.purpleL : T.textDim, display: "flex", pointerEvents: "none", transition: "color 0.2s" }}>
        <Lock size={15} />
      </span>
      <input
    type={show ? "text" : "password"}
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    style={{ width: "100%", background: T.surface, border: `1px solid ${focused ? "rgba(124,106,247,0.55)" : T.border}`, borderRadius: 10, padding: "11px 42px 11px 40px", color: T.text, fontSize: "0.9rem", outline: "none", fontFamily: T.font, transition: "border-color 0.2s", boxSizing: "border-box" }}
  />
      <button
    type="button"
    onClick={() => setShow(!show)}
    style={{ position: "absolute", right: 13, background: "transparent", border: "none", color: T.textDim, cursor: "pointer", display: "flex", padding: 0, transition: "color 0.2s" }}
    onMouseEnter={(e) => e.currentTarget.style.color = T.purpleL}
    onMouseLeave={(e) => e.currentTarget.style.color = T.textDim}
  >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>;
}

const ROLES = [
  {
    id: "student",
    icon: <GraduationCap size={28} />,
    title: "I'm Job Hunting",
    subtitle: "Browse thousands of roles, apply with one click, and track every application.",
    perks: ["Smart job matching", "One-click apply", "Application tracker"],
    accent: T.purple,
    accentDim: T.purpleDim,
    gradient: "linear-gradient(135deg, rgba(124,106,247,0.2), rgba(74,222,128,0.08))"
  },
  {
    id: "recruiter",
    icon: <Building2 size={28} />,
    title: "I'm Hiring",
    subtitle: "Post jobs, review applicants, and manage your entire hiring pipeline in one place.",
    perks: ["Unlimited job posts", "Smart applicant filter", "Pipeline analytics"],
    accent: T.green,
    accentDim: T.greenDim,
    gradient: "linear-gradient(135deg, rgba(74,222,128,0.2), rgba(124,106,247,0.08))"
  }
];

function RolePicker({ selected, onChange, onContinue }) {
  const { isDark } = useTheme();
  return <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: "0.72rem", color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Step 1 of 2</div>
        <h1 style={{ fontFamily: T.serif, fontSize: "2rem", color: T.text, margin: "0 0 8px" }}>Welcome to JobSphere</h1>
        <p style={{ fontSize: "0.9rem", color: T.textMid, margin: 0, lineHeight: 1.6 }}>Tell us how you plan to use the platform.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ROLES.map((r) => {
    const active = selected === r.id;
    return <motion.button
      key={r.id}
      onClick={() => onChange(r.id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      style={{
        width: "100%",
        textAlign: "left",
        background: active ? r.gradient : (isDark ? T.surface : "#ffffff"),
        border: `1.5px solid ${active ? r.accent + "60" : T.border}`,
        borderRadius: 14,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "all 0.22s",
        position: "relative",
        overflow: "hidden",
        fontFamily: T.font,
        boxShadow: isDark ? "none" : (active ? "0 4px 14px rgba(124,106,247,0.12)" : "0 1px 4px rgba(0,0,0,0.06)")
      }}
    >
              {active && <div style={{ position: "absolute", top: 14, right: 14, color: r.accent }}>
                  <CheckCircle2 size={18} fill={r.accent + "33"} />
                </div>}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: active ? r.accentDim : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"), display: "flex", alignItems: "center", justifyContent: "center", color: active ? r.accent : T.textDim, flexShrink: 0, transition: "all 0.22s" }}>
                  {r.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: T.text, marginBottom: 5 }}>{r.title}</div>
                  <div style={{ fontSize: "0.82rem", color: T.textMid, lineHeight: 1.55, marginBottom: 12 }}>{r.subtitle}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {r.perks.map((p) => <span key={p} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: active ? r.accent : T.textDim, fontWeight: 500 }}>
                        <CheckCircle2 size={11} />{p}
                      </span>)}
                  </div>
                </div>
              </div>
            </motion.button>;
  })}
      </div>

      <div style={{ marginTop: 24 }}>
        <Button
    variant="primary"
    size="lg"
    onClick={onContinue}
    style={{ width: "100%", justifyContent: "center", opacity: selected ? 1 : 0.45, pointerEvents: selected ? "auto" : "none" }}
    iconRight={<ArrowRight size={16} />}
  >
          Continue
        </Button>
      </div>
    </motion.div>;
}
const STUDENT_SIGNUP_FIELDS = [
  { key: "name", label: "Full Name", placeholder: "Jane Doe", icon: <User size={15} />, type: "text" },
  { key: "email", label: "Email Address", placeholder: "jane@example.com", icon: <Mail size={15} />, type: "email" },
  { key: "phoneNumber", label: "Phone Number", placeholder: "1234567890", icon: <Phone size={15} />, type: "tel" }
];
const RECRUITER_SIGNUP_FIELDS = [
  { key: "name", label: "Your Full Name", placeholder: "Alex Rivera", icon: <User size={15} />, type: "text" },
  { key: "company", label: "Company Name", placeholder: "Acme Corp", icon: <Building2 size={15} />, type: "text" },
  { key: "email", label: "Work Email", placeholder: "alex@acmecorp.com", icon: <Mail size={15} />, type: "email" },
  { key: "phoneNumber", label: "Phone Number", placeholder: "1234567890", icon: <Phone size={15} />, type: "tel" }
];
function AuthForm({ role, mode, setMode, onSuccess, onBack, initialResetToken = "" }) {
  const [fields, setFields] = useState(() => (initialResetToken ? { resetToken: initialResetToken } : {}));
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const isRecruiter = role === "recruiter";
  const signupFields = isRecruiter ? RECRUITER_SIGNUP_FIELDS : STUDENT_SIGNUP_FIELDS;
  const accent = isRecruiter ? T.green : T.purple;
  const accentDim = isRecruiter ? T.greenDim : T.purpleDim;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      if (mode === "forgot") {
        if (!fields.email) {
          throw new Error("Please enter your email address.");
        }
        const res = await API.post("/user/forgot-password", { email: fields.email });
        setSuccessMsg(res.data.message || "Reset link sent! Please check your email inbox.");
        return;
      } else if (mode === "reset") {
        if (!fields.resetToken || !password) {
          throw new Error("Reset token and new password are required.");
        }
        if (password.length < 6) {
          throw new Error("New password must be at least 6 characters long.");
        }
        const res = await API.post("/user/reset-password", {
          token: fields.resetToken,
          newPassword: password,
        });
        setSuccessMsg("Password reset successfully! Redirecting to sign in...");
        setTimeout(() => {
          setMode("login");
          setSuccessMsg("");
        }, 1800);
        return;
      } else if (mode === "signup") {
        const regRes = await API.post("/user/register", {
          fullname: fields.name,
          email: fields.email,
          phoneNumber: fields.phoneNumber,
          password,
          role
        });
        if (!regRes.data.success) {
          throw new Error(regRes.data.message || "Registration failed");
        }
        const loginRes = await API.post("/user/login", {
          email: fields.email,
          password,
          role
        });
        if (loginRes.data.success) {
          const userObj = loginRes.data.user;
          if (role === "recruiter") {
            try {
              await API.post("/company/register", {
                companyName: fields.company || "My Company"
              });
            } catch (companyErr) {
              console.error("Failed to auto-register company:", companyErr);
            }
          }
          if (loginRes.data.token) {
            localStorage.setItem("token", loginRes.data.token);
          }
          onSuccess(userObj, loginRes.data.token);
        } else {
          throw new Error(loginRes.data.message || "Login failed after registration");
        }
      } else {
        const loginRes = await API.post("/user/login", {
          email: fields.email,
          password,
          role
        });
        if (loginRes.data.success) {
          if (loginRes.data.token) {
            localStorage.setItem("token", loginRes.data.token);
          }
          onSuccess(loginRes.data.user, loginRes.data.token);
        } else {
          throw new Error(loginRes.data.message || "Login failed");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  const handleMockSocialLogin = async (provider) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const email = isRecruiter ? "recruiter@jobsphere.com" : "seeker@jobsphere.com";
      const password2 = "password123";
      const loginRes = await API.post("/user/login", {
        email,
        password: password2,
        role
      });
      if (loginRes.data.success) {
        if (loginRes.data.token) {
          localStorage.setItem("token", loginRes.data.token);
        }
        onSuccess(loginRes.data.user, loginRes.data.token);
      } else {
        throw new Error(loginRes.data.message || `${provider} authentication failed`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || `${provider} authentication failed`);
    } finally {
      setLoading(false);
    }
  };
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await API.post("/user/auth/google", {
          token: tokenResponse.access_token,
          role
        });
        if (res.data.success) {
          if (res.data.token) {
            localStorage.setItem("token", res.data.token);
          }
          onSuccess(res.data.user, res.data.token);
        } else {
          throw new Error(res.data.message || "Google authentication failed");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg(err.response?.data?.message || err.message || "Google authentication failed");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setErrorMsg("Google Login was cancelled or failed.");
    }
  });
  const handleSocialLogin = (provider) => {
    if (provider === "Google") {
      const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientID || clientID.includes("dummy")) {
        handleMockSocialLogin("Google");
      } else {
        googleLogin();
      }
    } else if (provider === "GitHub") {
      const clientID = import.meta.env.VITE_GITHUB_CLIENT_ID;
      if (!clientID || clientID.includes("dummy")) {
        handleMockSocialLogin("GitHub");
      } else {
        const redirectURI = encodeURIComponent("http://localhost:8000/api/v1/user/auth/github/callback");
        const state = role;
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${redirectURI}&scope=user:email&state=${state}`;
        window.location.href = githubAuthUrl;
      }
    }
  };
  return <motion.div key={`${role}-${mode}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.28 }}>
      {
    /* Back + header */
  }
      <div style={{ marginBottom: 28 }}>
        <button
    onClick={onBack}
    style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: T.textDim, cursor: "pointer", fontSize: "0.8rem", fontFamily: T.font, padding: 0, marginBottom: 18, transition: "color 0.2s" }}
    onMouseEnter={(e) => e.currentTarget.style.color = T.textMid}
    onMouseLeave={(e) => e.currentTarget.style.color = T.textDim}
  >
          <ArrowLeft size={14} /> Change role
        </button>

        {
    /* Role badge */
  }
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: accentDim, border: `1px solid ${accent}40`, borderRadius: 20, marginBottom: 14 }}>
          {isRecruiter ? <Building2 size={12} color={accent} /> : <GraduationCap size={12} color={accent} />}
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: accent }}>{isRecruiter ? "Recruiter Account" : "Job Seeker Account"}</span>
        </div>

        <h1 style={{ fontFamily: T.serif, fontSize: "1.9rem", color: T.text, margin: "0 0 6px" }}>
          {mode === "forgot" ? "Reset your password" : mode === "reset" ? "Set New Password" : mode === "login" ? "Welcome back!" : isRecruiter ? "Start Hiring Today." : "Find Your Dream Role."}
        </h1>
        <p style={{ fontSize: "0.875rem", color: T.textMid, margin: 0, lineHeight: 1.6 }}>
          {mode === "forgot" ? "Enter your email to receive a secure password recovery link." : mode === "reset" ? "Enter the reset token sent to your email and your new password." : mode === "login" ? "Sign in to access your " + (isRecruiter ? "hiring dashboard." : "job applications.") : isRecruiter ? "Create your recruiter account and post your first job in minutes." : "Join 89,000+ candidates. It only takes 60 seconds."}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {
    /* Signup-only fields */
  }
        {mode === "signup" && signupFields.map((f) => <Field key={f.key} label={f.label}>
            <Input
    icon={f.icon}
    type={f.type}
    placeholder={f.placeholder}
    value={fields[f.key] ?? ""}
    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
  />
          </Field>)}

        {
    /* Login email */
  }
        {(mode === "login" || mode === "forgot") && <Field label="Email Address">
            <Input
    icon={<Mail size={15} />}
    type="email"
    placeholder={isRecruiter ? "alex@acmecorp.com" : "jane@example.com"}
    value={fields.email ?? ""}
    onChange={(e) => setFields((prev) => ({ ...prev, email: e.target.value }))}
  />
          </Field>}

        {mode === "reset" && <>
            <Field label="Reset Token" hint="Paste the token sent to your email">
              <Input
                icon={<Lock size={15} />}
                type="text"
                placeholder="e.g. 4f3a9e..."
                value={fields.resetToken ?? ""}
                onChange={(e) => setFields((prev) => ({ ...prev, resetToken: e.target.value }))}
              />
            </Field>
            <Field label="New Password">
              <PasswordInput placeholder="At least 6 characters" value={password} onChange={setPassword} />
            </Field>
          </>}

        {(mode === "login" || mode === "signup") && <Field label="Password">
          <PasswordInput placeholder={mode === "login" ? "Enter your password" : "Create a strong password"} value={password} onChange={setPassword} />
          {mode === "login" && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
                style={{ fontSize: "0.78rem", color: accent, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: T.font }}
              >
                Forgot password?
              </button>
            </div>}
        </Field>}

        {
    /* Recruiter signup: company size */
  }
        {mode === "signup" && isRecruiter && <Field label="Company Size">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {["1\u201310", "11\u201350", "51\u2013200", "200\u2013500", "500\u20131k", "1k+"].map((s) => <button
    key={s}
    type="button"
    onClick={() => setFields((p) => ({ ...p, size: s }))}
    style={{ padding: "8px 6px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 500, background: fields.size === s ? accentDim : T.surface, border: `1px solid ${fields.size === s ? accent + "55" : T.border}`, color: fields.size === s ? accent : T.textMid, cursor: "pointer", fontFamily: T.font, transition: "all 0.18s" }}
  >
                  {s}
                </button>)}
            </div>
          </Field>}

        {
    /* T&C */
  }
        {mode === "signup" && <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer" }}>
            <input type="checkbox" required style={{ marginTop: 2, accentColor: accent }} />
            <span style={{ fontSize: "0.78rem", color: T.textDim, lineHeight: 1.55 }}>
              I agree to the <span style={{ color: accent }}>Terms of Service</span> and <span style={{ color: accent }}>Privacy Policy</span>
            </span>
          </label>}

        {successMsg && <div style={{ color: "#22c55e", background: "rgba(34, 197, 94, 0.1)", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", textAlign: "center", margin: "4px 0", fontFamily: T.font }}>
            {successMsg}
          </div>}

        {errorMsg && <div style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", padding: "8px 12px", borderRadius: 8, fontSize: "0.85rem", textAlign: "center", margin: "4px 0", fontFamily: T.font }}>
            {errorMsg}
          </div>}
        <Button
    type="submit"
    variant={isRecruiter ? "green" : "primary"}
    size="lg"
    style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: loading ? 0.7 : 1 }}
    iconRight={loading ? void 0 : <ArrowRight size={16} />}
  >
          {loading ? "Please wait\u2026" : mode === "forgot" ? "Send Reset Link" : mode === "reset" ? "Set New Password" : mode === "login" ? "Sign In" : isRecruiter ? "Create Recruiter Account" : "Create Account & Apply"}
        </Button>
      </form>

      {mode === "forgot" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
          <button
            type="button"
            onClick={() => { setMode("login"); setErrorMsg(""); setSuccessMsg(""); }}
            style={{ fontSize: "0.82rem", color: accent, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: T.font }}
          >
            ← Back to Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("reset"); setErrorMsg(""); setSuccessMsg(""); }}
            style={{ fontSize: "0.82rem", color: T.textDim, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: T.font }}
          >
            Have a reset token?
          </button>
        </div>
      )}

      {mode === "reset" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
          <button
            type="button"
            onClick={() => { setMode("login"); setErrorMsg(""); setSuccessMsg(""); }}
            style={{ fontSize: "0.82rem", color: accent, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: T.font }}
          >
            ← Back to Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("forgot"); setErrorMsg(""); setSuccessMsg(""); }}
            style={{ fontSize: "0.82rem", color: T.textDim, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: T.font }}
          >
            Request new token
          </button>
        </div>
      )}

      {(mode === "login" || mode === "signup") && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: "0.78rem", color: T.textDim }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Google", icon: <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91C16.46 14.28 17.64 11.95 17.64 9.2Z" fill="#4285F4" /><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" fill="#34A853" /><path d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z" fill="#FBBC05" /><path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96L3.96 7.3C4.67 5.16 6.66 3.58 9 3.58Z" fill="#EA4335" /></svg> },
              { label: "GitHub", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg> }
            ].map(({ label, icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleSocialLogin(label)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.textMid, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", fontFamily: T.font, transition: "all 0.18s" }}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, { borderColor: "rgba(124,106,247,0.35)", color: T.text });
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, { borderColor: T.border, color: T.textMid });
                }}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          <p style={{ marginTop: 22, textAlign: "center", fontSize: "0.875rem", color: T.textDim, fontFamily: T.font }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              style={{ color: accent, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: T.font }}
            >
              {mode === "login" ? "Create one" : "Sign In"}
            </button>
          </p>
        </>
      )}
    </motion.div>;
}

function StudentPreviewPanel() {
  const { isDark } = useTheme();
  const jobs = [
    { title: "Senior Frontend Engineer", co: "Vercel", loc: "Remote", sal: "₹24L – ₹36L", logo: "VR", bg: "#000", tag: "Full-time", match: 98 },
    { title: "Product Designer", co: "Linear", loc: "Bengaluru", sal: "₹18L – ₹28L", logo: "LN", bg: "#5b6af7", tag: "Hybrid", match: 91 },
    { title: "Data Scientist", co: "Stripe", loc: "Bengaluru", sal: "₹22L – ₹34L", logo: "ST", bg: "#635bff", tag: "Full-time", match: 85 }
  ];
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {
    /* Profile completion */
  }
      <div style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: T.text }}>Profile Strength</span>
          <span style={{ fontSize: "0.75rem", color: T.green, fontWeight: 600 }}>72%</span>
        </div>
        <div style={{ height: 5, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: "72%", background: `linear-gradient(90deg, ${T.purple}, ${T.green})`, borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["\u2713 Resume", "\u2713 Skills", "+ Portfolio", "+ References"].map((t) => <span key={t} style={{ fontSize: "0.65rem", padding: "2px 8px", background: t.startsWith("\u2713") ? T.greenDim : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"), color: t.startsWith("\u2713") ? T.green : T.textDim, borderRadius: 20, fontWeight: 500 }}>{t}</span>)}
        </div>
      </div>

      {
    /* Matched jobs */
  }
      <div style={{ fontSize: "0.7rem", color: T.textDim, display: "flex", alignItems: "center", gap: 5 }}>
        <Star size={11} color={T.yellow} fill={T.yellow} /> AI-matched jobs for you
      </div>
      {jobs.map((j) => <div key={j.title} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 11, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: j.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{j.logo}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.title}</div>
            <div style={{ fontSize: "0.67rem", color: T.textDim }}>{j.co} · {j.loc}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: T.green }}>{j.match}% match</div>
            <div style={{ fontSize: "0.62rem", color: T.textDim }}>{j.sal}</div>
          </div>
        </div>)}

      {
    /* Stats */
  }
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[{ v: "12", l: "Applied" }, { v: "4", l: "Interviews" }, { v: "1", l: "Offer" }].map((s) => <div key={s.l} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center", boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: T.text }}>{s.v}</div>
            <div style={{ fontSize: "0.62rem", color: T.textDim, marginTop: 2 }}>{s.l}</div>
          </div>)}
      </div>
    </div>;
}

function RecruiterPreviewPanel() {
  const { isDark } = useTheme();
  const applicants = [
    { name: "Elena Vance", role: "Sr. Frontend Eng", score: 94, status: "Interview", avatar: "EV", avatarBg: T.purple },
    { name: "Marcus Cole", role: "Sr. Frontend Eng", score: 88, status: "Review", avatar: "MC", avatarBg: T.green },
    { name: "Priya Sharma", role: "Sr. Frontend Eng", score: 82, status: "Applied", avatar: "PS", avatarBg: T.pink }
  ];
  const STATUS_COLOR = {
    Interview: [T.greenDim, T.green],
    Review: ["rgba(250,204,21,0.12)", "#facc15"],
    Applied: [T.purpleDim, T.purpleL]
  };
  return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {
    /* Pipeline stats */
  }
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
    { icon: <Briefcase size={14} />, v: "3", l: "Active Posts", color: T.purple },
    { icon: <Users size={14} />, v: "47", l: "Applicants", color: T.green },
    { icon: <BarChart3 size={14} />, v: "8", l: "Shortlisted", color: T.orange },
    { icon: <TrendingUp size={14} />, v: "1,240", l: "Job Views", color: T.pink }
  ].map((s) => <div key={s.l} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 9, boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: s.color + "20", display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: T.text }}>{s.v}</div>
              <div style={{ fontSize: "0.62rem", color: T.textDim }}>{s.l}</div>
            </div>
          </div>)}
      </div>

      {
    /* Applicant list */
  }
      <div style={{ fontSize: "0.7rem", color: T.textDim }}>Recent Applicants</div>
      {applicants.map((a) => {
    const [sbg, sc] = STATUS_COLOR[a.status];
    return <div key={a.name} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 11, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: a.avatarBg + "30", border: `1px solid ${a.avatarBg}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: a.avatarBg, flexShrink: 0 }}>{a.avatar}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: T.text }}>{a.name}</div>
              <div style={{ fontSize: "0.67rem", color: T.textDim }}>{a.role}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: "0.65rem", padding: "2px 8px", background: sbg, color: sc, borderRadius: 20, fontWeight: 600 }}>{a.status}</span>
              <span style={{ fontSize: "0.62rem", color: T.green, fontWeight: 600 }}>AI {a.score}%</span>
            </div>
          </div>;
  })}

      {
    /* Active job post */
  }
      <div style={{ background: isDark ? "rgba(74,222,128,0.07)" : "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 11, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: T.text }}>Sr. Frontend Engineer</span>
          <span style={{ fontSize: "0.65rem", color: T.green, fontWeight: 600 }}>● LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: "0.68rem", color: T.textDim }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={10} />Remote</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><IndianRupee size={10} />₹1.16Cr – ₹1.49Cr</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={10} />3 days left</span>
        </div>
      </div>
    </div>;
}

function RightPanel({ role, mode }) {
  const { isDark } = useTheme();
  const isRecruiter = role === "recruiter";
  const accent = isRecruiter ? T.green : T.purple;
  return <div
    className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
    style={{ background: isDark ? "linear-gradient(145deg, #0e0e20 0%, #16103a 40%, #0f1f18 100%)" : "linear-gradient(145deg, #f8fafc 0%, #ede9fe 50%, #f0fdf4 100%)", borderLeft: `1px solid ${T.border}` }}
  >
      {
    /* Blobs */
  }
      <div style={{ position: "absolute", top: -100, right: -60, width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${isRecruiter ? "rgba(74,222,128,0.15)" : "rgba(124,106,247,0.18)"} 0%, transparent 65%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 60, left: -50, width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${isRecruiter ? "rgba(124,106,247,0.1)" : "rgba(74,222,128,0.1)"} 0%, transparent 65%)`, pointerEvents: "none" }} />

      {
    /* Floating window */
  }
      <AnimatePresence mode="wait">
        <motion.div
    key={role ?? "default"}
    initial={{ opacity: 0, y: 20, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.97 }}
    transition={{ duration: 0.35 }}
    style={{ position: "relative", zIndex: 1, width: "88%", maxWidth: 400, background: isDark ? "rgba(12,10,24,0.82)" : "#ffffff", border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden", boxShadow: isDark ? "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)" : "0 20px 50px rgba(0,0,0,0.1)" }}
  >
          {
    /* Chrome */
  }
          <div style={{ padding: "11px 16px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 6 }}>
            {[0.15, 0.1, 0.07].map((o, i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: isDark ? `rgba(255,255,255,${o})` : `rgba(0,0,0,${o * 1.5})` }} />)}
            <span style={{ marginLeft: "auto", fontSize: "0.62rem", color: isDark ? "#3a3a70" : "#64748b", letterSpacing: "0.04em" }}>
              {role === null ? "JobSphere Platform" : isRecruiter ? "Recruiter Dashboard" : "Candidate Portal"}
            </span>
          </div>

          <div style={{ padding: 16 }}>
            {role === null && <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #7c6af7, #4ade80)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Briefcase size={24} color="white" />
                </div>
                <div style={{ fontFamily: T.serif, fontSize: "1.2rem", color: T.text, marginBottom: 8 }}>JobSphere</div>
                <div style={{ fontSize: "0.78rem", color: T.textDim, lineHeight: 1.6 }}>Select your role to see a<br />personalised platform preview.</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 20 }}>
                  {[{ icon: <GraduationCap size={16} />, label: "Job Seeker", color: T.purple }, { icon: <Building2 size={16} />, label: "Recruiter", color: T.green }].map((r) => <div key={r.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: r.color + "20", display: "flex", alignItems: "center", justifyContent: "center", color: r.color }}>{r.icon}</div>
                      <span style={{ fontSize: "0.68rem", color: T.textDim }}>{r.label}</span>
                    </div>)}
                </div>
              </div>}
            {role === "student" && <StudentPreviewPanel />}
            {role === "recruiter" && <RecruiterPreviewPanel />}
          </div>
        </motion.div>
      </AnimatePresence>

      {
    /* Social proof strip */
  }
      {role !== null && <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    style={{ position: "absolute", bottom: 28, zIndex: 1, display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)", border: `1px solid ${T.border}`, borderRadius: 40, backdropFilter: "blur(12px)", boxShadow: isDark ? "none" : "0 4px 14px rgba(0,0,0,0.08)" }}
  >
          <div style={{ display: "flex" }}>
            {["EV", "MC", "PS", "AR"].map((av, i) => <div key={av} style={{ width: 24, height: 24, borderRadius: "50%", background: [T.purple, T.green, T.pink, T.orange][i] + "90", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontWeight: 700, color: "#fff", marginLeft: i > 0 ? -8 : 0, border: `1.5px solid ${isDark ? "rgba(9,9,15,0.8)" : "#ffffff"}` }}>{av}</div>)}
          </div>
          <span style={{ fontSize: "0.72rem", color: T.textMid }}>
            {isRecruiter ? "320+ companies hired this month" : "1,200+ candidates placed this month"}
          </span>
        </motion.div>}
    </div>;
}

export function JobPortalAuth({
  onSuccess,
  onBack,
  initialMode = "login"
}) {
  const { isDark } = useTheme();
  const [role, setRole] = useState(null);
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState(1);
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("resetToken") || params.get("token");
    if (token) {
      setResetToken(token);
      setRole("student");
      setStep(2);
      setMode("reset");
    }
  }, []);

  const handleRoleSelect = (r) => setRole(r);
  const handleRoleContinue = () => {
    if (role) setStep(2);
  };
  const handleBack = () => {
    setStep(1);
  };
  return <div className="min-h-screen flex" style={{ background: T.bg, fontFamily: T.font }}>
      {
    /* LEFT */
  }
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 sm:px-16 py-12 overflow-y-auto">
        {
    /* Logo + back-to-portal */
  }
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #7c6af7, #4ade80)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Briefcase size={15} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: T.serif, fontSize: "1.1rem", color: T.text }}>JobSphere</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ThemeToggle />
            <button
              onClick={onBack}
              style={{ display: "flex", alignItems: "center", gap: 5, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", color: T.textDim, fontSize: "0.78rem", cursor: "pointer", fontFamily: T.font }}
            >
              <ArrowLeft size={13} /> Back to Jobs
            </button>
          </div>
        </div>

        {
    /* Step indicator */
  }
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          {[1, 2].map((s) => <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: step >= s ? T.purple : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: step >= s ? "#fff" : T.textDim, transition: "all 0.3s", flexShrink: 0 }}>{s}</div>
              <span style={{ fontSize: "0.72rem", color: step === s ? T.purpleL : T.textDim, fontWeight: step === s ? 600 : 400 }}>
                {s === 1 ? "Choose role" : "Create account"}
              </span>
              {s < 2 && <ChevronRight size={12} color={T.textDim} />}
            </div>)}
        </div>

        {
    /* Content */
  }
        <AnimatePresence mode="wait">
          {step === 1 ? <motion.div key="step1">
              <RolePicker selected={role} onChange={handleRoleSelect} onContinue={handleRoleContinue} />
            </motion.div> : <motion.div key="step2">
              <AuthForm role={role} mode={mode} setMode={setMode} onSuccess={onSuccess} onBack={handleBack} initialResetToken={resetToken} />
            </motion.div>}
        </AnimatePresence>
      </div>

      {
    /* RIGHT */
  }
      <RightPanel role={role} mode={mode} />
    </div>;
}
