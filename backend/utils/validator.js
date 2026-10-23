/** Request validation and sanitization helpers. */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  return trimmed.length > 3 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
};

export const isValidPassword = (password) => {
  return typeof password === "string" && password.trim().length >= 6;
};

export const isValidRole = (role) => {
  return role === "student" || role === "recruiter";
};

export const isValidApplicationStatus = (status) => {
  if (typeof status !== "string") return false;
  const s = status.toLowerCase().trim();
  return ["pending", "accepted", "rejected"].includes(s);
};

export const sanitizeString = (val, maxLen = 500) => {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, maxLen);
};

/** Filters object to allowlisted fields only. */
export const pickAllowedFields = (obj, allowedKeys = []) => {
  if (!obj || typeof obj !== "object") return {};
  const clean = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  }
  return clean;
};
