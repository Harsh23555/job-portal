import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import {
  saveResumeFile,
  getResumeFilePath,
  deleteResumeFile,
  sanitizeResumeFilename,
  isValidResumeFileType,
  STORAGE_DIR,
} from "../utils/resumeStorage.js";
import { User } from "../models/user.model.js";
import { Application } from "../models/application.model.js";

test("Resume Storage: sanitizeResumeFilename", () => {
  assert.equal(sanitizeResumeFilename("my_resume.pdf"), "my_resume.pdf");
  assert.equal(sanitizeResumeFilename("../../../etc/passwd.pdf"), "passwd.pdf");
  assert.equal(sanitizeResumeFilename("resume..name...pdf"), "resume.name.pdf");
  assert.equal(sanitizeResumeFilename(""), "resume.pdf");
});

test("Resume Storage: isValidResumeFileType", () => {
  assert.equal(isValidResumeFileType("doc.pdf", "application/pdf"), true);
  assert.equal(isValidResumeFileType("doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), true);
  assert.equal(isValidResumeFileType("doc.doc", "application/msword"), true);
  assert.equal(isValidResumeFileType("doc.txt", "text/plain"), true);

  // Invalid types
  assert.equal(isValidResumeFileType("script.exe", "application/x-msdownload"), false);
  assert.equal(isValidResumeFileType("image.png", "image/png"), false);
  assert.equal(isValidResumeFileType("hack.php", "application/x-php"), false);
});

test("Resume Storage: saveResumeFile, getResumeFilePath, and deleteResumeFile lifecycle", async () => {
  const dummyBuffer = Buffer.from("%PDF-1.4 Dummy PDF Content for Testing");
  const originalName = "candidate_resume.pdf";
  const mimeType = "application/pdf";

  // 1. Save file
  const saved = await saveResumeFile(dummyBuffer, originalName, mimeType);
  assert.ok(saved.fileId);
  assert.ok(saved.storageKey);
  assert.equal(saved.originalName, "candidate_resume.pdf");
  assert.equal(saved.mimeType, "application/pdf");
  assert.equal(saved.size, dummyBuffer.length);

  // 2. Verify file on disk
  const filePath = getResumeFilePath(saved.storageKey);
  assert.ok(fs.existsSync(filePath));
  const readBack = fs.readFileSync(filePath);
  assert.deepEqual(readBack, dummyBuffer);

  // 3. Delete file
  const deleted = await deleteResumeFile(saved.storageKey);
  assert.equal(deleted, true);
  assert.equal(fs.existsSync(filePath), false);
});

test("Resume Storage: Path Traversal Protection", async () => {
  assert.throws(
    () => {
      getResumeFilePath("../../../../../etc/passwd");
    },
    (err) => {
      // Either path traversal or ENOENT
      return err.message.includes("not found") || err.message.includes("traversal");
    }
  );
});

test("Resume Storage: rejects empty buffer or oversized file", async () => {
  await assert.rejects(
    async () => {
      await saveResumeFile(Buffer.alloc(0), "empty.pdf", "application/pdf");
    },
    /empty/i
  );

  const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
  await assert.rejects(
    async () => {
      await saveResumeFile(oversizedBuffer, "large.pdf", "application/pdf");
    },
    /too large/i
  );
});

test("Application Model Schema: Resume Snapshot and ATS Fields", () => {
  const paths = Application.schema.paths;
  assert.ok(paths["resume.fileId"], "Application schema missing resume.fileId");
  assert.ok(paths["resume.storageKey"], "Application schema missing resume.storageKey");
  assert.ok(paths["resume.originalName"], "Application schema missing resume.originalName");
  assert.ok(paths["resume.submittedAt"], "Application schema missing resume.submittedAt");
  assert.ok(paths["atsScore"], "Application schema missing atsScore");
  assert.ok(paths["matchedSkills"], "Application schema missing matchedSkills");

  const indexes = Application.schema.indexes();
  const hasResumeFileIdIndex = indexes.some((idx) => idx[0]["resume.fileId"] === 1);
  assert.ok(hasResumeFileIdIndex, "Missing index on resume.fileId");
});

test("User Model Schema: Profile resumeMetadata", () => {
  const paths = User.schema.paths;
  assert.ok(paths["profile.resumeMetadata.fileId"], "User schema missing profile.resumeMetadata.fileId");
  assert.ok(paths["profile.resumeMetadata.storageKey"], "User schema missing profile.resumeMetadata.storageKey");
  assert.ok(paths["profile.resumeMetadata.originalName"], "User schema missing profile.resumeMetadata.originalName");
});
