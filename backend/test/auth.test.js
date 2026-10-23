import { test, describe } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";

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

