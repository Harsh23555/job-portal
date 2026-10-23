"use strict";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Phone,
  Globe,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import API from "./services/api";
import { useTheme, ThemeToggle, T } from "./context/ThemeContext";

/* ─── Styled helpers ─────────────────────────────────────────────────────── */

function Field({ label, required, children, hint, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 500, color: T.textMid, fontFamily: T.font }}>
        {label} {required && <span style={{ color: T.red }}>*</span>}
      </label>
      {children}
      {hint && !error && <span style={{ fontSize: "0.7rem", color: T.textDim }}>{hint}</span>}
      {error && <span style={{ fontSize: "0.72rem", color: T.red }}>{error}</span>}
    </div>
  );
}

function StyledInput({ icon, type = "text", placeholder, value, onChange, required, ...rest }) {
  const [focused, setFocused] = useState(false);
  const Icon = icon;
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {Icon && (
        <span style={{ position: "absolute", left: 13, color: focused ? T.purpleL : T.textDim, display: "flex", pointerEvents: "none", transition: "color 0.2s" }}>
          {typeof Icon === "function" ? <Icon size={15} /> : Icon}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        style={{
          width: "100%",
          background: T.surface,
          border: `1px solid ${focused ? "rgba(124,106,247,0.55)" : T.border}`,
          borderRadius: 10,
          padding: Icon ? "11px 14px 11px 40px" : "11px 14px",
          color: T.text,
          fontSize: "0.88rem",
          outline: "none",
          fontFamily: T.font,
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
        {...rest}
      />
    </div>
  );
}

function PasswordInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
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
        style={{
          width: "100%",
          background: T.surface,
          border: `1px solid ${focused ? "rgba(124,106,247,0.55)" : T.border}`,
          borderRadius: 10,
          padding: "11px 42px 11px 40px",
          color: T.text,
          fontSize: "0.88rem",
          outline: "none",
          fontFamily: T.font,
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{ position: "absolute", right: 13, background: "transparent", border: "none", color: T.textDim, cursor: "pointer", display: "flex", padding: 0, transition: "color 0.2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = T.purpleL)}
        onMouseLeave={(e) => (e.currentTarget.style.color = T.textDim)}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function StyledSelect({ icon, value, onChange, children, ...rest }) {
  const [focused, setFocused] = useState(false);
  const Icon = icon;
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {Icon && (
        <span style={{ position: "absolute", left: 13, color: focused ? T.purpleL : T.textDim, display: "flex", pointerEvents: "none", transition: "color 0.2s", zIndex: 1 }}>
          {typeof Icon === "function" ? <Icon size={15} /> : Icon}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          background: T.surface,
          border: `1px solid ${focused ? "rgba(124,106,247,0.55)" : T.border}`,
          borderRadius: 10,
          padding: Icon ? "11px 14px 11px 40px" : "11px 14px",
          color: T.text,
          fontSize: "0.88rem",
          outline: "none",
          fontFamily: T.font,
          transition: "border-color 0.2s",
          boxSizing: "border-box",
          cursor: "pointer",
          appearance: "auto",
        }}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}

/* ─── Step indicators ────────────────────────────────────────────────────── */

function StepIndicator({ steps, current }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.72rem",
              fontWeight: 600,
              fontFamily: T.font,
              background: i <= current ? "linear-gradient(135deg, #7c6af7, #a090ff)" : T.surface,
              color: i <= current ? "#fff" : T.textDim,
              border: `1.5px solid ${i <= current ? "transparent" : T.border}`,
              transition: "all 0.3s",
            }}
          >
            {i < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          <span style={{ fontSize: "0.72rem", color: i <= current ? T.text : T.textDim, fontWeight: i === current ? 600 : 400, fontFamily: T.font, display: i < steps.length - 1 ? "block" : "block" }}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <div style={{ width: 24, height: 1, background: i < current ? T.purple : T.border, margin: "0 2px" }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

const STEPS = ["Personal Info", "Company Info", "Additional"];

const INDUSTRIES = [
  "", "Technology", "Healthcare", "Finance", "Education", "Manufacturing",
  "Retail", "Media & Entertainment", "Consulting", "Real Estate",
  "Telecommunications", "Energy", "Transportation", "Legal", "Other",
];

const COMPANY_SIZES = [
  "", "1-10 employees", "11-50 employees", "51-200 employees",
  "201-500 employees", "501-1000 employees", "1001-5000 employees",
  "5000+ employees",
];

export function JobPortalHRRegister({ onBack, onSuccess }) {
  const { isDark } = useTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Personal info
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [designation, setDesignation] = useState("");

  // Company info
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCityState, setCompanyCityState] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");
  const [companyRegistrationInfo, setCompanyRegistrationInfo] = useState("");

  // Additional
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [hrAccessReason, setHrAccessReason] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validateStep = (s) => {
    const errs = {};
    if (s === 0) {
      if (!fullname.trim()) errs.fullname = "Full name is required.";
      if (!email.trim()) errs.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Invalid email format.";
      if (!phone.trim()) errs.phone = "Phone number is required.";
      else if (!/^[+\d\s\-().]{5,20}$/.test(phone.trim())) errs.phone = "Invalid phone format.";
      if (!password) errs.password = "Password is required.";
      else if (password.length < 6) errs.password = "Must be at least 6 characters.";
      if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match.";
      if (!designation.trim()) errs.designation = "Designation is required.";
    }
    if (s === 1) {
      if (!companyName.trim()) errs.companyName = "Company name is required.";
      if (companyWebsite && !/^https?:\/\/.+/.test(companyWebsite.trim())) errs.companyWebsite = "Must start with http:// or https://";
      if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail.trim())) errs.companyEmail = "Invalid email format.";
    }
    if (s === 2) {
      if (linkedinUrl && !/^https?:\/\/.+/.test(linkedinUrl.trim())) errs.linkedinUrl = "Must be a valid URL.";
      if (!agreedToTerms) errs.agreedToTerms = "You must agree to the terms.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      setError("");
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError("");
    setFieldErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/hr/register", {
        fullname: fullname.trim(),
        email: email.trim(),
        phoneNumber: phone.trim(),
        password,
        confirmPassword,
        designation: designation.trim(),
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim(),
        companyEmail: companyEmail.trim(),
        companyIndustry,
        companySize,
        companyAddress: companyAddress.trim(),
        companyCityState: companyCityState.trim(),
        companyCountry: companyCountry.trim(),
        companyRegistrationInfo: companyRegistrationInfo.trim(),
        linkedinUrl: linkedinUrl.trim(),
        hrAccessReason: hrAccessReason.trim(),
        agreedToTerms,
      });

      if (res.data?.success) {
        setSuccess(true);
      } else {
        setError(res.data?.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: T.font, padding: 20 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            maxWidth: 520,
            width: "100%",
            background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: "48px 36px",
            textAlign: "center",
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            style={{ width: 72, height: 72, borderRadius: "50%", background: T.greenDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}
          >
            <CheckCircle2 size={36} color={T.green} />
          </motion.div>
          <h2 style={{ fontFamily: T.serif, fontSize: "1.5rem", color: T.text, margin: "0 0 12px" }}>Registration Submitted!</h2>
          <p style={{ color: T.textMid, fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 28px" }}>
            Your HR registration has been submitted successfully. Your account is awaiting admin verification. You will be able to post jobs once your account is approved.
          </p>
          <button
            onClick={onBack}
            style={{
              padding: "12px 28px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #7c6af7, #a090ff)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "0.88rem",
              fontWeight: 600,
              fontFamily: T.font,
            }}
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  const sectionStyle = {
    maxWidth: 580,
    width: "100%",
    background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
    border: `1px solid ${T.border}`,
    borderRadius: 20,
    padding: "36px 32px",
    boxShadow: isDark ? "none" : "0 8px 32px rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      {/* Navbar */}
      <nav style={{ borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, zIndex: 100, background: T.bg }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", height: 60 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontFamily: T.font, padding: "6px 10px", borderRadius: 8, transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = T.text}
            onMouseLeave={e => e.currentTarget.style.color = T.textMid}
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

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px 60px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, rgba(124,106,247,0.2), rgba(74,222,128,0.15))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Building2 size={26} color={T.purple} />
          </div>
          <h1 style={{ fontFamily: T.serif, fontSize: "1.75rem", color: T.text, margin: "0 0 8px" }}>HR / Recruiter Registration</h1>
          <p style={{ fontSize: "0.88rem", color: T.textMid, margin: 0 }}>Complete your profile to start posting jobs on JobSphere</p>
        </div>

        <StepIndicator steps={STEPS} current={step} />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, color: T.red, fontSize: "0.85rem" }}
          >
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}

        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} style={sectionStyle}>
          {step === 0 && (
            <>
              <h3 style={{ fontSize: "1.05rem", color: T.text, fontWeight: 600, marginTop: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <User size={18} color={T.purple} /> Personal Information
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Full Name" required error={fieldErrors.fullname}>
                  <StyledInput icon={<User size={15} />} placeholder="John Doe" value={fullname} onChange={setFullname} />
                </Field>
                <Field label="Work Email" required error={fieldErrors.email}>
                  <StyledInput icon={<Mail size={15} />} type="email" placeholder="john@company.com" value={email} onChange={setEmail} />
                </Field>
                <Field label="Phone Number" required error={fieldErrors.phone}>
                  <StyledInput icon={<Phone size={15} />} placeholder="+91 98765 43210" value={phone} onChange={setPhone} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Password" required error={fieldErrors.password}>
                    <PasswordInput placeholder="Min 6 characters" value={password} onChange={setPassword} />
                  </Field>
                  <Field label="Confirm Password" required error={fieldErrors.confirmPassword}>
                    <PasswordInput placeholder="Re-enter password" value={confirmPassword} onChange={setConfirmPassword} />
                  </Field>
                </div>
                <Field label="Designation / Job Title" required error={fieldErrors.designation}>
                  <StyledInput icon={<Briefcase size={15} />} placeholder="HR Manager" value={designation} onChange={setDesignation} />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 style={{ fontSize: "1.05rem", color: T.text, fontWeight: 600, marginTop: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <Building2 size={18} color={T.purple} /> Company Information
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Company Name" required error={fieldErrors.companyName}>
                  <StyledInput icon={<Building2 size={15} />} placeholder="Acme Corporation" value={companyName} onChange={setCompanyName} />
                </Field>
                <Field label="Company Website" error={fieldErrors.companyWebsite} hint="Optional">
                  <StyledInput icon={<Globe size={15} />} placeholder="https://acme.com" value={companyWebsite} onChange={setCompanyWebsite} />
                </Field>
                <Field label="Company Email" error={fieldErrors.companyEmail} hint="If different from work email">
                  <StyledInput icon={<Mail size={15} />} type="email" placeholder="hr@acme.com" value={companyEmail} onChange={setCompanyEmail} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Industry">
                    <StyledSelect icon={<Briefcase size={15} />} value={companyIndustry} onChange={setCompanyIndustry}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.filter(Boolean).map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </StyledSelect>
                  </Field>
                  <Field label="Company Size">
                    <StyledSelect icon={<User size={15} />} value={companySize} onChange={setCompanySize}>
                      <option value="">Select size</option>
                      {COMPANY_SIZES.filter(Boolean).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </StyledSelect>
                  </Field>
                </div>
                <Field label="Company Address">
                  <StyledInput icon={<MapPin size={15} />} placeholder="123 Business Park, Suite 100" value={companyAddress} onChange={setCompanyAddress} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="City, State">
                    <StyledInput icon={<MapPin size={15} />} placeholder="Mumbai, Maharashtra" value={companyCityState} onChange={setCompanyCityState} />
                  </Field>
                  <Field label="Country">
                    <StyledInput icon={<Globe size={15} />} placeholder="India" value={companyCountry} onChange={setCompanyCountry} />
                  </Field>
                </div>
                <Field label="Company Registration / CIN" hint="Optional verification info">
                  <StyledInput icon={<FileText size={15} />} placeholder="U12345MH2020PTC123456" value={companyRegistrationInfo} onChange={setCompanyRegistrationInfo} />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 style={{ fontSize: "1.05rem", color: T.text, fontWeight: 600, marginTop: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={18} color={T.purple} /> Additional Information
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="LinkedIn Profile URL" error={fieldErrors.linkedinUrl} hint="Optional">
                  <StyledInput icon={<ExternalLink size={15} />} placeholder="https://linkedin.com/in/johndoe" value={linkedinUrl} onChange={setLinkedinUrl} />
                </Field>
                <Field label="Reason for Requesting HR Access" hint="Tell us how you plan to use the platform">
                  <textarea
                    value={hrAccessReason}
                    onChange={(e) => setHrAccessReason(e.target.value)}
                    placeholder="We're expanding our team and looking to hire 15+ engineers and designers this quarter..."
                    rows={4}
                    style={{
                      width: "100%",
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: T.text,
                      fontSize: "0.88rem",
                      outline: "none",
                      fontFamily: T.font,
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                </Field>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: "pointer",
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: agreedToTerms ? T.purpleDim : T.surface,
                    border: `1px solid ${fieldErrors.agreedToTerms ? T.red : (agreedToTerms ? T.purple + "44" : T.border)}`,
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    style={{ marginTop: 3, accentColor: T.purple }}
                  />
                  <span style={{ fontSize: "0.82rem", color: T.textMid, lineHeight: 1.5 }}>
                    I agree to the <strong style={{ color: T.purpleL }}>Terms of Service</strong> and <strong style={{ color: T.purpleL }}>Privacy Policy</strong>. I confirm that the information provided is accurate.
                  </span>
                </label>
                {fieldErrors.agreedToTerms && (
                  <span style={{ fontSize: "0.72rem", color: T.red, marginTop: -8 }}>{fieldErrors.agreedToTerms}</span>
                )}
              </div>
            </>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            {step > 0 ? (
              <button
                onClick={prevStep}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  color: T.textMid,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontFamily: T.font,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <div />
            )}
            {step < 2 ? (
              <button
                onClick={nextStep}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #7c6af7, #a090ff)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  fontFamily: T.font,
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  background: loading ? T.textDim : "linear-gradient(135deg, #4ade80, #16a34a)",
                  color: "#fff",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  fontFamily: T.font,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {loading ? <><Loader2 size={14} className="spin" /> Submitting...</> : <><Shield size={14} /> Submit Registration</>}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
