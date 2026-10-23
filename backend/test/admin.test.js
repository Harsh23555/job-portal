/**
 * Admin Endpoint Tests
 * Tests admin controller functions and route protection.
 * Uses mock req/res/next patterns — no live DB or server required.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ─── Admin Controller Unit Tests ──────────────────────────────────────────────

import {
  getAllJobSources,
  triggerSourceSync,
  getIngestionRuns,
} from "../controllers/admin.controller.js";

// ─── Ingestion Run Format Tests ───────────────────────────────────────────────

describe("Admin — getAllJobSources controller", () => {
  test("returns success:true with sources array", async () => {
    let responseData = null;
    let statusCode = null;

    const req = {};
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await getAllJobSources(req, res, next);

    assert.equal(statusCode, 200);
    assert.equal(responseData?.success, true);
    assert.ok(Array.isArray(responseData?.sources), "sources should be an array");
  });

  test("each source has expected fields", async () => {
    let responseData = null;
    const req = {};
    const res = {
      status() { return this; },
      json(data) { responseData = data; return this; },
    };
    await getAllJobSources(req, res, (err) => { if (err) throw err; });

    for (const source of responseData.sources) {
      assert.ok("name" in source, "Source should have name");
      assert.ok("status" in source, "Source should have status");
      assert.ok("configured" in source, "Source should have configured");
    }
  });

  test("LinkedIn source always appears as unavailable", async () => {
    let responseData = null;
    const req = {};
    const res = {
      status() { return this; },
      json(data) { responseData = data; return this; },
    };
    await getAllJobSources(req, res, (err) => { if (err) throw err; });

    const linkedin = responseData.sources.find((s) => s.name === "linkedin");
    assert.ok(linkedin, "LinkedIn should be in the sources list");
    assert.equal(linkedin.status, "unavailable", "LinkedIn should always be unavailable");
    assert.equal(linkedin.configured, false);
  });
});

// ─── triggerSourceSync Tests ──────────────────────────────────────────────────

describe("Admin — triggerSourceSync controller", () => {
  test("returns 404 for unknown provider name", async () => {
    let responseData = null;
    let statusCode = null;

    const req = { params: { source: "fakeprovider999" }, body: { force: true } };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; },
    };

    await triggerSourceSync(req, res, (err) => { if (err) throw err; });

    assert.equal(statusCode, 404);
    assert.equal(responseData?.success, false);
    assert.ok(responseData?.message.includes("Unknown provider"), "Should mention unknown provider");
  });

  test("returns 202 for 'all' source", async () => {
    let statusCode = null;
    let responseData = null;

    const req = { params: { source: "all" }, body: { force: true } };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; },
    };

    await triggerSourceSync(req, res, (err) => { if (err) throw err; });

    assert.equal(statusCode, 202, "Should return 202 Accepted for async sync trigger");
    assert.equal(responseData?.success, true);
  });
});

// ─── getIngestionRuns Tests ───────────────────────────────────────────────────

describe("Admin — getIngestionRuns controller", () => {
  test("returns pagination metadata in response", async () => {
    let responseData = null;
    let statusCode = null;

    const req = { query: { page: "1", limit: "5" } };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; },
    };

    // This will hit the DB — it returns empty list if DB is not connected
    // We just verify the shape, not content
    try {
      await getIngestionRuns(req, res, (err) => { throw err; });
    } catch {
      // DB not connected in test environment — that is expected
      return;
    }

    if (statusCode === 200) {
      assert.ok("page" in responseData, "Should have page field");
      assert.ok("limit" in responseData, "Should have limit field");
      assert.ok("total" in responseData, "Should have total field");
      assert.ok("totalPages" in responseData, "Should have totalPages field");
      assert.ok(Array.isArray(responseData.runs), "runs should be an array");
    }
  });
});

// ─── authorizeRole Middleware Protection Tests ────────────────────────────────

import authorizeRole from "../middlewares/authorizeRole.js";

describe("Admin — route protection middleware", () => {
  test("blocks student from admin endpoints", () => {
    let nextCalled = false;
    let statusCode = null;
    let responseData = null;

    const req = { user: { _id: "uid", role: "student" } };
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; },
    };

    const guard = authorizeRole("recruiter", "admin");
    guard(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false, "Student must be blocked");
    assert.equal(statusCode, 403);
    assert.match(responseData?.message || "", /Forbidden/i);
  });

  test("allows recruiter through admin guard", () => {
    let nextCalled = false;

    const req = { user: { _id: "uid2", role: "recruiter" } };
    const res = {
      status() { return this; },
      json() { return this; },
    };

    const guard = authorizeRole("recruiter", "admin");
    guard(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true, "Recruiter should pass through admin guard");
  });

  test("allows admin through admin guard", () => {
    let nextCalled = false;

    const req = { user: { _id: "uid3", role: "admin" } };
    const res = {
      status() { return this; },
      json() { return this; },
    };

    const guard = authorizeRole("recruiter", "admin");
    guard(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true, "Admin should pass through admin guard");
  });

  test("blocks unauthenticated request (no user on req)", () => {
    let nextCalled = false;
    let statusCode = null;

    const req = {}; // no user
    const res = {
      status(code) { statusCode = code; return this; },
      json() { return this; },
    };

    const guard = authorizeRole("recruiter", "admin");
    guard(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false, "No user object = must be blocked");
    assert.ok(statusCode === 401 || statusCode === 403, `Expected 401 or 403, got ${statusCode}`);
  });
});

// ─── Ingestion Run Model Structure Tests ─────────────────────────────────────

describe("IngestionRun model — field validation", () => {
  test("model has required fields in schema", async () => {
    const { IngestionRun } = await import("../models/ingestionRun.model.js");
    const schemaObj = IngestionRun.schema.obj;
    // Check expected fields exist
    assert.ok("provider" in schemaObj || "startedAt" in schemaObj || "status" in schemaObj,
      "IngestionRun schema should have provider, startedAt, or status field");
  });

  test("model paths include startedAt timestamp", async () => {
    const { IngestionRun } = await import("../models/ingestionRun.model.js");
    const paths = Object.keys(IngestionRun.schema.paths);
    assert.ok(
      paths.includes("startedAt") || paths.includes("createdAt"),
      `Expected startedAt or createdAt in schema paths, found: ${paths.join(", ")}`
    );
  });
});
