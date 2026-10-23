/** Abstract base interface for external job providers. */
export class JobProvider {
  /** Provider identifier (e.g. "adzuna", "jooble"). */
  get providerName() {
    throw new Error(`${this.constructor.name} must implement get providerName()`);
  }

  /** Human-readable display name for the provider. */
  get displayName() {
    return this.providerName;
  }

  /** Terms note shown on admin dashboard. */
  get termsNote() {
    return null;
  }

  /** Checks if provider credentials are configured in environment. */
  isConfigured() {
    throw new Error(`${this.constructor.name} must implement isConfigured()`);
  }

  /** Searches jobs from external provider. */
  async searchJobs({ keyword = "", location = "", page = 1, pageSize = 20 } = {}) {
    throw new Error(`${this.constructor.name} must implement searchJobs()`);
  }

  /** Alias for searchJobs. */
  async fetchJobs(params) {
    return this.searchJobs(params);
  }

  /** Normalizes raw provider job to standard schema. */
  normalizeJob(rawJob) {
    throw new Error(`${this.constructor.name} must implement normalizeJob()`);
  }

  /**
   * Validates a normalized job object against required fields.
   * Returns { valid: boolean, errors: string[] }
   */
  validateJob(normalizedJob) {
    const errors = [];
    if (!normalizedJob.title || typeof normalizedJob.title !== "string") {
      errors.push("Missing or invalid field: title");
    }
    if (!normalizedJob.externalId || typeof normalizedJob.externalId !== "string") {
      errors.push("Missing or invalid field: externalId");
    }
    if (!normalizedJob.externalUrl || typeof normalizedJob.externalUrl !== "string") {
      errors.push("Missing or invalid field: externalUrl");
    }
    if (!normalizedJob.provider || typeof normalizedJob.provider !== "string") {
      errors.push("Missing or invalid field: provider");
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Checks whether the integration is allowed per provider Terms of Service.
   * Returns { allowed: boolean, reason: string|null }
   * Override in providers that have known restrictions.
   */
  checkSourceAccess() {
    return { allowed: true, reason: null };
  }

  /**
   * Returns current health/status of this provider.
   * @returns {{ name: string, status: string, configured: boolean, reason: string|null, termsNote: string|null }}
   */
  getSourceStatus() {
    const configured = this.isConfigured();
    return {
      name: this.providerName,
      displayName: this.displayName,
      status: configured ? "active" : "unconfigured",
      configured,
      reason: configured ? null : `${this.displayName} API credentials are not set in environment.`,
      termsNote: this.termsNote,
    };
  }

  /**
   * Called when a 429 rate-limit response is received.
   * Returns the recommended delay in milliseconds before retrying.
   * @param {object} [headers] - Response headers
   * @returns {number} delay in ms
   */
  handleRateLimit(headers = {}) {
    const name = this.providerName.toUpperCase();
    const retryAfterSec = parseInt(headers["retry-after"], 10);
    const delayMs = !isNaN(retryAfterSec) && retryAfterSec > 0
      ? retryAfterSec * 1000
      : 60_000; // default 60s if no header
    console.warn(`[${name}] Rate limit hit (429). Suggested retry delay: ${Math.round(delayMs / 1000)}s.`);
    return delayMs;
  }

  /** Handles provider errors with formatted logging. */
  handleError(error, context = "fetch") {
    const status = error.response?.status;
    const name = this.providerName.toUpperCase();

    if (status === 401 || status === 403) {
      console.error(`[${name}] Authentication failed (${status}). Check API credentials.`);
    } else if (status === 429) {
      this.handleRateLimit(error.response?.headers || {});
    } else if (status >= 500) {
      console.error(`[${name}] Remote server error (${status}) during ${context}.`);
    } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      console.warn(`[${name}] Request timed out during ${context}.`);
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      console.warn(`[${name}] Network unreachable (${error.code}).`);
    } else {
      console.error(`[${name}] Error during ${context}:`, error.message);
    }

    return [];
  }
}

// Backward-compatible alias
export const ExternalJobProvider = JobProvider;

/**
 * @typedef {Object} NormalizedJob
 * @property {string} provider
 * @property {string} externalId
 * @property {string} externalUrl
 * @property {string} title
 * @property {string} description
 * @property {string} companyName
 * @property {string} location
 * @property {boolean} isRemote
 * @property {string} jobType
 * @property {string[]} skills
 * @property {number|null} salaryMin
 * @property {number|null} salaryMax
 * @property {string} salaryCurrency
 * @property {string} salaryDisplay
 * @property {Date|null} postedAt
 * @property {Date} importedAt
 * @property {Date} expiresAt
 */
