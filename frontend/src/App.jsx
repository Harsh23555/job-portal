import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { JobPortalPublic } from "./JobPortal";
import { JobPortalAuth } from "./JobPortalAuth";
import { JobPortalApplicantView } from "./JobPortalApplicantView";
import { JobPortalRecruiterView } from "./JobPortalRecruiterView";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import API from "./services/api";
import { ErrorBoundary } from "./components/ErrorBoundary";

function AppContent() {
  const { T } = useTheme();
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [appMode, setAppMode] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) {
        const u = JSON.parse(saved);
        return u.role === "student" ? "applicant" : "recruiter";
      }
      if (sessionStorage.getItem("pending_apply_url")) {
        return "portal-auth";
      }
    } catch {
      // Ignore parse error
    }
    return "portal";
  });

  const [authInitialMode, setAuthInitialMode] = useState("login");
  const [pendingJob, setPendingJob] = useState(null); // job selected by unauthenticated user

  // Handle session expiry from API interceptor
  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      setAppMode("portal");
    };
    window.addEventListener("auth:session-expired", onSessionExpired);
    return () => window.removeEventListener("auth:session-expired", onSessionExpired);
  }, []);

  // Restore user session
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");

    if (!savedUser && savedToken) {
      API.get("/user/me")
        .then((res) => {
          if (res.data?.success && res.data?.user) {
            const u = res.data.user;
            localStorage.setItem("user", JSON.stringify(u));
            setUser(u);
            setAppMode(u.role === "student" ? "applicant" : "recruiter");

            const pendingUrl = sessionStorage.getItem("pending_apply_url");
            if (pendingUrl && /^https?:\/\//i.test(pendingUrl)) {
              sessionStorage.removeItem("pending_apply_url");
              setTimeout(() => {
                const opened = window.open(pendingUrl, "_blank", "noopener,noreferrer");
                if (!opened) window.location.href = pendingUrl;
              }, 100);
            }
          }
        })
        .catch(() => {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        });
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await API.post("/user/logout").catch(() => API.get("/user/logout"));
    } catch (err) {
      console.error("Logout error:", err);
    }
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("pending_apply_url");
    setUser(null);
    setAppMode("portal");
  };

  const handleApplyExternalJob = (url, job) => {
    if (!url || !/^https?:\/\//i.test(url)) return;
    const currentUser = user || (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null);
    if (currentUser) {
      window.open(url, "_blank", "noopener,noreferrer") || (window.location.href = url);
      return;
    }
    try {
      sessionStorage.setItem("pending_apply_url", url);
    } catch (e) {
      console.error("Failed to set pending_apply_url in sessionStorage", e);
    }
    setPendingJob(job || null);
    setAuthInitialMode("login");
    setAppMode("portal-auth");
  };

  const handleAuthSuccess = (userData, token) => {
    localStorage.setItem("user", JSON.stringify(userData));
    if (token) {
      localStorage.setItem("token", token);
    }
    setUser(userData);
    setAppMode(userData.role === "student" ? "applicant" : "recruiter");

    const pendingUrl = sessionStorage.getItem("pending_apply_url");
    if (pendingUrl && /^https?:\/\//i.test(pendingUrl)) {
      sessionStorage.removeItem("pending_apply_url");
      setTimeout(() => {
        const opened = window.open(pendingUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          window.location.href = pendingUrl;
        }
      }, 100);
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1057421115865-dummyclientid.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div
        style={{
          background: T.bg,
          color: T.text,
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          transition: "background-color 0.2s ease, color 0.15s ease",
        }}
      >
        <AnimatePresence mode="wait">
          {appMode === "portal" && (
            <motion.div
              key="portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              style={{ width: "100%", minHeight: "100vh" }}
            >
              <JobPortalPublic
                onAuthClick={(mode) => {
                  setAuthInitialMode(mode);
                  setPendingJob(null);
                  sessionStorage.removeItem("pending_apply_url");
                  setAppMode("portal-auth");
                }}
                onSignInForJob={(job) => {
                  setPendingJob(job);
                  setAuthInitialMode("login");
                  setAppMode("portal-auth");
                }}
                onApplyExternalJob={handleApplyExternalJob}
              />
            </motion.div>
          )}

          {appMode === "portal-auth" && (
            <motion.div
              key="portal-auth"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              style={{ width: "100%", minHeight: "100vh" }}
            >
              <JobPortalAuth
                initialMode={authInitialMode}
                onSuccess={(userData, token) => handleAuthSuccess(userData, token)}
                onBack={() => {
                  sessionStorage.removeItem("pending_apply_url");
                  setAppMode("portal");
                }}
              />
            </motion.div>
          )}

          {appMode === "applicant" && (
            <motion.div
              key="applicant"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}
            >
              <JobPortalApplicantView
                onSignOut={handleSignOut}
                initialJobId={pendingJob?._id || null}
                onJobConsumed={() => setPendingJob(null)}
              />
            </motion.div>
          )}

          {appMode === "recruiter" && (
            <motion.div
              key="recruiter"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}
            >
              <JobPortalRecruiterView onSignOut={handleSignOut} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GoogleOAuthProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
