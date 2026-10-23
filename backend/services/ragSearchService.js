/**
 * RAGSearchService — AI-powered hybrid semantic job search.
 *
 * Pipeline:
 *  Step 1 — NLU query parsing via Groq (with regex fallback)
 *  Step 2 — Hybrid retrieval from MongoDB (text-search + filters → candidate set)
 *  Step 3 — Vector similarity reranking using in-process cosine similarity
 *  Step 4 — Reciprocal Rank Fusion (RRF) combining text rank and vector rank
 *  Step 5 — Grounded answer generation via Groq (with graceful fallback)
 */
import axios from "axios";
import { ExternalJob } from "../models/externalJob.model.js";
import { JobEmbedding } from "../models/jobEmbedding.model.js";
import { embedText, cosineSimilarity, getModelVersion } from "./embeddingService.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const RAG_MODEL = process.env.RAG_LLM_MODEL || "llama-3.3-70b-versatile";

const MAX_CANDIDATES = 200;  // text search candidate pool
const TOP_K = 10;             // final results to return
const RRF_K = 60;             // RRF constant

function getGroqKey() {
  return process.env.GROQ_API_KEY || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: NLU Query Parsing
// ─────────────────────────────────────────────────────────────────────────────

const NLU_SYSTEM_PROMPT = `You are a job search query parser. Given a natural language job search query, extract structured filters as JSON. Return ONLY valid JSON with these optional fields:
{
  "roleKeywords": ["string"],      // job role terms e.g. ["flutter developer", "mobile engineer"]
  "skills": ["string"],           // tech skills e.g. ["flutter", "dart", "firebase"]
  "location": "string",           // city/country or empty
  "isRemote": boolean | null,     // true/false/null
  "employmentType": "string",     // full-time|part-time|contract|freelance or empty
  "experienceMin": number | null, // min years experience or null
  "experienceMax": number | null, // max years experience or null
  "salaryMin": number | null,     // in USD or null
  "salaryMax": number | null,     // in USD or null
  "freshnessdays": number | null  // max days since posted or null
}
Only include fields you are confident about. Never invent information not present in the query.`;

/**
 * Parses a natural language query into structured filters using Groq.
 * Falls back to regex extraction if Groq is unavailable.
 */
export async function parseQuery(query) {
  const groqKey = getGroqKey();

  if (groqKey) {
    try {
      const response = await axios.post(
        GROQ_API_URL,
        {
          model: RAG_MODEL,
          temperature: 0,
          max_tokens: 512,
          messages: [
            { role: "system", content: NLU_SYSTEM_PROMPT },
            { role: "user", content: `Parse this job search query: "${query}"` },
          ],
          response_format: { type: "json_object" },
        },
        {
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          timeout: 15_000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return { ...parsed, originalQuery: query };
      }
    } catch (err) {
      console.warn("[RAGSearch] Groq NLU parsing failed, using regex fallback:", err.message);
    }
  }

  return regexFallbackParser(query);
}

function regexFallbackParser(query) {
  const lower = query.toLowerCase();
  const result = { originalQuery: query, roleKeywords: [], skills: [], location: null, isRemote: null };

  if (/remote/i.test(query)) result.isRemote = true;
  if (/on.?site|in.?office|hybrid/i.test(query)) result.isRemote = false;

  const locationMatch = query.match(/\bin\s+([A-Z][a-zA-Z\s]{2,20})/);
  if (locationMatch) result.location = locationMatch[1].trim();

  const skills = ["react", "node", "python", "java", "flutter", "dart", "django", "angular",
    "vue", "typescript", "golang", "rust", "kubernetes", "docker", "aws", "gcp", "azure",
    "sql", "mongodb", "postgresql", "redis", "tensorflow", "pytorch", "spark", "kafka"];
  result.skills = skills.filter((s) => lower.includes(s));

  const roles = ["developer", "engineer", "designer", "analyst", "manager", "architect",
    "devops", "qa", "tester", "scientist", "intern"];
  result.roleKeywords = roles.filter((r) => lower.includes(r));

  const expMatch = query.match(/(\d+)\+?\s*year/i);
  if (expMatch) result.experienceMin = parseInt(expMatch[1], 10);

  const freshnessMatch = query.match(/last\s+(\d+)\s+days?/i);
  if (freshnessMatch) result.freshnessdays = parseInt(freshnessMatch[1], 10);

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Hybrid Retrieval
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves candidate set from MongoDB using text search + filters.
 * Returns up to MAX_CANDIDATES results for reranking.
 */
export async function hybridRetrieve(parsedQuery) {
  const filter = {};
  const andClauses = [];

  // Text search
  const textTerms = [
    ...(parsedQuery.roleKeywords || []),
    ...(parsedQuery.skills || []),
    parsedQuery.originalQuery || "",
  ].filter(Boolean).join(" ");

  if (textTerms.trim()) {
    filter.$text = { $search: textTerms };
  }

  // Location filter
  if (parsedQuery.location) {
    andClauses.push({ location: { $regex: parsedQuery.location, $options: "i" } });
  }

  // Remote filter
  if (parsedQuery.isRemote === true) {
    andClauses.push({ isRemote: true });
  }

  // Employment type
  if (parsedQuery.employmentType) {
    andClauses.push({ jobType: { $regex: parsedQuery.employmentType, $options: "i" } });
  }

  // Salary filter
  if (parsedQuery.salaryMin) {
    andClauses.push({ salaryMax: { $gte: parsedQuery.salaryMin } });
  }

  // Freshness
  if (parsedQuery.freshnessdays) {
    const cutoff = new Date(Date.now() - parsedQuery.freshnessdays * 24 * 60 * 60 * 1000);
    andClauses.push({ postedAt: { $gte: cutoff } });
  }

  if (andClauses.length > 0) {
    filter.$and = andClauses;
  }

  try {
    const projection = filter.$text
      ? { score: { $meta: "textScore" } }
      : {};

    const candidates = await ExternalJob.find(filter, projection)
      .sort(filter.$text ? { score: { $meta: "textScore" } } : { postedAt: -1 })
      .limit(MAX_CANDIDATES)
      .lean();

    return candidates;
  } catch (err) {
    // If text index isn't ready, fall back to unranked query
    console.warn("[RAGSearch] Text search failed, falling back to basic query:", err.message);
    const fallback = { ...filter };
    delete fallback.$text;
    return ExternalJob.find(fallback).sort({ postedAt: -1 }).limit(MAX_CANDIDATES).lean();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Vector Similarity Re-ranking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads embeddings for candidate jobs and computes cosine similarity
 * against the query embedding. Returns candidates sorted by similarity.
 */
export async function vectorRerank(candidates, queryEmbedding) {
  if (!queryEmbedding || !candidates.length) return candidates;

  const jobIds = candidates.map((j) => j._id);
  const embeddings = await JobEmbedding.find({
    jobId: { $in: jobIds },
    modelVersion: getModelVersion(),
  }).lean();

  const embeddingMap = new Map(embeddings.map((e) => [e.jobId.toString(), e.vector]));

  const scored = candidates.map((job) => {
    const vec = embeddingMap.get(job._id.toString());
    const similarity = vec ? cosineSimilarity(queryEmbedding, vec) : 0;
    return { ...job, _vectorScore: similarity };
  });

  return scored.sort((a, b) => b._vectorScore - a._vectorScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Reciprocal Rank Fusion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Combines two ranked lists using Reciprocal Rank Fusion.
 * @param {object[]} textRanked - candidates sorted by text relevance
 * @param {object[]} vectorRanked - candidates sorted by vector similarity
 * @returns {object[]} fused and re-sorted candidates
 */
export function rerankWithRRF(textRanked, vectorRanked) {
  const scores = new Map();

  const addScore = (list) => {
    list.forEach((job, idx) => {
      const id = job._id.toString();
      const s = 1 / (RRF_K + idx + 1);
      scores.set(id, (scores.get(id) || 0) + s);
    });
  };

  addScore(textRanked);
  addScore(vectorRanked);

  // Build a lookup map for job objects
  const jobMap = new Map();
  [...textRanked, ...vectorRanked].forEach((j) => jobMap.set(j._id.toString(), j));

  return Array.from(scores.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([id, score]) => ({ ...jobMap.get(id), _rrfScore: score }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Answer Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a grounded natural language answer using Groq with the top jobs as context.
 * Falls back gracefully if Groq is unavailable.
 */
export async function generateAnswer(topJobs, originalQuery) {
  const groqKey = getGroqKey();
  if (!groqKey || !topJobs.length) {
    return null;
  }

  const context = topJobs.slice(0, 5).map((job, i) =>
    `[Job ${i + 1}] ID: ${job._id}\nTitle: ${job.title}\nCompany: ${job.companyName || "N/A"}\nLocation: ${job.location}\nURL: ${job.externalUrl}\nSkills: ${(job.skills || []).join(", ")}\nDescription: ${(job.description || "").slice(0, 300)}`
  ).join("\n\n");

  const systemPrompt = `You are a helpful job search assistant. Given a list of job postings, briefly summarize the best matches for the user's query. 
  - Always cite the Job ID and company name when mentioning a job.
  - Be concise (3-5 sentences max).
  - Do not invent any details not present in the job data.
  - If none are a strong match, say so.`;

  const userPrompt = `User query: "${originalQuery}"\n\nTop matching jobs:\n${context}\n\nBriefly describe the best matches.`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: RAG_MODEL,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      {
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        timeout: 20_000,
      }
    );

    return response.data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn("[RAGSearch] Answer generation failed:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full RAG search pipeline.
 * @param {string} query - natural language query
 * @param {{ topK?: number, skipEmbedding?: boolean }} options
 */
export async function ragSearch(query, { topK = TOP_K, skipEmbedding = false } = {}) {
  if (!query || typeof query !== "string") {
    throw new Error("Query must be a non-empty string.");
  }

  const startMs = Date.now();

  // Step 1: Parse query
  const parsedQuery = await parseQuery(query.trim());

  // Step 2: Hybrid text retrieval
  const textCandidates = await hybridRetrieve(parsedQuery);

  let rankedResults;

  if (!skipEmbedding && textCandidates.length > 0) {
    // Step 3: Embed query and vector-rerank
    let queryEmbedding = null;
    try {
      queryEmbedding = await embedText(query);
    } catch (err) {
      console.warn("[RAGSearch] Query embedding failed; using text-only ranking:", err.message);
    }

    const vectorRanked = queryEmbedding
      ? await vectorRerank(textCandidates, queryEmbedding)
      : textCandidates;

    // Step 4: RRF fusion
    rankedResults = rerankWithRRF(textCandidates, vectorRanked);
  } else {
    rankedResults = textCandidates;
  }

  const topJobs = rankedResults.slice(0, topK);

  // Step 5: Answer generation
  const answer = await generateAnswer(topJobs, query);

  const durationMs = Date.now() - startMs;

  return {
    query,
    parsedQuery,
    results: topJobs,
    totalCandidates: textCandidates.length,
    answer,
    durationMs,
  };
}
