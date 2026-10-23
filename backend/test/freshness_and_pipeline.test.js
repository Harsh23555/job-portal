import test from "node:test";
import assert from "node:assert/strict";
import { parsePublicationDate, formatRelativeTime } from "../utils/dateParser.js";
import { deduplicateJobs, cleanUrl } from "../services/jobDeduplicator.js";
import { AdzunaJobProvider } from "../providers/AdzunaJobProvider.js";
import { JoobleJobProvider } from "../providers/JoobleJobProvider.js";

test("Date Parser & Freshness Normalization", async (t) => {
  await t.test("parses ISO 8601 strings accurately", () => {
    const iso = "2026-10-03T11:18:59Z";
    const parsed = parsePublicationDate(iso);
    assert.ok(parsed instanceof Date);
    assert.equal(parsed.toISOString(), "2026-10-03T11:18:59.000Z");
  });

  await t.test("parses Unix timestamps in seconds and milliseconds", () => {
    const seconds = 1725555555;
    const ms = 1725555555000;
    const parsedSec = parsePublicationDate(seconds);
    const parsedMs = parsePublicationDate(ms);

    assert.ok(parsedSec instanceof Date);
    assert.ok(parsedMs instanceof Date);
    assert.equal(parsedSec.getTime(), parsedMs.getTime());
  });

  await t.test("parses relative dates properly", () => {
    const today = parsePublicationDate("today");
    const yesterday = parsePublicationDate("yesterday");
    const daysAgo = parsePublicationDate("3 days ago");
    const hoursAgo = parsePublicationDate("5 hours ago");

    assert.ok(today instanceof Date);
    assert.ok(yesterday instanceof Date);
    assert.ok(daysAgo instanceof Date);
    assert.ok(hoursAgo instanceof Date);

    assert.ok(today.getTime() > yesterday.getTime());
    assert.ok(yesterday.getTime() > daysAgo.getTime());
  });

  await t.test("never fabricates dates for null, undefined, empty, or invalid input", () => {
    assert.equal(parsePublicationDate(null), null);
    assert.equal(parsePublicationDate(undefined), null);
    assert.equal(parsePublicationDate(""), null);
    assert.equal(parsePublicationDate("invalid-date-string-xyz"), null);
    assert.equal(parsePublicationDate(-500), null);
  });

  await t.test("formatRelativeTime formats valid dates and returns null without fabrication", () => {
    const now = new Date();
    assert.equal(formatRelativeTime(now), "Just now");

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    assert.equal(formatRelativeTime(twoHoursAgo), "2h ago");

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    assert.equal(formatRelativeTime(twoDaysAgo), "2d ago");

    // Null or invalid returns null
    assert.equal(formatRelativeTime(null), null);
    assert.equal(formatRelativeTime("invalid-date"), null);
  });
});

test("Job Deduplication and URL Cleaning", async (t) => {
  await t.test("cleanUrl strips tracking and UTM parameters", () => {
    const raw = "https://example.com/jobs/123?utm_source=adzuna&utm_medium=feed&ref=tracker#apply";
    const cleaned = cleanUrl(raw);
    assert.equal(cleaned, "https://example.com/jobs/123");
  });

  await t.test("deduplicateJobs removes duplicate provider IDs", () => {
    const list = [
      { provider: "adzuna", externalId: "101", title: "Software Engineer", companyName: "Acme", location: "Pune" },
      { provider: "adzuna", externalId: "101", title: "Software Engineer - duplicate", companyName: "Acme", location: "Pune" },
      { provider: "adzuna", externalId: "102", title: "Frontend Developer", companyName: "Acme", location: "Pune" },
    ];
    const deduped = deduplicateJobs(list);
    assert.equal(deduped.length, 2);
    assert.equal(deduped[0].externalId, "101");
    assert.equal(deduped[1].externalId, "102");
  });

  await t.test("deduplicateJobs removes duplicates across providers with matching canonical URLs", () => {
    const list = [
      { provider: "adzuna", externalId: "101", externalUrl: "https://careers.company.com/job/dev?utm_source=adzuna", title: "Dev", companyName: "Co" },
      { provider: "jooble", externalId: "999", externalUrl: "https://careers.company.com/job/dev?utm_campaign=jooble", title: "Dev", companyName: "Co" },
    ];
    const deduped = deduplicateJobs(list);
    assert.equal(deduped.length, 1);
  });
});

test("Job Providers Dynamic Configuration", async (t) => {
  await t.test("Adzuna and Jooble providers dynamically read process.env without stale caching", () => {
    const adzuna = new AdzunaJobProvider();
    const jooble = new JoobleJobProvider();

    // Dynamic getters check
    const origAppId = process.env.ADZUNA_APP_ID;
    const origJoobleKey = process.env.JOOBLE_API_KEY;

    try {
      process.env.ADZUNA_APP_ID = "test_app_id_123";
      assert.equal(adzuna.appId, "test_app_id_123");

      process.env.JOOBLE_API_KEY = "test_jooble_key_456";
      assert.equal(jooble.apiKey, "test_jooble_key_456");
      assert.equal(jooble.isConfigured(), true);
    } finally {
      process.env.ADZUNA_APP_ID = origAppId;
      process.env.JOOBLE_API_KEY = origJoobleKey;
    }
  });
});

test("Freshness Sorting Priority", async (t) => {
  await t.test("sorts listings with newest publication date first", () => {
    const jobs = [
      { title: "Old Job", postedAt: new Date("2026-09-01T10:00:00Z"), createdAt: new Date("2026-09-01T10:00:00Z") },
      { title: "Brand New Job", postedAt: new Date("2026-10-03T11:00:00Z"), createdAt: new Date("2026-10-03T11:00:00Z") },
      { title: "Yesterday Job", postedAt: new Date("2026-10-02T10:00:00Z"), createdAt: new Date("2026-10-02T10:00:00Z") },
    ];

    jobs.sort((a, b) => {
      const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return timeB - timeA;
    });

    assert.equal(jobs[0].title, "Brand New Job");
    assert.equal(jobs[1].title, "Yesterday Job");
    assert.equal(jobs[2].title, "Old Job");
  });
});
