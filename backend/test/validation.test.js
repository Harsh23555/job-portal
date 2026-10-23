import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isValidEmail,
  isValidPassword,
  isValidRole,
  isValidApplicationStatus,
  pickAllowedFields,
} from "../utils/validator.js";

describe("Validation and Sanitization Utilities", () => {
  test("isValidEmail correctly validates emails", () => {
    assert.equal(isValidEmail("user@example.com"), true);
    assert.equal(isValidEmail("john.doe+work@company.co.in"), true);
    assert.equal(isValidEmail("plainaddress"), false);
    assert.equal(isValidEmail("missing@domain"), false);
    assert.equal(isValidEmail("@missingusername.com"), false);
    assert.equal(isValidEmail(null), false);
    assert.equal(isValidEmail(12345), false);
    assert.equal(isValidEmail({}), false);
  });

  test("isValidPassword enforces minimum length", () => {
    assert.equal(isValidPassword("123456"), true);
    assert.equal(isValidPassword("password123"), true);
    assert.equal(isValidPassword("short"), false);
    assert.equal(isValidPassword(""), false);
    assert.equal(isValidPassword(null), false);
  });

  test("isValidRole allows only 'student' and 'recruiter'", () => {
    assert.equal(isValidRole("student"), true);
    assert.equal(isValidRole("recruiter"), true);
    assert.equal(isValidRole("admin"), false);
    assert.equal(isValidRole("guest"), false);
    assert.equal(isValidRole(null), false);
  });

  test("isValidApplicationStatus validates allowed status enums", () => {
    assert.equal(isValidApplicationStatus("pending"), true);
    assert.equal(isValidApplicationStatus("accepted"), true);
    assert.equal(isValidApplicationStatus("rejected"), true);
    assert.equal(isValidApplicationStatus("PENDING"), true);
    assert.equal(isValidApplicationStatus("invalid_status"), false);
    assert.equal(isValidApplicationStatus(""), false);
    assert.equal(isValidApplicationStatus(null), false);
  });

  test("pickAllowedFields filters out unexpected or dangerous keys", () => {
    const rawPayload = {
      name: "Acme Corp",
      description: "Tech company",
      isAdmin: true,
      __proto__: { polluted: true },
      role: "admin",
    };

    const sanitized = pickAllowedFields(rawPayload, ["name", "description", "website"]);
    assert.deepEqual(sanitized, {
      name: "Acme Corp",
      description: "Tech company",
    });
    assert.equal(sanitized.isAdmin, undefined);
    assert.equal(sanitized.role, undefined);
  });
});
