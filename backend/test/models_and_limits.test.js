import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";
import { User } from "../models/user.model.js";
import { rateLimit } from "../middlewares/rateLimitMiddleware.js";

describe("Database Schema & Indexes Verification", () => {
  test("Application model schema defines unique compound index on (job, applicant)", () => {
    const indexes = Application.schema.indexes();
    const hasJobApplicantIndex = indexes.some(([fields, options]) => {
      return fields.job === 1 && fields.applicant === 1 && options?.unique === true;
    });

    assert.equal(
      hasJobApplicantIndex,
      true,
      "Application schema must define unique compound index on { job: 1, applicant: 1 } to prevent duplicate applications"
    );
  });

  test("Job model schema defines performance indexes", () => {
    const indexes = Job.schema.indexes();
    const indexedFields = indexes.map(([fields]) => Object.keys(fields)[0]);

    assert.ok(indexedFields.includes("location"), "Job schema should index location");
    assert.ok(indexedFields.includes("created_by"), "Job schema should index created_by");
    assert.ok(indexedFields.includes("company"), "Job schema should index company");
    assert.ok(indexedFields.includes("createdAt"), "Job schema should index createdAt");
  });

  test("User model schema defines unique index on email", () => {
    const emailProp = User.schema.path("email");
    assert.equal(emailProp.options.required, true);
    assert.equal(emailProp.options.unique, true);
  });

  test("Rate limiter middleware blocks excessive requests", () => {
    const limiter = rateLimit({ windowMs: 1000, max: 2 });
    let passedCount = 0;
    let blockedCount = 0;

    const dummyRes = {
      setHeader() {},
      status(code) {
        if (code === 429) blockedCount++;
        return this;
      },
      json() {
        return this;
      },
    };

    const dummyReq = {
      headers: { "x-forwarded-for": "192.168.1.100" },
      socket: {},
    };

    const next = () => passedCount++;

    limiter(dummyReq, dummyRes, next); // Hit 1 -> Pass
    limiter(dummyReq, dummyRes, next); // Hit 2 -> Pass
    limiter(dummyReq, dummyRes, next); // Hit 3 -> Blocked (429)

    assert.equal(passedCount, 2, "First 2 requests should pass");
    assert.equal(blockedCount, 1, "3rd request should be rate-limited (429)");
  });
});
