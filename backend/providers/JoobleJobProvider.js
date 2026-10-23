import axios from "axios";
import { JobProvider } from "./ExternalJobProvider.js";
import { extractSkills } from "../utils/skillExtractor.js";
import { convertUSDToINR, formatSalaryRangeINR } from "../utils/currency.js";
import { parsePublicationDate } from "../utils/dateParser.js";

const DEFAULT_JOOBLE_BASE_URL = "https://in.jooble.org/api";
const FALLBACK_JOOBLE_BASE_URL = "https://jooble.org/api";
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

/** Detects remote keywords in job text. */
function detectRemote(text = "") {
  const lower = text.toLowerCase();
  return (
    lower.includes("remote") ||
    lower.includes("work from home") ||
    lower.includes("wfh") ||
    lower.includes("hybrid")
  );
}

/** Parses salary numbers and currency from salary string. */
function parseSalary(salaryStr = "") {
  if (!salaryStr) return { salaryMin: null, salaryMax: null, currency: "INR" };
  const numbers = salaryStr
    .replace(/,/g, "")
    .match(/\d+/g)
    ?.map(Number) || [];

  let salaryMin = null;
  let salaryMax = null;

  if (numbers.length >= 2) {
    salaryMin = Math.min(numbers[0], numbers[1]);
    salaryMax = Math.max(numbers[0], numbers[1]);
  } else if (numbers.length === 1) {
    salaryMin = numbers[0];
  }

  let currency = "INR";
  if (salaryStr.includes("$")) currency = "USD";
  else if (salaryStr.includes("€")) currency = "EUR";
  else if (salaryStr.includes("£")) currency = "GBP";

  return { salaryMin, salaryMax, currency };
}

/** Maps Jooble employment type to standard jobType. */
function mapJobType(type = "") {
  const lower = type.toLowerCase();
  if (lower.includes("part")) return "Part-Time";
  if (lower.includes("contract") || lower.includes("freelance")) return "Contract";
  if (lower.includes("intern")) return "Internship";
  return "Full-Time";
}

/** Normalizes raw Jooble job item to standard schema. */
function normalizeJoobleJob(item) {
  const cleanTitle = cleanText(item.title || "");
  const cleanSnippet = cleanText(item.snippet || "");
  const cleanCompany = cleanText(item.company || "");
  const cleanLocation = cleanText(item.location || "India");

  const combinedText = `${cleanTitle} ${cleanSnippet} ${cleanCompany}`;
  const skills = extractSkills(combinedText);
  const { salaryMin: rawMin, salaryMax: rawMax, currency: rawCurrency } = parseSalary(item.salary || "");

  let salaryMin = rawMin;
  let salaryMax = rawMax;
  let salaryCurrency = "INR";

  if (rawCurrency === "USD") {
    salaryMin = convertUSDToINR(rawMin);
    salaryMax = convertUSDToINR(rawMax);
  }

  const salaryDisplay = formatSalaryRangeINR(salaryMin, salaryMax, "INR", item.salary || "");

  const postedAt = parsePublicationDate(item.updated);
  const importedAt = new Date();
  const refreshedAt = new Date();
  const expiresAt = new Date(Date.now() + JOB_TTL_DAYS * 24 * 60 * 60 * 1_000);

  return {
    provider: "jooble",
    source: "jooble",
    externalId: String(item.id),
    external_id: String(item.id),
    externalUrl: item.link || "",
    apply_url: item.link || "",
    source_url: item.link || "",
    title: cleanTitle,
    description: cleanSnippet,
    companyName: cleanCompany,
    company: cleanCompany,
    location: cleanLocation,
    locationRaw: item.location || "",
    isRemote: detectRemote(combinedText),
    jobType: mapJobType(item.type || ""),
    job_type: mapJobType(item.type || ""),
    category: item.source || "Engineering",
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

export class JoobleJobProvider extends JobProvider {
  constructor() {
    super();
    this._rateLimitedUntil = 0;
  }

  get apiKey() {
    if (this._apiKey !== undefined) return (this._apiKey || "").trim();
    return (process.env.JOOBLE_API_KEY || "").trim();
  }
  set apiKey(val) {
    this._apiKey = val;
  }

  get baseUrl() {
    if (this._baseUrl !== undefined) return this._baseUrl || DEFAULT_JOOBLE_BASE_URL;
    return process.env.JOOBLE_BASE_URL || DEFAULT_JOOBLE_BASE_URL;
  }
  set baseUrl(val) {
    this._baseUrl = val;
  }

  get providerName() {
    return "jooble";
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /** Searches jobs via Jooble REST API. */
  async searchJobs({ keyword = "developer", location = "", page = 1, pageSize = 20 } = {}) {
    if (!this.isConfigured()) {
      console.warn("[Jooble] JOOBLE_API_KEY not configured — skipping fetch.");
      return [];
    }

    if (Date.now() < this._rateLimitedUntil) {
      const waitSeconds = Math.ceil((this._rateLimitedUntil - Date.now()) / 1000);
      console.warn(`[Jooble] Rate-limit cooldown active. Skipping request (${waitSeconds}s remaining).`);
      return [];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(pageSize) || 20));

    const payload = {
      keywords: keyword || "developer",
      location: location && location.trim() ? location.trim() : "India",
      page: pageNum,
      ResultOnPage: limitNum,
      companysearch: false,
    };

    const targetUrl = `${this.baseUrl.replace(/\/+$/, "")}/${this.apiKey}`;
    console.log(`[Jooble] Request started: keywords="${payload.keywords}" location="${payload.location}" page=${pageNum}`);

    return this._fetchWithRetry(targetUrl, payload);
  }

  normalizeJob(rawJob) {
    return normalizeJoobleJob(rawJob);
  }

  async _fetchWithRetry(url, payload, attempt = 1) {
    try {
      const response = await axios.post(url, payload, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log(`[Jooble] Response: ${response.status}`);
      const rawJobs = response.data?.jobs || [];
      console.log(`[Jooble] Jobs received: ${rawJobs.length}`);

      const normalized = rawJobs.map((j) => this.normalizeJob(j));
      console.log(`[Jooble] Jobs normalized: ${normalized.length}`);

      return normalized;
    } catch (error) {
      const status = error.response?.status;
      const code = error.code;

      if (status === 403) {
        console.error("[Jooble] Authentication failed (403). Check JOOBLE_API_KEY.");
        return [];
      }

      if (status === 429) {
        console.warn("[Jooble] Rate limit exceeded (429). Setting 60-second cooldown.");
        this._rateLimitedUntil = Date.now() + 60_000;
        return [];
      }

      // Fallback endpoint if regional domain fails
      if (attempt === 1 && url.includes("in.jooble.org") && (status === 404 || code === "ENOTFOUND")) {
        const fallbackUrl = `${FALLBACK_JOOBLE_BASE_URL}/${this.apiKey}`;
        console.warn(`[Jooble] Regional host failed (${status || code}). Retrying on standard host: ${fallbackUrl}`);
        return this._fetchWithRetry(fallbackUrl, payload, 2);
      }

      // Retry once on transient 5xx or connection abort
      if (attempt === 1 && (status >= 500 || code === "ECONNABORTED" || code === "ETIMEDOUT")) {
        console.warn(`[Jooble] Transient error (${status || code}). Retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return this._fetchWithRetry(url, payload, 2);
      }

      return this.handleError(error, "searchJobs");
    }
  }
}
