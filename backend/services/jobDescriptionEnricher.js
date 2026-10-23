import axios from "axios";
import { ExternalJob } from "../models/externalJob.model.js";

/** Cleans HTML tags while preserving line breaks and formatting. */
function htmlToCleanText(html = "") {
  if (!html) return "";
  return html
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Attempts to fetch the full job description from the provider page (e.g. Adzuna details page JSON-LD).
 * @param {Object} job - ExternalJob document or plain object
 * @returns {Promise<string|null>} - Full description text if found, or null
 */
export async function enrichJobDescription(job) {
  if (!job || !job.externalUrl) return null;

  try {
    const res = await axios.get(job.externalUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 8000,
      maxRedirects: 5,
    });

    const html = typeof res.data === "string" ? res.data : "";
    if (!html) return null;

    // 1. Try finding application/ld+json with JobPosting description
    const scriptRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const data = Array.isArray(parsed) ? parsed[0] : parsed;
        if (data && data.description && data.description.length > (job.description?.length || 0)) {
          const cleanText = htmlToCleanText(data.description);
          if (cleanText.length > 200) {
            // Update in DB if job has an _id
            if (job._id) {
              await ExternalJob.findByIdAndUpdate(job._id, { description: cleanText });
            }
            return cleanText;
          }
        }
      } catch {
        // Skip malformed JSON
      }
    }

    // 2. Fallback: Check for common job description HTML containers
    const containerRegexes = [
      /<section[^>]*class=["'][^"']*adp-body[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
      /<div[^>]*class=["'][^"']*(?:job-description|job__description|description)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const regex of containerRegexes) {
      const containerMatch = html.match(regex);
      if (containerMatch && containerMatch[1]) {
        const cleanText = htmlToCleanText(containerMatch[1]);
        if (cleanText.length > (job.description?.length || 0) + 100) {
          if (job._id) {
            await ExternalJob.findByIdAndUpdate(job._id, { description: cleanText });
          }
          return cleanText;
        }
      }
    }
  } catch (err) {
    // Silent fail on network/page errors
    console.warn(`[enrichJobDescription] Failed for ${job.title || job._id}:`, err.message);
  }

  return null;
}
