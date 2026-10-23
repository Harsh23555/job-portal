import test from "node:test";
import assert from "node:assert/strict";
import { applyJob, getApplicationResume } from "../controllers/application.controller.js";
import { uploadProfileResume, getProfileResume, deleteProfileResume } from "../controllers/user.controller.js";
import { User } from "../models/user.model.js";
import { Job } from "../models/job.model.js";
import { Application } from "../models/application.model.js";
import { Writable } from "stream";
import { saveResumeFile, deleteResumeFile, STORAGE_DIR } from "../utils/resumeStorage.js";

// Mock Express response helper
function createMockRes() {
  const chunks = [];
  const res = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  res.statusCode = 200;
  res.headers = {};
  res.body = null;
  res.headersSent = false;
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.body = data;
    return this;
  };
  res.setHeader = function(key, value) {
    this.headers[key] = value;
  };
  res.getBuffer = function() {
    return Buffer.concat(chunks);
  };
  return res;
}

test("Apply Job: Hard Requirement for Resume", async (t) => {
  const userId = "64b0f0000000000000000001";
  const jobId = "64b0f0000000000000000002";

  // Mock Job.findById
  const origJobFindById = Job.findById;
  Job.findById = () => ({
    populate: () => Promise.resolve({
      _id: jobId,
      title: "Backend Engineer",
      description: "Node.js MongoDB",
      requirements: ["Node.js"],
      created_by: "64b0f0000000000000000099",
      applications: [],
      save: () => Promise.resolve(),
    }),
  });

  // Mock Application.findOne (no existing application)
  const origAppFindOne = Application.findOne;
  Application.findOne = () => Promise.resolve(null);

  // Mock User.findById WITHOUT resume
  const origUserFindById = User.findById;
  User.findById = () => Promise.resolve({
    _id: userId,
    fullname: "No Resume Candidate",
    email: "noresume@test.com",
    role: "student",
    profile: {
      bio: "No resume yet",
      skills: ["JavaScript"],
      resume: null,
      resumeMetadata: null,
    },
  });

  t.after(() => {
    Job.findById = origJobFindById;
    Application.findOne = origAppFindOne;
    User.findById = origUserFindById;
  });

  const req = {
    id: userId,
    params: { id: jobId },
    user: { role: "student", email: "noresume@test.com" },
  };
  const res = createMockRes();

  await applyJob(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /resume required/i);
});

test("Apply Job: Captures Immutable Resume Snapshot & ATS Match", async (t) => {
  const userId = "64b0f0000000000000000001";
  const jobId = "64b0f0000000000000000002";
  let createdAppPayload = null;

  // Mock Job.findById
  const origJobFindById = Job.findById;
  Job.findById = () => ({
    populate: () => Promise.resolve({
      _id: jobId,
      title: "React Full Stack Developer",
      description: "Build interfaces with React and Node.js",
      requirements: ["React", "Node.js"],
      created_by: "64b0f0000000000000000099",
      applications: [],
      save: () => Promise.resolve(),
    }),
  });

  // Mock Application.findOne & Application.create
  const origAppFindOne = Application.findOne;
  const origAppCreate = Application.create;
  Application.findOne = () => Promise.resolve(null);
  Application.create = (payload) => {
    createdAppPayload = payload;
    return Promise.resolve({ _id: "64b0f0000000000000000088", ...payload });
  };

  // Mock User.findById WITH resume
  const origUserFindById = User.findById;
  User.findById = () => Promise.resolve({
    _id: userId,
    fullname: "Qualified Candidate",
    email: "qualified@test.com",
    role: "student",
    profile: {
      bio: "Software developer",
      skills: ["React", "Node.js", "TypeScript"],
      resume: "uuid-v1.pdf",
      resumeOriginalName: "Candidate_V1.pdf",
      resumeMetadata: {
        fileId: "resume-file-id-111",
        storageKey: "uuid-v1.pdf",
        originalName: "Candidate_V1.pdf",
        mimeType: "application/pdf",
        size: 10240,
        uploadedAt: new Date("2026-10-01"),
      },
    },
  });

  t.after(() => {
    Job.findById = origJobFindById;
    Application.findOne = origAppFindOne;
    Application.create = origAppCreate;
    User.findById = origUserFindById;
  });

  const req = {
    id: userId,
    params: { id: jobId },
    user: { role: "student", email: "qualified@test.com" },
  };
  const res = createMockRes();

  await applyJob(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.ok(createdAppPayload);
  assert.equal(createdAppPayload.resume.fileId, "resume-file-id-111");
  assert.equal(createdAppPayload.resume.originalName, "Candidate_V1.pdf");
  assert.ok(createdAppPayload.atsScore !== null);
  assert.ok(createdAppPayload.matchedSkills.length > 0);
});

test("Application Resume Access: IDOR Protection (Recruiter & Applicant Authorization)", async (t) => {
  const applicantId = "64b0f0000000000000000001";
  const ownerRecruiterId = "64b0f0000000000000000002";
  const otherRecruiterId = "64b0f0000000000000000003";
  const otherApplicantId = "64b0f0000000000000000004";
  const applicationId = "64b0f0000000000000000010";

  // Create a real file on disk for streaming test
  const saved = await saveResumeFile(Buffer.from("%PDF-test-file"), "test.pdf", "application/pdf");

  const mockApp = {
    _id: applicationId,
    applicant: applicantId,
    job: {
      _id: "64b0f0000000000000000020",
      title: "Staff Engineer",
      created_by: ownerRecruiterId,
    },
    resume: {
      fileId: saved.fileId,
      storageKey: saved.storageKey,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
    },
  };

  const origAppFindById = Application.findById;
  Application.findById = () => ({
    populate: () => Promise.resolve(mockApp),
  });

  t.after(async () => {
    Application.findById = origAppFindById;
    await deleteResumeFile(saved.storageKey);
  });

  // Unauthorized recruiter
  {
    const req = {
      id: otherRecruiterId,
      params: { id: applicationId },
      user: { role: "recruiter" },
      query: {},
    };
    const res = createMockRes();
    await getApplicationResume(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /not authorized/i);
  }

  // Unauthorized applicant
  {
    const req = {
      id: otherApplicantId,
      params: { id: applicationId },
      user: { role: "student" },
      query: {},
    };
    const res = createMockRes();
    await getApplicationResume(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /not authorized/i);
  }

  // Owning recruiter
  {
    const req = {
      id: ownerRecruiterId,
      params: { id: applicationId },
      user: { role: "recruiter" },
      query: {},
    };
    const res = createMockRes();
    await getApplicationResume(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["Content-Type"], "application/pdf");
    assert.match(res.headers["Content-Disposition"], /inline/);
  }

  // Submitting applicant
  {
    const req = {
      id: applicantId,
      params: { id: applicationId },
      user: { role: "student" },
      query: { download: "true" },
    };
    const res = createMockRes();
    await getApplicationResume(req, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers["Content-Disposition"], /attachment/);
  }
});

test("Profile Resume: Recruiter Cannot Modify or Upload Applicant Resume", async () => {
  const recruiterId = "64b0f0000000000000000099";

  // Recruiter upload check
  {
    const req = {
      id: recruiterId,
      user: { role: "recruiter" },
      file: { buffer: Buffer.from("%PDF-test"), originalname: "recruiter.pdf", mimetype: "application/pdf" },
    };
    const res = createMockRes();
    await uploadProfileResume(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /only applicants/i);
  }

  // Recruiter delete check
  {
    const req = {
      id: recruiterId,
      user: { role: "recruiter" },
    };
    const res = createMockRes();
    await deleteProfileResume(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /only applicants/i);
  }
});
