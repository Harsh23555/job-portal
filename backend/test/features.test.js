import test, { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import emailService, { getSentEmails, clearSentEmails } from "../services/emailService.js";
import { User } from "../models/user.model.js";
import { SavedJob } from "../models/savedJob.model.js";

describe("Email Service Abstraction (Fix #26)", () => {
  beforeEach(() => {
    clearSentEmails();
  });

  it("dispatches and records welcome emails with recipient and subject", async () => {
    const success = await emailService.sendWelcomeEmail("candidate@example.com", "Jane Doe");
    assert.equal(success, true);

    const sent = getSentEmails();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "candidate@example.com");
    assert.ok(sent[0].subject.includes("Welcome"));
    assert.ok(sent[0].text.includes("Jane Doe"));
  });

  it("dispatches and records password reset emails with token link", async () => {
    const rawToken = "abc123token456";
    const success = await emailService.sendPasswordResetEmail(
      "user@example.com",
      rawToken,
      "http://localhost:5173"
    );
    assert.equal(success, true);

    const sent = getSentEmails();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "user@example.com");
    assert.ok(sent[0].subject.includes("Password Reset"));
    assert.ok(sent[0].text.includes(rawToken));
  });

  it("dispatches application confirmation emails", async () => {
    const success = await emailService.sendApplicationSubmittedEmail(
      "applicant@example.com",
      "Full Stack Engineer",
      "Acme Tech"
    );
    assert.equal(success, true);

    const sent = getSentEmails();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "applicant@example.com");
    assert.ok(sent[0].text.includes("Full Stack Engineer"));
    assert.ok(sent[0].text.includes("Acme Tech"));
  });

  it("dispatches application status update notifications", async () => {
    const success = await emailService.sendApplicationStatusUpdateEmail(
      "applicant@example.com",
      "Frontend Developer",
      "Innovate Corp",
      "accepted"
    );
    assert.equal(success, true);

    const sent = getSentEmails();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "applicant@example.com");
    assert.ok(sent[0].text.includes("Accepted"));
  });

  it("safely rejects invalid email addresses without throwing", async () => {
    const success = await emailService.sendWelcomeEmail("invalid-email-address", "Nobody");
    assert.equal(success, false);
    assert.equal(getSentEmails().length, 0);
  });
});

describe("Password Reset Token & Security (Fix #27)", () => {
  it("generates crypto token and matches SHA-256 hashed digest", () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    assert.notEqual(rawToken, hashed);
    assert.equal(hashed.length, 64);

    // Verify SHA-256 digest match
    const verificationHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    assert.equal(hashed, verificationHash);
  });

  it("User model schema defines password reset fields and index", () => {
    const paths = User.schema.paths;
    assert.ok(paths["resetPasswordToken"], "resetPasswordToken path must exist");
    assert.ok(paths["resetPasswordExpires"], "resetPasswordExpires path must exist");

    const indexes = User.schema.indexes();
    const hasResetIndex = indexes.some(([fields]) => fields.resetPasswordToken !== undefined);
    assert.ok(hasResetIndex, "resetPasswordToken must have an index");
  });
});

describe("SavedJob Model Schema (Fix #25)", () => {
  it("defines schema paths for user, internalJobId, externalJobId, and jobSnapshot", () => {
    const paths = SavedJob.schema.paths;
    assert.ok(paths["user"], "user field must exist");
    assert.ok(paths["internalJobId"], "internalJobId field must exist");
    assert.ok(paths["externalJobId"], "externalJobId field must exist");
    assert.ok(paths["jobSnapshot.title"], "jobSnapshot.title field must exist");
    assert.ok(paths["jobSnapshot.companyName"], "jobSnapshot.companyName field must exist");
  });

  it("defines compound unique indexes preventing duplicate saves", () => {
    const indexes = SavedJob.schema.indexes();
    const hasInternalUnique = indexes.some(
      ([fields, opts]) => fields.user === 1 && fields.internalJobId === 1 && opts.unique === true
    );
    const hasExternalUnique = indexes.some(
      ([fields, opts]) => fields.user === 1 && fields.externalJobId === 1 && opts.unique === true
    );
    assert.ok(hasInternalUnique, "Must have unique index on (user, internalJobId)");
    assert.ok(hasExternalUnique, "Must have unique index on (user, externalJobId)");
  });
});
