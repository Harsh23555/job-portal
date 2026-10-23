import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeSkill,
  extractSkillsFromText,
  extractJobSkills,
  extractUserSkills,
  calculateATSScore,
} from "../src/utils/atsMatcher.js";

import {
  cleanUrl,
  normalizeJob,
  deduplicateFrontendJobs,
  mergeAndDeduplicateJobs,
} from "../src/utils/jobDeduplicator.js";

import { STATIC_DEMO_JOBS } from "../src/utils/demoJobs.js";

describe("ATS Matching Engine", () => {
  it("normalizes skill aliases correctly", () => {
    assert.equal(normalizeSkill("React.js"), "react");
    assert.equal(normalizeSkill("reactjs"), "react");
    assert.equal(normalizeSkill("JavaScript"), "javascript");
    assert.equal(normalizeSkill("JS"), "javascript");
    assert.equal(normalizeSkill("Node.js"), "node.js");
    assert.equal(normalizeSkill("nodejs"), "node.js");
    assert.equal(normalizeSkill("PostgreSQL"), "postgresql");
    assert.equal(normalizeSkill("postgres"), "postgresql");
    assert.equal(normalizeSkill("golang"), "go");
    assert.equal(normalizeSkill("Go"), "go");
    assert.equal(normalizeSkill("AWS"), "aws");
    assert.equal(normalizeSkill("Amazon Web Services"), "aws");
    assert.equal(normalizeSkill("K8s"), "kubernetes");
  });

  it("extracts known tech skills from raw description with word boundaries", () => {
    const text = "Looking for an engineer with C++, Python, and React experience. Must know Docker and CI/CD.";
    const skills = extractSkillsFromText(text);
    assert.ok(skills.includes("C++"));
    assert.ok(skills.includes("Python"));
    assert.ok(skills.includes("React"));
    assert.ok(skills.includes("Docker"));
    assert.ok(skills.includes("CI/CD"));
    // Sub-word boundary check
    assert.ok(!skills.includes("Go"));
  });

  it("extracts job skills prioritizing direct requirements and tags", () => {
    const jobWithReqs = {
      title: "Backend Engineer",
      requirements: ["Go", "PostgreSQL", "Docker"],
      description: "Generic text",
    };
    const skills = extractJobSkills(jobWithReqs);
    assert.deepEqual(skills, ["Go", "PostgreSQL", "Docker"]);

    const jobWithDescOnly = {
      title: "Full Stack AI Engineer",
      description: "Build models using Python, PyTorch, and deploy on AWS with FastAPI.",
    };
    const extracted = extractJobSkills(jobWithDescOnly);
    assert.ok(extracted.includes("Python"));
    assert.ok(extracted.includes("PyTorch"));
    assert.ok(extracted.includes("FastAPI"));
    assert.ok(extracted.includes("AWS"));
  });

  it("extracts user skills from both profile and AI resume analysis", () => {
    const user = {
      profile: {
        skills: ["React", "TypeScript", "Node.js"],
      },
    };
    const resumeAnalysis = {
      skills: {
        languages: ["Python", "JavaScript"],
        frameworks: ["Django", "Express"],
        tools: [{ name: "Docker" }, { name: "Git" }],
      },
    };
    const combined = extractUserSkills(user, resumeAnalysis);
    assert.ok(combined.includes("React"));
    assert.ok(combined.includes("TypeScript"));
    assert.ok(combined.includes("Python"));
    assert.ok(combined.includes("Docker"));
    assert.ok(combined.includes("Git"));
  });

  it("returns no_user_skills state when user has no skills", () => {
    const result = calculateATSScore([], ["React", "Node.js"]);
    assert.equal(result.status, "no_user_skills");
    assert.equal(result.score, null);
    assert.equal(result.matched.length, 0);
    assert.equal(result.missing.length, 2);
    assert.ok(result.summaryMessage.includes("Add skills in My Profile"));
  });

  it("returns no_job_requirements state when job has no detectable skills", () => {
    const result = calculateATSScore(["React", "Node.js"], []);
    assert.equal(result.status, "no_job_requirements");
    assert.equal(result.score, null);
    assert.ok(result.summaryMessage.includes("unavailable because this job does not provide"));
  });

  it("calculates 100% full match only when all required skills are possessed", () => {
    const userSkills = ["React", "TypeScript", "Next.js", "Docker", "Node.js"];
    const jobSkills = ["React", "TypeScript", "Next.js"];
    const result = calculateATSScore(userSkills, jobSkills);
    assert.equal(result.status, "full_match");
    assert.equal(result.score, 100);
    assert.equal(result.missing.length, 0);
    assert.equal(result.totalMatched, 3);
    assert.ok(result.summaryMessage.includes("✨ You have all the matching skills"));
  });

  it("calculates partial and low matches honestly with transparent missing skills", () => {
    const userSkills = ["Python", "SQL"];
    const jobSkills = ["Python", "Java", "AWS", "Docker"];
    const result = calculateATSScore(userSkills, jobSkills);
    assert.equal(result.status, "low_match");
    assert.equal(result.score, 25);
    assert.deepEqual(result.matched, ["Python"]);
    assert.deepEqual(result.missing, ["Java", "AWS", "Docker"]);
    assert.ok(!result.summaryMessage.includes("all the matching skills"));
    assert.ok(result.summaryMessage.includes("missing"));
  });
});

