/**
 * LinkedInJobProvider — STUB ONLY.
 *
 * LinkedIn does not offer a public job-search API for third-party aggregators.
 * The previously available Partner API requires official LinkedIn partnership,
 * which is not available for general-purpose job aggregators.
 *
 * This stub exists to:
 *  1. Document the unavailability clearly in the admin dashboard.
 *  2. Keep the provider registry consistent.
 *  3. Make the status visible in GET /api/v1/external-jobs/sources.
 *
 * DO NOT implement scraping or unofficial API access here.
 */
import { JobProvider } from "./ExternalJobProvider.js";

export class LinkedInJobProvider extends JobProvider {
  get providerName() {
    return "linkedin";
  }

  get displayName() {
    return "LinkedIn";
  }

  get termsNote() {
    return "LinkedIn does not offer an authorized public job-search API for third-party aggregators. Scraping is prohibited by LinkedIn ToS. This integration is permanently unavailable until official API access is granted.";
  }

  /** Always unconfigured — no legitimate access method exists. */
  isConfigured() {
    return false;
  }

  /** Always denies access — no authorized API available. */
  checkSourceAccess() {
    return {
      allowed: false,
      reason: "No authorized public job-search API is available from LinkedIn for third-party aggregators.",
    };
  }

  getSourceStatus() {
    return {
      name: this.providerName,
      displayName: this.displayName,
      status: "unavailable",
      configured: false,
      reason: "LinkedIn does not offer a public job-search API. No authorized access method is available.",
      termsNote: this.termsNote,
    };
  }

  /** Never returns jobs. */
  async searchJobs() {
    console.warn("[LINKEDIN] Integration is permanently unavailable. No job search performed.");
    return [];
  }

  normalizeJob() {
    return null;
  }
}

export default LinkedInJobProvider;
