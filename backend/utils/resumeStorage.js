import fs from "fs";
import path from "path";
import crypto from "crypto";

const DEFAULT_STORAGE_DIR = path.resolve(process.cwd(), "storage", "resumes");
export const STORAGE_DIR = process.env.RESUME_STORAGE_DIR
  ? path.resolve(process.env.RESUME_STORAGE_DIR)
  : DEFAULT_STORAGE_DIR;

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt"]);

/** Validates file extension and MIME type. */
export function isValidResumeFileType(originalName = "", mimeType = "") {
  const ext = path.extname(originalName || "").toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(mimeType);
}

/** Sanitizes filename to prevent injection. */
export function sanitizeResumeFilename(originalName = "resume.pdf") {
  const base = path.basename(originalName || "resume.pdf");
  const cleaned = base
    .replace(/[\x00-\x1F\x7F/\\?%*:|"<>]/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim();
  return cleaned.slice(0, 150) || "resume.pdf";
}

/** Saves buffer to private storage under UUID filename. */
export async function saveResumeFile(buffer, originalName = "resume.pdf", mimeType = "application/pdf") {
  if (!buffer || !Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
    throw new Error("Invalid resume buffer provided.");
  }
  if (buffer.length === 0) throw new Error("Uploaded resume file is empty.");
  if (buffer.length > 5 * 1024 * 1024) throw new Error("Resume is too large. Maximum allowed size is 5 MB.");

  const safeOriginalName = sanitizeResumeFilename(originalName);
  const ext = path.extname(safeOriginalName).toLowerCase() || ".pdf";

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Resume must be a PDF, DOC, DOCX, or TXT file.");
  }

  const fileId = crypto.randomUUID();
  const storageKey = `${fileId}${ext}`;
  const targetPath = path.resolve(STORAGE_DIR, storageKey);

  // Path traversal guard
  if (!targetPath.startsWith(STORAGE_DIR)) {
    throw new Error("Security violation: path traversal detected during save.");
  }

  await fs.promises.writeFile(targetPath, buffer);

  return { fileId, storageKey, originalName: safeOriginalName, mimeType, size: buffer.length, uploadedAt: new Date() };
}

/** Resolves and validates file path with path traversal protection. */
export function getResumeFilePath(storageKey) {
  if (!storageKey || typeof storageKey !== "string") throw new Error("Invalid resume storage key.");

  const normalizedKey = path.basename(storageKey);
  const resolved = path.resolve(STORAGE_DIR, normalizedKey);

  if (!resolved.startsWith(STORAGE_DIR)) {
    throw new Error("Security violation: path traversal detected.");
  }

  if (!fs.existsSync(resolved)) {
    const err = new Error("Resume file not found.");
    err.code = "ENOENT";
    throw err;
  }

  return resolved;
}

/** Deletes resume file safely. */
export async function deleteResumeFile(storageKey) {
  try {
    if (!storageKey) return false;
    const safePath = getResumeFilePath(storageKey);
    await fs.promises.unlink(safePath);
    return true;
  } catch (err) {
    if (err.code !== "ENOENT") console.warn("[resumeStorage] Warning unlinking resume file:", err.message);
    return false;
  }
}

/** Streams resume file to HTTP response. */
export function streamResumeFile(res, { storageKey, originalName, mimeType, download = false }) {
  const filePath = getResumeFilePath(storageKey);
  const safeName = sanitizeResumeFilename(originalName || "resume.pdf");
  const dispositionType = download ? "attachment" : "inline";

  res.setHeader("Content-Type", mimeType || "application/pdf");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Disposition",
    `${dispositionType}; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
  );

  const readStream = fs.createReadStream(filePath);
  readStream.on("error", (err) => {
    console.error("[streamResumeFile error]:", err);
    if (!res.headersSent) res.status(500).json({ success: false, message: "Error reading resume file." });
  });

  readStream.pipe(res);
}
