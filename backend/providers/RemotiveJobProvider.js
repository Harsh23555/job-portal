/**
 * RemotiveJobProvider — fetches remote jobs from the Remotive public API.
 * API docs: https://remotive.com/api/remote-jobs
 * No API key required for basic access. Rate limiting applies.
 */
import axios from "axios";
import { JobProvider } from "./ExternalJobProvider.js";

const BASE_URL = "https://remotive.com/api/remote-jobs";
const TIMEOUT_MS = 15_000;

// Category mapping for Remotive's category query param
const CATEGORY_KEYWORDS = {
  developer: "software-dev",
  engineer: "software-dev",
  "data analyst": "data",
  "data scientist": "data",
  designer: "design",
  "product manager": "product",
  marketing: "marketing",
  finance: "finance",
  sales: "sales",
  devops: "devops-sysadmin",
};

function deriveCategory(keyword) {
  const lower = (keyword || "").toLowerCase();
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(kw)) return cat;
  }
  return null;
}

export class RemotiveJobProvider extends JobProvider {
  get providerName() {
    return "remotive";
  }

  get displayName() {
    return "Remotive";
  }

  get termsNote() {
    return "Remotive offers a public REST API. Jobs are explicitly remote. Redistribution for non-commercial aggregator use is permitted when attribution is given. Verify your use-case against https://remotive.com/api.";
  }

  /** Remotive API requires no credentials — always configured if enabled. */
  isConfigured() {
    const enabled = process.env.REMOTIVE_ENABLED;
    if (enabled === undefined || enabled === null) return true; // default on
    return enabled !== "false" && enabled !== "0";
  }

  checkSourceAccess() {
    return {
      allowed: true,
      reason: "Remotive public API is freely available. Commercial redistribution should confirm current ToS.",
    };
  }

  getSourceStatus() {
    return {
      name: this.providerName,
      displayName: this.displayName,
      status: this.isConfigured() ? "active" : "disabled",
      configured: this.isConfigured(),
      reason: this.isConfigured() ? null : "Remotive is disabled via REMOTIVE_ENABLED=false.",
      termsNote: this.termsNote,
    };
  }

  /**
   * Searches Remotive jobs by keyword (mapped to category when possible).
   * @param {{ keyword?: string, location?: string, page?: number, pageSize?: number }} params
   */
  async searchJobs({ keyword = "", location = "", page = 1, pageSize = 20 } = {}) {
    if (!this.isConfigured()) {
      console.warn("[REMOTIVE] Provider is disabled (REMOTIVE_ENABLED=false).");
      return [];
    }

    try {
      const params = { limit: Math.min(pageSize * page, 100) };
      const category = deriveCategory(keyword);
      if (category) {
        params.category = category;
      }
      if (keyword && !category) {
        params.search = keyword;
      }
      if (location) {
        params.location = location;
      }

      const response = await axios.get(BASE_URL, {
        params,
        timeout: TIMEOUT_MS,
        headers: { Accept: "application/json" },
      });

      const jobs = response.data?.jobs;
      if (!Array.isArray(jobs)) {
        console.warn("[REMOTIVE] Unexpected response shape — no jobs array.");
        return [];
      }

      // Apply client-side pagination (Remotive API doesn't paginate)
      const start = (page - 1) * pageSize;
      const slice = jobs.slice(start, start + pageSize);

      return slice.map((raw) => this.normalizeJob(raw)).filter(Boolean);
    } catch (error) {
      return this.handleError(error, "searchJobs");
    }
  }

  /** Normalizes a raw Remotive job to the shared NormalizedJob schema. */
  normalizeJob(raw) {
    if (!raw || !raw.id) return null;

    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1_000); // 60 days

    const skills = [];
    if (raw.tags && Array.isArray(raw.tags)) {
      skills.push(...raw.tags.slice(0, 10));
    }

    const title = (raw.title || "").trim();
    const companyName = (raw.company_name || "").trim();
    const location = raw.candidate_required_location || "Remote";
    const description = this._stripHtml(raw.description || "");

    const jobType = this._normalizeJobType(raw.job_type);
    const postedAt = raw.publication_date ? new Date(raw.publication_date) : null;

    const normalized = {
      provider: "remotive",
      externalId: String(raw.id),
      externalUrl: raw.url || "",
      title,
      description: description.slice(0, 5000), // cap at 5KB
      companyName,
      location,
      locationRaw: raw.candidate_required_location || "",
      isRemote: true, // Remotive only lists remote jobs
      jobType,
      category: raw.category || "",
      skills,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "",
      salaryDisplay: raw.salary || "",
      postedAt,
      importedAt: new Date(),
      expiresAt,
    };

    const validation = this.validateJob(normalized);
    if (!validation.valid) {
      console.warn(`[REMOTIVE] Skipping invalid job ${raw.id}: ${validation.errors.join(", ")}`);
      return null;
    }

    return normalized;
  }

  /** Strips basic HTML tags from Remotive's HTML description. */
  _stripHtml(html) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  _normalizeJobType(jobType) {
    if (!jobType) return "full-time";
    const t = jobType.toLowerCase();
    if (t.includes("contract")) return "contract";
    if (t.includes("part")) return "part-time";
    if (t.includes("freelance")) return "freelance";
    return "full-time";
  }
}

export default RemotiveJobProvider;
