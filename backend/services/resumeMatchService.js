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
import { hybridRetrieve, vectorRerank } from "./ragSearchService.js";
import { embedText, cosineSimilarity, getModelVersion } from "./embeddingService.js";
import { JobEmbedding } from "../models/jobEmbedding.model.js";

const TOP_K_MATCH = 10;

/**
 * Matches resume analysis to top jobs.
 * @param {string} userId — owner of the ResumeAnalysis to use
 * @param {{ topK?: number }} options
 * @returns {{ jobs: object[], resumeSkills: string[] }}
 */
export async function matchResumeToJobs(userId, { topK = TOP_K_MATCH } = {}) {
  if (!userId) throw new Error("userId is required.");

  // Fetch latest resume analysis for the user
  const analysis = await ResumeAnalysis.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
  if (!analysis) {
    throw new Error("No resume analysis found for this user. Please analyze your resume first.");
  }

  const resumeSkills = (analysis.skills || []).concat(analysis.technicalSkills || []);
  const uniqueSkills = [...new Set(resumeSkills.map((s) => s.toLowerCase().trim()))];

  const summaryText = [
    analysis.summary || "",
    uniqueSkills.join(", "),
    analysis.experience ? `${analysis.experience} years experience` : "",
    (analysis.education || []).join(", "),
  ].filter(Boolean).join(". ");

  // Embed the resume summary
  let resumeEmbedding = null;
  try {
    resumeEmbedding = await embedText(summaryText);
  } catch (err) {
    console.warn("[ResumeMatch] Failed to embed resume:", err.message);
  }

  // Hybrid retrieval using skills as the query
  const parsedQuery = {
    originalQuery: uniqueSkills.slice(0, 5).join(" "),
    roleKeywords: [],
    skills: uniqueSkills,
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

  // Annotate each job with match metadata
  const annotated = topJobs.map((job) => {
    const jobSkills = (job.skills || []).map((s) => s.toLowerCase().trim());
    const matchedSkills = uniqueSkills.filter((s) => jobSkills.includes(s));
    const missingSkills = jobSkills
      .filter((s) => !uniqueSkills.includes(s))
      .slice(0, 5);

    const matchScore =
      jobSkills.length > 0
        ? Math.min(100, Math.round((matchedSkills.length / Math.max(uniqueSkills.length, jobSkills.length)) * 100))
        : 0;

    const similarity = job._similarity != null ? job._similarity : null;

    const explanation = buildMatchExplanation(matchedSkills, missingSkills, matchScore, job.title);

    return {
      ...job,
      matchedSkills,
      missingSkills,
      matchScore,
      semanticSimilarity: similarity != null ? Math.round(similarity * 100) / 100 : null,
      explanation,
    };
  });

  return {
    jobs: annotated,
    resumeSkills: uniqueSkills,
    totalCandidates: candidates.length,
  };
}

function buildMatchExplanation(matched, missing, score, title) {
  if (score >= 70) {
    return `Strong match for "${title}". You have ${matched.length} of the required skills including: ${matched.slice(0, 3).join(", ")}.`;
  } else if (score >= 40) {
    return `Partial match for "${title}". Matching skills: ${matched.slice(0, 3).join(", ")}. Consider learning: ${missing.slice(0, 2).join(", ")}.`;
  } else if (matched.length > 0) {
    return `Weak match for "${title}". Only ${matched.length} skill(s) overlap. Skills to develop: ${missing.slice(0, 3).join(", ")}.`;
  } else {
    return `Low match for "${title}". Your current skills have minimal overlap with this role's requirements.`;
  }
}
