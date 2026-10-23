import crypto from "crypto";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/** Normalizes whitespace and newlines in extracted text. */
export function normalizeText(raw = "") {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Computes SHA256 hash from normalized resume text. */
export function computeResumeHash(text = "") {
  const normalized = normalizeText(text).toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/** Extracts readable text from resume buffer (PDF, DOCX, TXT, MD). */
export async function extractResumeText(fileBuffer, originalName = "", mimeType = "") {
  if (!fileBuffer || (!Buffer.isBuffer(fileBuffer) && !(fileBuffer instanceof Uint8Array))) {
    throw new Error("Invalid resume buffer provided.");
  }

  if (fileBuffer.length === 0) {
    throw new Error("Uploaded resume file is empty.");
  }

  const ext = (originalName || "").toLowerCase();
  const isDocx = ext.endsWith(".docx") || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isPdfHeader = fileBuffer.slice(0, 5).toString("utf-8").startsWith("%PDF");
  const isPdfExtension = ext.endsWith(".pdf");
  const isPdfMime = mimeType === "application/pdf";
  const isPdf = isPdfHeader || isPdfExtension || isPdfMime;
  const isTxt = ext.endsWith(".txt") || ext.endsWith(".md") || (mimeType && mimeType.startsWith("text/"));

  if (!isDocx && !isPdf && !isTxt) {
    throw new Error("Unsupported resume file format. Only PDF (.pdf) and Word (.docx) documents are supported.");
  }

  let rawText = "";

  if (isDocx) {
    try {
      const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
      rawText = docxResult?.value || "";
    } catch (docxErr) {
      throw new Error(`Failed to parse DOCX resume: ${docxErr.message || "Invalid or corrupt DOCX file."}`);
    }
  } else if (isPdf) {
    try {
      const parser = new PDFParse({ data: fileBuffer });
      const textResult = await parser.getText();
      rawText = textResult?.text || "";
    } catch (pdfErr) {
      // Fallback UTF-8 decoding
      const fallbackText = fileBuffer.toString("utf-8");
      if (fallbackText && /[a-zA-Z]{3,}/.test(fallbackText)) {
        rawText = fallbackText;
      } else {
        throw new Error(`Failed to parse PDF resume: ${pdfErr.message || "Invalid or encrypted PDF"}`);
      }
    }
  } else {
    rawText = fileBuffer.toString("utf-8");
  }

  const text = normalizeText(rawText);

  if (!text || text.length < 50) {
    throw new Error("Resume content is insufficient or could not be extracted (minimum 50 characters required). If using a scanned PDF, please provide a text-based PDF or text document.");
  }

  const words = text.split(/\s+/).filter(Boolean);
  const hash = computeResumeHash(text);

  return {
    text,
    hash,
    wordCount: words.length,
    charCount: text.length
  };
}
