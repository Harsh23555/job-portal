import test from "node:test";
import assert from "node:assert/strict";
import { parsePublicationDate, formatRelativeTime } from "../src/utils/dateParser.js";
import { deduplicateFrontendJobs } from "../src/utils/jobDeduplicator.js";
import { formatSalaryDisplay, getJobNumericSalary } from "../src/utils/currency.js";

test("dateParser: parses ISO dates accurately without fabricating", () => {
  const d = parsePublicationDate("2026-10-03T10:00:00Z");
  assert.ok(d instanceof Date);
  assert.equal(isNaN(d.getTime()), false);
});

test("dateParser: parses Unix timestamps (seconds & ms)", () => {
  const secondsDate = parsePublicationDate(1728000000);
  assert.ok(secondsDate instanceof Date);

  const msDate = parsePublicationDate(1728000000000);
  assert.ok(msDate instanceof Date);
});

test("dateParser: handles missing, null, or invalid dates honestly", () => {
  assert.equal(parsePublicationDate(null), null);
  assert.equal(parsePublicationDate(undefined), null);
  assert.equal(parsePublicationDate(""), null);
  assert.equal(parsePublicationDate("invalid-date-string-xyz"), null);
  assert.equal(formatRelativeTime(null, "Recently posted"), "Recently posted");
  assert.equal(formatRelativeTime("invalid-date", "Recently posted"), "Recently posted");
});

test("deduplicateFrontendJobs: prevents duplicates by id", () => {
  const jobs = [
    { _id: "1", title: "Frontend Engineer", company: "Company A" },
    { _id: "1", title: "Frontend Engineer", company: "Company A" },
    { _id: "2", title: "Backend Engineer", company: "Company B" },
  ];
  const result = deduplicateFrontendJobs(jobs);
  assert.equal(result.length, 2);
  assert.equal(result[0]._id, "1");
  assert.equal(result[1]._id, "2");
});

test("deduplicateFrontendJobs: cleans UTM parameters and deduplicates canonical URLs", () => {
  const jobs = [
    { _id: "10", title: "DevOps", company: "Co A", externalUrl: "https://example.com/job/123?utm_source=adzuna&ref=123" },
    { _id: "20", title: "DevOps", company: "Co A", externalUrl: "https://example.com/job/123?utm_medium=cpc" },
  ];
  const result = deduplicateFrontendJobs(jobs);
  assert.equal(result.length, 1);
});

test("deduplicateFrontendJobs: deduplicates identical title + company + location fingerprints", () => {
  const jobs = [
    { _id: "100", title: "Senior React Developer", company: "Acme Corp", location: "Bengaluru" },
    { _id: "200", title: "Senior React Developer", company: { name: "Acme Corp" }, location: "Bengaluru" },
  ];
  const result = deduplicateFrontendJobs(jobs);
  assert.equal(result.length, 1);
});

test("currency utils: formatSalaryDisplay handles numeric and string values", () => {
  assert.equal(formatSalaryDisplay(1200000), "₹12L / yr");
  assert.equal(formatSalaryDisplay("₹15L – ₹25L / yr"), "₹15L – ₹25L / yr");
  assert.equal(getJobNumericSalary({ salary: 2500000 }), 2500000);
});

test("API service: exports configured axios instance with withCredentials", async () => {
  const { default: API, getCsrfToken } = await import("../src/services/api.js");
  assert.ok(API, "API instance should exist");
  assert.equal(API.defaults.withCredentials, true, "withCredentials must be true for session & CSRF cookies");
  assert.equal(typeof getCsrfToken, "function", "getCsrfToken must be exported as a function");
});