describe("Job Merging and Deduplication", () => {
  it("strips tracking parameters from job URLs", () => {
    const dirty = "https://www.adzuna.in/jobs/details/12345?utm_source=feed&utm_medium=cpc&se=abc#apply";
    const clean = cleanUrl(dirty);
    assert.equal(clean, "https://www.adzuna.in/jobs/details/12345");
  });

  it("normalizes job object and sets correct source labeling", () => {
    const rawDemo = { id: 1, title: "Demo Frontend", company: "Vercel", isDemo: true };
    const normDemo = normalizeJob(rawDemo);
    assert.equal(normDemo.isDemo, true);
    assert.equal(normDemo.source, "demo");

    const rawDirect = { _id: "mongo123", title: "Direct Role", company: { name: "Acme" }, isExternal: false };
    const normDirect = normalizeJob(rawDirect);
    assert.equal(normDirect.isExternal, false);
    assert.equal(normDirect.source, "JobSphere Direct");

    const rawExt = { externalId: "jooble99", title: "Live Role", provider: "jooble", isExternal: true };
    const normExt = normalizeJob(rawExt);
    assert.equal(normExt.isExternal, true);
    assert.equal(normExt.provider, "jooble");
  });

  it("merges old existing jobs + new API jobs + static demo jobs without wiping old jobs", () => {
    const existingJobs = [
      {
        _id: "int_1",
        title: "Test Job",
        company: "Vijaya Sudip Bhudhale's Company",
        postedAt: "2026-08-20T00:00:00Z",
        isExternal: false,
      },
    ];

    const newApiJobs = [
      {
        externalId: "ext_100",
        title: "Senior AI Engineer",
        company: "OpenTech",
        provider: "adzuna",
        isExternal: true,
        postedAt: new Date().toISOString(),
      },
    ];

    const fallbackDemos = STATIC_DEMO_JOBS.slice(0, 5);

    const merged = mergeAndDeduplicateJobs(existingJobs, newApiJobs, fallbackDemos);

    // Verify preservation of internal, external, and fallback jobs
    assert.ok(merged.some((j) => j._id === "int_1" && j.title === "Test Job"));
    assert.ok(merged.some((j) => j.externalId === "ext_100"));
    assert.ok(merged.some((j) => j._id === "demo_1"));
    assert.equal(merged.length, 7);
  });

  it("deduplicates repeated API fetches using Provider ID without duplicating cards", () => {
    const existing = [
      { externalId: "adzuna_123", provider: "adzuna", title: "Developer", postedAt: "2026-09-01T00:00:00Z" },
    ];
    const incoming = [
      { externalId: "adzuna_123", provider: "adzuna", title: "Developer Updated", postedAt: "2026-09-01T00:00:00Z" },
    ];

    const merged = mergeAndDeduplicateJobs(existing, incoming, []);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].title, "Developer Updated"); // Incoming fresh data updates existing
  });

  it("deduplicates cross-provider jobs matching canonical clean URLs", () => {
    const jobA = {
      _id: "jobA",
      title: "Full Stack Engineer",
      company: "Google",
      externalUrl: "https://careers.google.com/jobs/101?utm_source=partnerA",
    };
    const jobB = {
      _id: "jobB",
      title: "Full Stack Engineer",
      company: "Google",
      externalUrl: "https://careers.google.com/jobs/101?utm_source=partnerB&se=xyz",
    };

    const deduped = deduplicateFrontendJobs([jobA, jobB]);
    assert.equal(deduped.length, 1);
  });

  it("sorts jobs by actual publication date (newest first)", () => {
    const oldJob = { _id: "1", title: "Old Job", postedAt: "2026-08-01T00:00:00Z" };
    const middleJob = { _id: "2", title: "Middle Job", postedAt: "2026-09-01T00:00:00Z" };
    const newJob = { _id: "3", title: "New Job", postedAt: "2026-10-01T00:00:00Z" };

    const sorted = mergeAndDeduplicateJobs([], [oldJob, newJob, middleJob], []);
    assert.equal(sorted[0]._id, "3");
    assert.equal(sorted[1]._id, "2");
    assert.equal(sorted[2]._id, "1");
  });
});
