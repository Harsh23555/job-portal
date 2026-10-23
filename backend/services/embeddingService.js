/**
 * EmbeddingService — wraps the sentence-transformer model for generating embeddings.
 *
 * Strategy:
 *   - Default: Xenova/all-MiniLM-L6-v2 (local, CPU, 384 dims, ~25MB download on first run)
 *   - Fallback: OpenAI text-embedding-ada-002 (1536 dims, requires OPENAI_API_KEY)
 *
 * On first use, @xenova/transformers downloads the model weights to a local cache
 * (~/.cache/huggingface/hub). Subsequent runs use the cached model.
 */
import crypto from "crypto";

let pipeline = null;
let pipelineLoading = null;

const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || "local";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";
const LOCAL_DIMS = 384;
const OPENAI_DIMS = 1536;

/** Returns the number of dimensions for the configured provider. */
export function getEmbeddingDimensions() {
  return EMBEDDING_PROVIDER === "openai" ? OPENAI_DIMS : LOCAL_DIMS;
}

/** Returns the model version string for storage. */
export function getModelVersion() {
  return EMBEDDING_PROVIDER === "openai" ? "openai/text-embedding-ada-002" : EMBEDDING_MODEL;
}

/** Lazily loads and caches the Xenova pipeline. */
async function getLocalPipeline() {
  if (pipeline) return pipeline;
  if (pipelineLoading) return pipelineLoading;

  pipelineLoading = (async () => {
    try {
      console.log(`[EmbeddingService] Loading local model: ${EMBEDDING_MODEL} (first time may take 10-30s to download)`);
      const { pipeline: buildPipeline } = await import("@xenova/transformers");
      pipeline = await buildPipeline("feature-extraction", EMBEDDING_MODEL, {
        quantized: true,
      });
      console.log("[EmbeddingService] Local embedding model loaded successfully.");
      return pipeline;
    } catch (err) {
      pipelineLoading = null;
      console.error("[EmbeddingService] Failed to load local model:", err.message);
      throw err;
    }
  })();

  return pipelineLoading;
}

/** Computes cosine similarity between two float arrays. */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const mag = Math.sqrt(normA) * Math.sqrt(normB);
  return mag === 0 ? 0 : dot / mag;
}

/** Computes MD5 hash of text for cache invalidation. */
export function hashText(text) {
  return crypto.createHash("md5").update(text, "utf8").digest("hex");
}

/** Normalizes a vector to unit length. */
function normalizeVector(vec) {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Embeds text using the configured provider.
 * @param {string} text
 * @returns {Promise<number[]>} normalized embedding vector
 */
export async function embedText(text) {
  if (!text || typeof text !== "string") {
    throw new Error("[EmbeddingService] embedText requires a non-empty string.");
  }

  const trimmed = text.trim().slice(0, 4096); // cap input

  if (EMBEDDING_PROVIDER === "openai") {
    return embedWithOpenAI(trimmed);
  }
  return embedWithLocal(trimmed);
}

async function embedWithLocal(text) {
  const model = await getLocalPipeline();
  const output = await model(text, { pooling: "mean", normalize: true });
  const array = Array.from(output.data);
  return normalizeVector(array);
}

async function embedWithOpenAI(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("[EmbeddingService] OPENAI_API_KEY is not configured.");
  }

  const { default: axios } = await import("axios");
  const response = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      model: "text-embedding-ada-002",
      input: text,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30_000,
    }
  );

  const vec = response.data?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) {
    throw new Error("[EmbeddingService] OpenAI returned invalid embedding shape.");
  }
  return normalizeVector(vec);
}

/**
 * Embeds a batch of texts, returning an array of vectors.
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embedBatch(texts) {
  const results = [];
  for (const text of texts) {
    try {
      results.push(await embedText(text));
    } catch (err) {
      console.error("[EmbeddingService] Failed to embed text:", err.message);
      results.push(null);
    }
  }
  return results;
}

/**
 * Builds the text used for embedding a job.
 * Combine title + skills + description (truncated) for best representation.
 */
export function buildJobEmbeddingText(job) {
  const parts = [
    job.title || "",
    job.companyName || "",
    (job.skills || []).join(", "),
    (job.description || "").slice(0, 1000),
  ];
  return parts.filter(Boolean).join(". ");
}
