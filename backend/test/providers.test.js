/**
 * Provider Tests
 * Tests for AdzunaJobProvider, JoobleJobProvider, RemotiveJobProvider,
 * and LinkedInJobProvider using mocked HTTP responses and credential stubs.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ─── Base Provider Interface Tests ────────────────────────────────────────────

import { JobProvider } from "../providers/ExternalJobProvider.js";

describe("ExternalJobProvider — base class interface", () => {
  test("validateJob returns valid for fully populated job", () => {
    const provider = new JobProvider();
    const job = {
      title: "Software Engineer",
      externalId: "abc123",
      externalUrl: "https://example.com/job/1",
      provider: "test",
    };
    const { valid, errors } = provider.validateJob(job);
    assert.equal(valid, true);
    assert.deepEqual(errors, []);
  });

  test("validateJob returns errors for missing required fields", () => {
    const provider = new JobProvider();
    const { valid, errors } = provider.validateJob({});
    assert.equal(valid, false);
    assert.ok(errors.length > 0, "Should have validation errors");
    assert.ok(errors.some((e) => e.includes("title")));
    assert.ok(errors.some((e) => e.includes("externalId")));
    assert.ok(errors.some((e) => e.includes("externalUrl")));
    assert.ok(errors.some((e) => e.includes("provider")));
  });

  test("validateJob rejects non-string title", () => {
    const provider = new JobProvider();
    const { valid, errors } = provider.validateJob({
      title: 42, // invalid
      externalId: "id1",
      externalUrl: "https://example.com",
      provider: "test",
    });
    assert.equal(valid, false);
    assert.ok(errors.some((e) => e.includes("title")));
  });

  test("checkSourceAccess returns allowed=true by default", () => {
    const provider = new JobProvider();
    const result = provider.checkSourceAccess();
    assert.equal(result.allowed, true);
    assert.equal(result.reason, null);
  });

  test("handleRateLimit returns 60s default when no Retry-After header", () => {
    class TestProvider extends JobProvider {
      get providerName() { return "test"; }
      isConfigured() { return true; }
      normalizeJob(j) { return j; }
    }
    const provider = new TestProvider();
    const delay = provider.handleRateLimit({});
    assert.equal(delay, 60_000);
  });

  test("handleRateLimit respects Retry-After header", () => {
    class TestProvider extends JobProvider {
      get providerName() { return "test"; }
      isConfigured() { return true; }
      normalizeJob(j) { return j; }
    }
    const provider = new TestProvider();
    const delay = provider.handleRateLimit({ "retry-after": "30" });
    assert.equal(delay, 30_000);
  });

  test("getSourceStatus reflects isConfigured state", () => {
    class ConfiguredProvider extends JobProvider {
      get providerName() { return "myprovider"; }
      get displayName() { return "My Provider"; }
      isConfigured() { return true; }
      normalizeJob(j) { return j; }
    }
    const status = new ConfiguredProvider().getSourceStatus();
    assert.equal(status.status, "active");
    assert.equal(status.configured, true);
    assert.equal(status.name, "myprovider");

    class UnconfiguredProvider extends JobProvider {
      get providerName() { return "empty"; }
      get displayName() { return "Empty Provider"; }
      isConfigured() { return false; }
      normalizeJob(j) { return j; }
    }
    const status2 = new UnconfiguredProvider().getSourceStatus();
    assert.equal(status2.status, "unconfigured");
    assert.equal(status2.configured, false);
  });
});

// ─── AdzunaJobProvider Tests ──────────────────────────────────────────────────

import { AdzunaJobProvider } from "../providers/AdzunaJobProvider.js";

describe("AdzunaJobProvider", () => {
  test("isConfigured returns false when env vars are missing", () => {
    const provider = new AdzunaJobProvider();
    provider.appId = "";
    provider.appKey = "";
    assert.equal(provider.isConfigured(), false);
  });

  test("isConfigured returns true when both credentials are set", () => {
    const provider = new AdzunaJobProvider();
    provider.appId = "test_id";
    provider.appKey = "test_key";
    assert.equal(provider.isConfigured(), true);
  });

  test("searchJobs returns [] when unconfigured", async () => {
    const provider = new AdzunaJobProvider();
    provider.appId = "";
    provider.appKey = "";
    const result = await provider.searchJobs({ keyword: "developer" });
    assert.deepEqual(result, []);
  });

  test("normalizeJob maps raw Adzuna job to standard schema", () => {
    const provider = new AdzunaJobProvider();
    provider.appId = "test";
    provider.appKey = "test";

    const rawJob = {
      id: "12345",
      title: "Senior React Developer",
      description: "<p>We need a <b>React</b> developer</p>",
      redirect_url: "https://www.adzuna.com/jobs/details/12345",
      company: { display_name: "Acme Corp" },
      location: { display_name: "Bangalore, India" },
      contract_time: "full_time",
      salary_min: 800000,
      salary_max: 1200000,
      created: "2025-01-15T00:00:00Z",
    };

    const normalized = provider.normalizeJob(rawJob);

    assert.equal(normalized.provider, "adzuna");
    assert.equal(normalized.externalId, "12345");
    assert.equal(normalized.title, "Senior React Developer");
    assert.equal(normalized.companyName, "Acme Corp");
    assert.ok(normalized.externalUrl.includes("12345"));
    assert.ok(Array.isArray(normalized.skills));
    // Description should have HTML stripped
    assert.ok(!normalized.description.includes("<p>") && !normalized.description.includes("<b>"));
  });

  test("handleRateLimit sets internal cooldown", async () => {
    const provider = new AdzunaJobProvider();
    provider.appId = "test";
    provider.appKey = "test";
    // Manually set rate-limit state
    provider._rateLimitedUntil = Date.now() + 60_000;
    const result = await provider.searchJobs({ keyword: "developer" });
    assert.deepEqual(result, [], "Should return empty array during rate-limit cooldown");
  });
});

// ─── RemotiveJobProvider Tests ────────────────────────────────────────────────

import { RemotiveJobProvider } from "../providers/RemotiveJobProvider.js";

describe("RemotiveJobProvider", () => {
  test("providerName is 'remotive'", () => {
    assert.equal(new RemotiveJobProvider().providerName, "remotive");
  });

  test("isConfigured returns true by default", () => {
    const orig = process.env.REMOTIVE_ENABLED;
    delete process.env.REMOTIVE_ENABLED;
    assert.equal(new RemotiveJobProvider().isConfigured(), true);
    process.env.REMOTIVE_ENABLED = orig;
  });

  test("isConfigured returns false when REMOTIVE_ENABLED=false", () => {
    process.env.REMOTIVE_ENABLED = "false";
    assert.equal(new RemotiveJobProvider().isConfigured(), false);
    delete process.env.REMOTIVE_ENABLED;
  });

  test("checkSourceAccess returns allowed=true", () => {
    const { allowed } = new RemotiveJobProvider().checkSourceAccess();
    assert.equal(allowed, true);
  });

  test("getSourceStatus returns active when enabled", () => {
    process.env.REMOTIVE_ENABLED = "true";
    const status = new RemotiveJobProvider().getSourceStatus();
    assert.equal(status.status, "active");
    assert.equal(status.configured, true);
    delete process.env.REMOTIVE_ENABLED;
  });

  test("normalizeJob returns null for jobs without id", () => {
    const provider = new RemotiveJobProvider();
    const result = provider.normalizeJob({ title: "Engineer" }); // no id
    assert.equal(result, null);
  });

  test("normalizeJob maps raw job correctly", () => {
    const provider = new RemotiveJobProvider();
    const raw = {
      id: 9001,
      title: "Remote Node.js Developer",
      url: "https://remotive.com/remote-jobs/software-dev/9001",
      company_name: "Remote Corp",
      candidate_required_location: "Worldwide",
      description: "<p>Build APIs with <b>Node.js</b></p>",
      job_type: "full_time",
      tags: ["node.js", "javascript", "express"],
      publication_date: "2025-01-10T12:00:00Z",
      salary: "$80k - $120k",
      category: "Software Development",
    };

    const normalized = provider.normalizeJob(raw);
    assert.ok(normalized !== null);
    assert.equal(normalized.provider, "remotive");
    assert.equal(normalized.externalId, "9001");
    assert.equal(normalized.isRemote, true, "All Remotive jobs should be remote");
    assert.ok(!normalized.description.includes("<p>"), "HTML should be stripped");
    assert.ok(normalized.skills.includes("node.js"));
  });

  test("searchJobs returns [] when disabled", async () => {
    process.env.REMOTIVE_ENABLED = "false";
    const provider = new RemotiveJobProvider();
    const result = await provider.searchJobs({ keyword: "developer" });
    assert.deepEqual(result, []);
    delete process.env.REMOTIVE_ENABLED;
  });
});

// ─── LinkedInJobProvider Tests ────────────────────────────────────────────────

import LinkedInJobProvider from "../providers/LinkedInJobProvider.js";

describe("LinkedInJobProvider (stub)", () => {
  test("providerName is 'linkedin'", () => {
    assert.equal(new LinkedInJobProvider().providerName, "linkedin");
  });

  test("isConfigured always returns false", () => {
    assert.equal(new LinkedInJobProvider().isConfigured(), false);
  });

  test("checkSourceAccess returns allowed=false", () => {
    const result = new LinkedInJobProvider().checkSourceAccess();
    assert.equal(result.allowed, false);
    assert.ok(result.reason && result.reason.length > 0);
  });

  test("getSourceStatus always returns unavailable", () => {
    const status = new LinkedInJobProvider().getSourceStatus();
    assert.equal(status.status, "unavailable");
    assert.equal(status.configured, false);
    assert.ok(status.reason && status.reason.includes("No authorized"));
  });

  test("searchJobs always returns empty array", async () => {
    const result = await new LinkedInJobProvider().searchJobs({ keyword: "anything" });
    assert.deepEqual(result, []);
  });

  test("normalizeJob always returns null", () => {
    const result = new LinkedInJobProvider().normalizeJob({ id: "x", title: "Test" });
    assert.equal(result, null);
  });

  test("termsNote explains unavailability", () => {
    const note = new LinkedInJobProvider().termsNote;
    assert.ok(typeof note === "string" && note.length > 20);
    assert.ok(note.toLowerCase().includes("linkedin") || note.toLowerCase().includes("scraping"));
  });
});

// ─── Duplicate Detection Tests ────────────────────────────────────────────────

import { deduplicateJobs, cleanUrl, normalizeCompany } from "../services/jobDeduplicator.js";

describe("Job Deduplicator — in-memory deduplication", () => {
  test("deduplicateJobs removes duplicate by provider+externalId", () => {
    const jobs = [
      { provider: "adzuna", externalId: "abc", title: "Dev", externalUrl: "", location: "Delhi", companyName: "Acme" },
      { provider: "adzuna", externalId: "abc", title: "Dev", externalUrl: "", location: "Delhi", companyName: "Acme" },
    ];
    const result = deduplicateJobs(jobs);
    assert.equal(result.length, 1, "Should deduplicate identical provider+id pair");
  });

  test("deduplicateJobs removes duplicate by canonical URL", () => {
    const jobs = [
      { provider: "a", externalId: "1", externalUrl: "https://example.com/job/1?utm_source=google", title: "Eng" },
      { provider: "b", externalId: "2", externalUrl: "https://example.com/job/1?utm_medium=email", title: "Eng" },
    ];
    const result = deduplicateJobs(jobs);
    assert.equal(result.length, 1, "Same canonical URL after stripping params = duplicate");
  });

  test("deduplicateJobs keeps distinct jobs", () => {
    const jobs = [
      { provider: "adzuna", externalId: "1", title: "Frontend Dev", externalUrl: "https://example.com/a", companyName: "A", location: "Mumbai" },
      { provider: "adzuna", externalId: "2", title: "Backend Dev", externalUrl: "https://example.com/b", companyName: "B", location: "Delhi" },
    ];
    const result = deduplicateJobs(jobs);
    assert.equal(result.length, 2, "Different jobs should both be kept");
  });

  test("deduplicateJobs handles empty array", () => {
    assert.deepEqual(deduplicateJobs([]), []);
  });

  test("cleanUrl strips UTM params and hash", () => {
    const url = "https://example.com/jobs/123?utm_source=google&utm_medium=cpc#apply";
    const cleaned = cleanUrl(url);
    assert.ok(!cleaned.includes("utm_source"), "Should strip utm_source");
    assert.ok(!cleaned.includes("#apply"), "Should strip hash");
    assert.ok(cleaned.includes("example.com/jobs/123"));
  });

  test("normalizeCompany strips common legal suffixes", () => {
    assert.equal(normalizeCompany("Acme Corp"), normalizeCompany("Acme Corporation"));
    assert.equal(normalizeCompany("Tech Solutions Pvt Ltd"), normalizeCompany("Tech Solutions Private Limited"));
  });
});
