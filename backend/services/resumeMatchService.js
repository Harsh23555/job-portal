/**
 * ResumeMatchService — matches a candidate's resume analysis to the most relevant jobs.
 *
 * Flow:
 *  1. Extract skills + summary from a ResumeAnalysis document.
 *  2. Embed the resume summary text.
 *  3. Run hybrid retrieval using skills as search terms.
 *  4. Rerank using cosine similarity against resume embedding.
 *  5. Annotate each job with matchedSkills, missingSkills, matchScore, explanation.
 */
import { ResumeAnalysis } from "../models/resumeAnalysis.model.js";
import { User } from "../models/user.model.js";
import { hybridRetrieve } from "./ragSearchService.js";
import { embedText, cosineSimilarity, getModelVersion } from "./embeddingService.js";
import { JobEmbedding } from "../models/jobEmbedding.model.js";

const TOP_K_MATCH = 15;

/**
 * Matches resume / confirmed candidate profile to top jobs.
 * @param {string} userId — owner of candidate profile or ResumeAnalysis
 * @param {{ topK?: number }} options
 * @returns {{ jobs: object[], resumeSkills: string[], totalCandidates: number }}
 */
export async function matchResumeToJobs(userId, { topK = TOP_K_MATCH } = {}) {
  if (!userId) throw new Error("userId is required.");

  const user = await User.findById(userId).lean();
  const analysisDoc = await ResumeAnalysis.findOne({
    $or: [{ userId }, { user: userId }],
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!user && !analysisDoc) {
    throw new Error("No profile or resume found for this user. Please upload and confirm your resume first.");
  }

  // Extract candidate profile skills & summary
  const candidateProfile = user?.candidateProfile || {};
  let candidateSkills = [];

  if (Array.isArray(candidateProfile.skills) && candidateProfile.skills.length > 0) {
    candidateSkills = candidateSkills.concat(candidateProfile.skills);
  }
  if (Array.isArray(user?.profile?.skills) && user.profile.skills.length > 0) {
    candidateSkills = candidateSkills.concat(user.profile.skills);
  }

  // Extract from AI analysis doc if available
  const analysisData = analysisDoc?.analysis || {};
  if (Array.isArray(analysisData.skills?.programming_languages)) {
    candidateSkills = candidateSkills.concat(analysisData.skills.programming_languages.map((s) => s.name || s));
  }
  if (Array.isArray(analysisData.skills?.frameworks)) {
    candidateSkills = candidateSkills.concat(analysisData.skills.frameworks.map((s) => s.name || s));
  }
  if (Array.isArray(analysisData.skills?.databases)) {
    candidateSkills = candidateSkills.concat(analysisData.skills.databases.map((s) => s.name || s));
  }
  if (Array.isArray(analysisData.skills?.cloud_devops)) {
    candidateSkills = candidateSkills.concat(analysisData.skills.cloud_devops.map((s) => s.name || s));
  }
  if (Array.isArray(analysisData.skills?.technical_skills)) {
    candidateSkills = candidateSkills.concat(analysisData.skills.technical_skills.map((s) => s.name || s));
  }
  if (Array.isArray(analysisDoc?.skills)) {
    candidateSkills = candidateSkills.concat(analysisDoc.skills);
  }

  const uniqueSkills = [
    ...new Set(
      candidateSkills
        .filter((s) => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.toLowerCase().trim())
    ),
  ];

  const candidateSummary =
    candidateProfile.summary ||
    analysisData.summary ||
    user?.profile?.bio ||
    "";

  const expYears = candidateProfile.experienceYears || (analysisData.experience_level?.level?.includes("Senior") ? 5 : 2);

  // Resume embedding
  let resumeEmbedding = user?.resumeEmbedding?.vector;
  if (!resumeEmbedding || resumeEmbedding.length === 0) {
    const summaryText = [
      candidateSummary,
      uniqueSkills.join(", "),
      candidateProfile.currentTitle || "",
      `${expYears} years experience`,
    ]
      .filter(Boolean)
      .join(". ");

    try {
      if (summaryText.length > 5) {
        resumeEmbedding = await embedText(summaryText);
      }
    } catch (err) {
      console.warn("[ResumeMatch] Failed to embed resume:", err.message);
    }
  }

  // Query preparation for hybrid retrieval
  const preferredTitles = candidateProfile.preferredJobTitles || [];
  const parsedQuery = {
    originalQuery: [preferredTitles[0], uniqueSkills.slice(0, 4).join(" ")].filter(Boolean).join(" "),
    roleKeywords: preferredTitles,
    skills: uniqueSkills,
    location: (candidateProfile.preferredLocations || [])[0] || null,
    isRemote: candidateProfile.remotePreference === "remote" ? true : null,
  };

  const candidates = await hybridRetrieve(parsedQuery);

  // Vector rerank if embedding is available
  let ranked = candidates;
  if (resumeEmbedding && candidates.length > 0) {
    const jobIds = candidates.map((j) => j._id);
    const embeddings = await JobEmbedding.find({
      jobId: { $in: jobIds },
      modelVersion: getModelVersion(),
    }).lean();

    const embeddingMap = new Map(embeddings.map((e) => [e.jobId.toString(), e.vector]));

    ranked = candidates
      .map((job) => {
        const vec = embeddingMap.get(job._id.toString());
        const similarity = vec ? cosineSimilarity(resumeEmbedding, vec) : 0;
        return { ...job, _similarity: similarity };
      })
      .sort((a, b) => b._similarity - a._similarity);
  }

  const topJobs = ranked.slice(0, topK);

  // Annotate each job with transparent match breakdown
  const annotated = topJobs.map((job) => {
    const jobSkills = (job.skills || []).map((s) => s.toLowerCase().trim());
    const matchedSkills = uniqueSkills.filter((s) => jobSkills.includes(s));
    const missingSkills = jobSkills.filter((s) => !uniqueSkills.includes(s)).slice(0, 5);

    // Hybrid score calculation: 60% skill match + 40% semantic similarity
    const skillRatio = jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0.5;
    const similarity = job._similarity != null ? job._similarity : 0.5;
    const rawScore = Math.round(skillRatio * 60 + Math.max(0, similarity) * 40);
    const matchScore = Math.max(20, Math.min(99, rawScore));

    const { explanation, reasons } = buildMatchBreakdown(
      matchedSkills,
      missingSkills,
      matchScore,
      job,
      candidateProfile
    );

    return {
      ...job,
      matchedSkills,
      missingSkills,
      matchScore,
      semanticSimilarity: similarity != null ? Math.round(similarity * 100) / 100 : null,
      explanation,
      reasons,
    };
  });

  return {
    jobs: annotated,
    resumeSkills: uniqueSkills,
    totalCandidates: candidates.length,
  };
}

export function buildMatchBreakdown(matched, missing, score, job, profile) {
  const title = job.title || "Job";
  const reasons = [];

  if (matched.length > 0) {
    reasons.push(`${matched.slice(0, 3).join(", ")} skills directly match role requirements.`);
  }

  if (job.isRemote && profile.remotePreference === "remote") {
    reasons.push("Fully matches your remote work preference.");
  }

  if (profile.experienceYears != null && profile.experienceYears > 0) {
    reasons.push(`Experience level (~${profile.experienceYears} yrs) is compatible with role requirements.`);
  }

  if (missing.length > 0) {
    reasons.push(`Suggested skills to acquire: ${missing.slice(0, 2).join(", ")}.`);
  }

  reasons.push("Algorithmic match score based on resume relevance (not a hiring guarantee).");

  let explanation = "";
  if (score >= 75) {
    explanation = `Strong match for "${title}". Verified alignment on key competencies: ${matched.slice(0, 3).join(", ") || "core skills"}.`;
  } else if (score >= 50) {
    explanation = `Moderate match for "${title}". Good overlap with ${matched.slice(0, 2).join(", ") || "profile"}.`;
  } else {
    explanation = `Potential growth opportunity for "${title}". Meets basic criteria with room to develop: ${missing.slice(0, 2).join(", ")}.`;
  }

  return { explanation, reasons };
}

export function calculateTransparentMatchScore({ job, profile, vectorSimilarity = 0.5 }) {
  const candidateSkills = (profile?.skills || []).map((s) => s.toLowerCase().trim());
  const jobSkills = (job.requirements || job.skills || []).map((s) => s.toLowerCase().trim());
  const matchedSkills = candidateSkills.filter((s) => jobSkills.includes(s));
  const missingSkills = jobSkills.filter((s) => !candidateSkills.includes(s)).slice(0, 5);

  const skillRatio = jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0.5;
  const similarity = vectorSimilarity != null ? vectorSimilarity : 0.5;
  const rawScore = Math.round(skillRatio * 60 + Math.max(0, similarity) * 40);
  const matchScore = Math.max(20, Math.min(99, rawScore));

  const { explanation, reasons } = buildMatchBreakdown(
    matchedSkills,
    missingSkills,
    matchScore,
    job,
    profile || {}
  );

  return {
    matchScore,
    matchedSkills,
    missingSkills,
    explanation,
    reasons,
    scoreDisclaimer: "Algorithmic match score reflects resume relevance, not a guaranteed hiring outcome."
  };
}

