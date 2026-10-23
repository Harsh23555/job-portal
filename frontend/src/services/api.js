import axios from "axios";

const rawApiUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_URL) ||
  "http://localhost:8000";
const cleanBaseUrl = rawApiUrl.replace(/\/+$/, "");

const API = axios.create({
  baseURL: cleanBaseUrl.endsWith("/api/v1") ? cleanBaseUrl : `${cleanBaseUrl}/api/v1`,
  withCredentials: true, // Cookie auth and CSRF support
});

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

let cachedCsrfToken = null;
let csrfFetchPromise = null;

/** Reads csrf_token cookie. */
function readCsrfCookie() {
  try {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** Retrieves valid CSRF token. */
export async function getCsrfToken(forceRefresh = false) {
  if (!forceRefresh) {
    if (cachedCsrfToken) return cachedCsrfToken;
    const cookieToken = readCsrfCookie();
    if (cookieToken) {
      cachedCsrfToken = cookieToken;
      return cachedCsrfToken;
    }
  }

  if (csrfFetchPromise) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = API.get("/user/csrf-token", {
    _skipCsrf: true,
  })
    .then((res) => {
      const token = res.data?.csrfToken || res.headers?.["x-csrf-token"];
      if (token) {
        cachedCsrfToken = token;
      }
      return cachedCsrfToken;
    })
    .catch((err) => {
      console.warn("[CSRF] Failed to fetch CSRF token:", err?.message || err);
      return cachedCsrfToken;
    })
    .finally(() => {
      csrfFetchPromise = null;
    });

  return csrfFetchPromise;
}

// Request interceptor: attach bearer token and CSRF header
API.interceptors.request.use(
  async (config) => {
    // Bearer Token
    try {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignore storage error
    }

    // CSRF header
    const method = (config.method || "get").toLowerCase();
    if (MUTATING_METHODS.has(method) && !config._skipCsrf) {
      let csrf = cachedCsrfToken || readCsrfCookie();
      if (!csrf) {
        csrf = await getCsrfToken();
      }
      if (csrf) {
        config.headers["x-csrf-token"] = csrf;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: sync CSRF and handle auth expiration
API.interceptors.response.use(
  (response) => {
    const newCsrf = response.headers?.["x-csrf-token"];
    if (newCsrf) {
      cachedCsrfToken = newCsrf;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Retry once on CSRF 403
    if (
      error.response &&
      error.response.status === 403 &&
      originalRequest &&
      !originalRequest._retryCsrf &&
      typeof error.response.data?.message === "string" &&
      error.response.data.message.toLowerCase().includes("csrf")
    ) {
      originalRequest._retryCsrf = true;
      cachedCsrfToken = null;
      const freshToken = await getCsrfToken(true);
      if (freshToken) {
        originalRequest.headers["x-csrf-token"] = freshToken;
        return API(originalRequest);
      }
    }

    // Handle 401 unauthenticated
    if (error.response && error.response.status === 401) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch (e) {
        // Ignore
      }
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    }

    return Promise.reject(error);
  }
);

// Pre-fetch CSRF token on startup
if (typeof window !== "undefined") {
  getCsrfToken().catch(() => {});
}

export default API;
