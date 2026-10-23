import { test, describe } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";
import { login } from "../controllers/user.controller.js";
import { User } from "../models/user.model.js";

const TEST_SECRET = "test_super_secret_key_12345";
process.env.SECRET_KEY = TEST_SECRET;

describe("Authentication & RBAC Middleware Tests", () => {
  test("isAuthenticated rejects request with missing token", async () => {
    let nextCalled = false;
    let statusCode = null;
    let responseData = null;

    const req = {
      cookies: {},
      headers: {},
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    const next = () => {
      nextCalled = true;
    };

    await isAuthenticated(req, res, next);

    assert.equal(nextCalled, false, "next() should not be called when token is missing");
    assert.equal(statusCode, 401, "Status code should be 401");
    assert.equal(responseData?.success, false);
    assert.match(responseData?.message, /Authentication required/i);
  });

  test("isAuthenticated rejects crafted x-user-id header without valid token", async () => {
    let nextCalled = false;
    let statusCode = null;

    const req = {
      cookies: {},
      headers: {
        "x-user-id": "64f1a2b3c4d5e6f7a8b9c0d1",
      },
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    const next = () => {
      nextCalled = true;
    };

    await isAuthenticated(req, res, next);

    assert.equal(nextCalled, false, "Should never authenticate based on unverified x-user-id header");
    assert.equal(statusCode, 401);
  });

  test("isAuthenticated rejects invalid/tampered JWT signature", async () => {
    let nextCalled = false;
    let statusCode = null;

    const tamperedToken = jwt.sign({ userId: "12345" }, "wrong_secret_key");

    const req = {
      cookies: {},
      headers: {
        authorization: `Bearer ${tamperedToken}`,
      },
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    };

    await isAuthenticated(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(statusCode, 401);
  });

  test("authorizeRole blocks user with unauthorized role", () => {
    let nextCalled = false;
    let statusCode = null;
    let responseData = null;

    const req = {
      user: {
        _id: "user123",
        role: "student",
      },
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    const guard = authorizeRole("recruiter", "admin");
    guard(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, "Student should be blocked from recruiter-only action");
    assert.equal(statusCode, 403, "Status should be 403 Forbidden");
    assert.equal(responseData?.success, false);
    assert.match(responseData?.message, /Forbidden/i);
  });

  test("authorizeRole permits user with authorized role", () => {
    let nextCalled = false;

    const req = {
      user: {
        _id: "recruiter123",
        role: "recruiter",
      },
    };

    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      },
    };

    const guard = authorizeRole("recruiter", "admin");
    guard(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, "Recruiter should be permitted through recruiter-only action");
  });
});

import { setCsrfCookie, csrfProtection, generateCsrfToken } from "../middlewares/csrf.js";

describe("CSRF Protection Middleware Tests", () => {
  test("setCsrfCookie sets cookie and X-CSRF-Token header when missing", () => {
    let nextCalled = false;
    let cookieName = null;
    let cookieVal = null;
    let headerKey = null;
    let headerVal = null;

    const req = { cookies: {} };
    const res = {
      cookie(name, val) {
        cookieName = name;
        cookieVal = val;
      },
      setHeader(key, val) {
        headerKey = key;
        headerVal = val;
      },
    };

    setCsrfCookie(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(cookieName, "csrf_token");
    assert.ok(cookieVal && cookieVal.length > 20);
    assert.equal(headerKey, "X-CSRF-Token");
    assert.equal(headerVal, cookieVal);
    assert.equal(req.csrfToken, cookieVal);
  });

  test("csrfProtection allows safe GET/HEAD/OPTIONS methods without token", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      let nextCalled = false;
      const req = { method, headers: {}, cookies: {}, path: "/api/v1/job/get" };
      const res = {};
      csrfProtection(req, res, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true, `${method} should be allowed without token`);
    }
  });

  test("csrfProtection allows requests with Bearer Authorization token", () => {
    let nextCalled = false;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer some_valid_token" },
      cookies: {},
      path: "/api/v1/job/post",
    };
    const res = {};
    csrfProtection(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true, "Requests with Bearer auth should be exempt from CSRF");
  });

  test("csrfProtection allows mutating requests with valid double-submit token", () => {
    const validToken = generateCsrfToken();
    let nextCalled = false;
    const req = {
      method: "POST",
      headers: { "x-csrf-token": validToken },
      cookies: { csrf_token: validToken },
      path: "/api/v1/user/login",
    };
    const res = {};
    csrfProtection(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true, "Matching double-submit cookie and header should pass");
  });

  test("csrfProtection rejects mutating request with missing CSRF tokens from untrusted origin", () => {
    let nextCalled = false;
    let statusCode = null;
    let responseData = null;

    const req = {
      method: "POST",
      headers: { origin: "http://malicious-site.com" },
      cookies: {},
      path: "/api/v1/user/login",
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    csrfProtection(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, "Should block untrusted origin without tokens");
    assert.equal(statusCode, 403);
    assert.match(responseData?.message, /CSRF token missing/i);
  });

  test("csrfProtection rejects mutating request with mismatched CSRF token from untrusted origin", () => {
    let nextCalled = false;
    let statusCode = null;
    let responseData = null;

    const req = {
      method: "POST",
      headers: {
        origin: "http://evil-tracker.org",
        "x-csrf-token": generateCsrfToken(),
      },
      cookies: { csrf_token: generateCsrfToken() },
      path: "/api/v1/user/login",
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    csrfProtection(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, "Should block mismatched tokens");
    assert.equal(statusCode, 403);
    assert.match(responseData?.message, /CSRF token mismatch/i);
  });
});

describe("HR Recruiter Login Verification Gate", () => {
  const createMockRes = () => {
    let statusCode = null;
    let responseData = null;
    const cookiesSet = {};
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
      cookie(name, val, options) {
        cookiesSet[name] = { val, options };
        return this;
      },
    };
    return { res, getStatus: () => statusCode, getData: () => responseData, getCookies: () => cookiesSet };
  };

  test("recruiter with verificationStatus 'pending' is blocked from logging in with 403", async () => {
    const origFindOne = User.findOne;
    const origCompare = bcrypt.compare;
    try {
      User.findOne = async () => ({
        _id: "recruiter_pending_id",
        email: "hr.pending@company.com",
        password: "hashed_password",
        role: "recruiter",
        verificationStatus: "pending",
        fullname: "Pending HR",
      });
      bcrypt.compare = async () => true;

      const { res, getStatus, getData } = createMockRes();
      await login(
        {
          body: {
            email: "hr.pending@company.com",
            password: "password123",
            role: "recruiter",
          },
        },
        res
      );

      assert.equal(getStatus(), 403, "Pending HR must receive 403");
      const data = getData();
      assert.equal(data?.success, false);
      assert.equal(data?.verificationStatus, "pending");
      assert.match(data?.message, /Verification pending/i);
      assert.match(data?.message, /awaiting administrator approval/i);
    } finally {
      User.findOne = origFindOne;
      bcrypt.compare = origCompare;
    }
  });

  test("recruiter with verificationStatus 'rejected' is blocked from logging in with 403 and reason", async () => {
    const origFindOne = User.findOne;
    const origCompare = bcrypt.compare;
    try {
      User.findOne = async () => ({
        _id: "recruiter_rejected_id",
        email: "hr.rejected@company.com",
        password: "hashed_password",
        role: "recruiter",
        verificationStatus: "rejected",
        rejectionReason: "Company email could not be verified.",
        fullname: "Rejected HR",
      });
      bcrypt.compare = async () => true;

      const { res, getStatus, getData } = createMockRes();
      await login(
        {
          body: {
            email: "hr.rejected@company.com",
            password: "password123",
            role: "recruiter",
          },
        },
        res
      );

      assert.equal(getStatus(), 403, "Rejected HR must receive 403");
      const data = getData();
      assert.equal(data?.success, false);
      assert.equal(data?.verificationStatus, "rejected");
      assert.equal(data?.rejectionReason, "Company email could not be verified.");
      assert.match(data?.message, /Verification rejected/i);
    } finally {
      User.findOne = origFindOne;
      bcrypt.compare = origCompare;
    }
  });

  test("recruiter with verificationStatus 'suspended' is blocked from logging in with 403", async () => {
    const origFindOne = User.findOne;
    const origCompare = bcrypt.compare;
    try {
      User.findOne = async () => ({
        _id: "recruiter_suspended_id",
        email: "hr.suspended@company.com",
        password: "hashed_password",
        role: "recruiter",
        verificationStatus: "suspended",
        suspensionReason: "Policy violations detected.",
        fullname: "Suspended HR",
      });
      bcrypt.compare = async () => true;

      const { res, getStatus, getData } = createMockRes();
      await login(
        {
          body: {
            email: "hr.suspended@company.com",
            password: "password123",
            role: "recruiter",
          },
        },
        res
      );

      assert.equal(getStatus(), 403, "Suspended HR must receive 403");
      const data = getData();
      assert.equal(data?.success, false);
      assert.equal(data?.verificationStatus, "suspended");
      assert.match(data?.message, /Account suspended/i);
    } finally {
      User.findOne = origFindOne;
      bcrypt.compare = origCompare;
    }
  });

  test("recruiter with verificationStatus 'approved' logs in successfully with 200 and token cookie", async () => {
    const origFindOne = User.findOne;
    const origCompare = bcrypt.compare;
    try {
      User.findOne = async () => ({
        _id: "recruiter_approved_id",
        email: "hr.approved@company.com",
        password: "hashed_password",
        role: "recruiter",
        verificationStatus: "approved",
        fullname: "Approved HR",
        profile: { bio: "", skills: [] },
      });
      bcrypt.compare = async () => true;

      const { res, getStatus, getData, getCookies } = createMockRes();
      await login(
        {
          body: {
            email: "hr.approved@company.com",
            password: "password123",
            role: "recruiter",
          },
        },
        res
      );

      assert.equal(getStatus(), 200, "Approved HR must receive 200");
      const data = getData();
      assert.equal(data?.success, true);
      assert.equal(data?.user?.verificationStatus, "approved");
      assert.match(data?.message, /Welcome back/i);
      assert.ok(getCookies()?.token, "Token cookie must be set");
    } finally {
      User.findOne = origFindOne;
      bcrypt.compare = origCompare;
    }
  });

  test("student login is unaffected by verificationStatus and logs in with 200", async () => {
    const origFindOne = User.findOne;
    const origCompare = bcrypt.compare;
    try {
      User.findOne = async () => ({
        _id: "student_id",
        email: "student@test.com",
        password: "hashed_password",
        role: "student",
        fullname: "Student Candidate",
        profile: { bio: "", skills: [] },
      });
      bcrypt.compare = async () => true;

      const { res, getStatus, getData, getCookies } = createMockRes();
      await login(
        {
          body: {
            email: "student@test.com",
            password: "password123",
            role: "student",
          },
        },
        res
      );

      assert.equal(getStatus(), 200, "Student must log in with 200");
      const data = getData();
      assert.equal(data?.success, true);
      assert.ok(getCookies()?.token, "Token cookie must be set for student");
    } finally {
      User.findOne = origFindOne;
      bcrypt.compare = origCompare;
    }
  });
});

