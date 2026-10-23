import axios from "axios";
import { JobProvider } from "./ExternalJobProvider.js";
import { extractSkills } from "../utils/skillExtractor.js";
import { convertUSDToINR, formatSalaryRangeINR } from "../utils/currency.js";
import { parsePublicationDate } from "../utils/dateParser.js";

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 2_000;
const JOB_TTL_DAYS = 60;

/** Strips HTML tags and unescapes entities. */
function cleanText(str = "") {
  if (!str) return "";
  return str
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** Maps contract time/type to standard jobType. */
function mapJobType(result) {
  const time = (result.contract_time || "").toLowerCase();
  const type = (result.contract_type || "").toLowerCase();
  if (time === "full_time" || type === "permanent") return "Full-Time";
  if (time === "part_time") return "Part-Time";
  if (type === "contract") return "Contract";
  return result.contract_time || result.contract_type || "Full-Time";
}

/** Detects remote keywords in job details. */
function detectRemote(result) {
  const text = `${result.title || ""} ${result.description || ""} ${
    result.location?.display_name || ""
  }`.toLowerCase();
  return (
    text.includes("remote") ||
    text.includes("work from home") ||
    text.includes("wfh") ||
    text.includes("hybrid")
  );
}

/** Normalizes raw Adzuna job to standard schema. */
function normalizeAdzunaJob(result, currency = "INR") {
  const rawMin = result.salary_min ? Math.round(result.salary_min) : null;
  const rawMax = result.salary_max ? Math.round(result.salary_max) : null;

  let salaryMin = rawMin;
  let salaryMax = rawMax;
  let salaryCurrency = "INR";

  if ((currency || "").toUpperCase() === "USD") {
    salaryMin = convertUSDToINR(rawMin);
    salaryMax = convertUSDToINR(rawMax);
  }

  const salaryDisplay = formatSalaryRangeINR(salaryMin, salaryMax, "INR");

  const locationDisplay =
    result.location?.display_name ||
    (Array.isArray(result.location?.area)
      ? result.location.area.join(", ")
      : typeof result.location?.area === "string"
      ? result.location.area
      : "") ||
    "India";

  const cleanDescription = cleanText(result.description || "");
  const title = cleanText(result.title || "");
  const companyName = cleanText(result.company?.display_name || "");
  const combinedText = `${title} ${cleanDescription} ${result.category?.label || ""}`;
  const skills = extractSkills(combinedText);

  const postedAt = parsePublicationDate(result.created);
  const importedAt = new Date();
  const refreshedAt = new Date();
  const expiresAt = new Date(Date.now() + JOB_TTL_DAYS * 24 * 60 * 60 * 1_000);

  return {
    provider: "adzuna",
    source: "adzuna",
    externalId: String(result.id),
    external_id: String(result.id),
    externalUrl: result.redirect_url,
    apply_url: result.redirect_url,
    source_url: result.redirect_url,
    title,
    description: cleanDescription,
    companyName,
    company: companyName,
    location: locationDisplay,
    locationRaw: locationDisplay,
    isRemote: detectRemote(result),
    jobType: mapJobType(result),
    job_type: mapJobType(result),
    category: result.category?.label || "Engineering",
    skills,
    salaryMin,
    salary_min: salaryMin,
    salaryMax,
    salary_max: salaryMax,
    salaryCurrency,
    salary_currency: salaryCurrency,
    salaryDisplay,
    postedAt,
    posted_date: postedAt,
    importedAt,
    fetched_at: importedAt,
    refreshedAt,
    refreshed_at: refreshedAt,
    expiresAt,
  };
}

export class AdzunaJobProvider extends JobProvider {
  constructor() {
    super();
    this._rateLimitedUntil = 0;
  }

  get appId() {
    if (this._appId !== undefined) return this._appId || "";
    return process.env.ADZUNA_APP_ID || "";
  }
  set appId(val) {
    this._appId = val;
  }

  get appKey() {
    if (this._appKey !== undefined) return this._appKey || "";
    return process.env.ADZUNA_APP_KEY || "";
  }
  set appKey(val) {
    this._appKey = val;
  }

  get country() {
    if (this._country !== undefined) return this._country || "in";
    return process.env.ADZUNA_COUNTRY || "in";
  }
  set country(val) {
    this._country = val;
  }

  get currency() {
    return this.country === "in" ? "INR" : "USD";
  }

  get providerName() {
    return "adzuna";
  }

  isConfigured() {
    return Boolean(this.appId && this.appKey);
  }

  /** Searches jobs via Adzuna API. */
  async searchJobs({ keyword = "developer", location = "", page = 1, pageSize = 20, sortBy = "date", maxDaysOld = 30 } = {}) {
    if (!this.isConfigured()) {
      console.warn("[Adzuna] ADZUNA_APP_ID or ADZUNA_APP_KEY not set — skipping fetch.");
      return [];
    }

    if (Date.now() < this._rateLimitedUntil) {
      const waitSeconds = Math.ceil((this._rateLimitedUntil - Date.now()) / 1000);
      console.warn(`[Adzuna] Rate-limit cooldown active. Skipping request (${waitSeconds}s remaining).`);
      return [];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(pageSize) || 20));
    const url = `${ADZUNA_BASE_URL}/${this.country}/search/${pageNum}`;

    const params = {
      app_id: this.appId,
      app_key: this.appKey,
      results_per_page: limitNum,
      what: keyword || "developer",
      sort_by: sortBy || "date",
      max_days_old: maxDaysOld || 30,
    };
    if (location && location.trim()) {
      params.where = location.trim();
    }

    console.log(`[Adzuna] Request started: country=${this.country} what="${params.what}" where="${params.where || "all"}" sort_by=${params.sort_by} page=${pageNum}`);

    return this._fetchWithRetry(url, params);
  }

  /** Normalizes a single raw job. */
  normalizeJob(rawJob) {
    return normalizeAdzunaJob(rawJob, this.currency);
  }

  /** Internal HTTP execution with retry on failure. */
  async _fetchWithRetry(url, params, attempt = 1) {
    try {
      const response = await axios.get(url, {
        params,
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Accept: "application/json" },
      });

      console.log(`[Adzuna] Response: ${response.status}`);
      const rawResults = response.data?.results || [];
      console.log(`[Adzuna] Jobs received: ${rawResults.length}`);

      const normalized = rawResults.map((r) => this.normalizeJob(r));
      console.log(`[Adzuna] Jobs normalized: ${normalized.length}`);

      return normalized;
    } catch (error) {
      const status = error.response?.status;
      const code = error.code;

      if (status === 429) {
        console.warn("[Adzuna] Rate-limited (429). Setting 60-second cooldown.");
        this._rateLimitedUntil = Date.now() + 60_000;
        return [];
      }

      if (status === 401 || status === 403) {
        console.error(`[Adzuna] Authentication failed (${status}). Check ADZUNA_APP_ID and ADZUNA_APP_KEY.`);
        return [];
      }

      // Retry once on 5xx or network drop
      if (attempt === 1 && (status >= 500 || code === "ECONNABORTED" || code === "ECONNRESET" || code === "ETIMEDOUT")) {
        console.warn(`[Adzuna] Transient error (${status || code}). Retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this._fetchWithRetry(url, params, 2);
      }

      return this.handleError(error, "fetchJobs");
    }
  }
}
