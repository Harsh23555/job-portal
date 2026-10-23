import axios from "axios";
import { RESUME_ANALYZER_JSON_SCHEMA, buildAnalyzerPrompts } from "../utils/analyzerPrompt.js";
import { validateAnalysis } from "../utils/analysisValidator.js";
import { generateLocalResumeAnalysis } from "./heuristicAnalyzer.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";

// Deduplicates concurrent calls for identical resume hash
const inFlightRequests = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Structured AI Resume Analysis via Groq. */
export class GroqResumeAnalyzerService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GROQ_API_KEY || "";
    this.primaryModel = options.model || process.env.GROQ_MODEL || DEFAULT_MODEL;
    this.fallbackModel = FALLBACK_MODEL;
    this.maxRetries = options.maxRetries ?? 3;
    this.httpClient = options.httpClient || axios;
  }

  /** Checks if Groq API key is configured. */
  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /** Analyzes resume text with Groq or local heuristic fallback. */
  async analyze(resumeText, resumeHash = "") {
    if (!resumeText || typeof resumeText !== "string" || resumeText.length < 50) {
      throw new Error("Resume content is insufficient for analysis (minimum 50 characters required).");
    }

    if (!this.isConfigured()) {
      console.warn("[GroqResumeAnalyzerService] GROQ_API_KEY is not configured; running resilient local AI engine.");
      const localAnalysis = generateLocalResumeAnalysis(resumeText);
      return {
        analysis: localAnalysis,
        modelUsed: "local-heuristic-engine",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    // Join in-flight promise if duplicate request is active
    if (resumeHash && inFlightRequests.has(resumeHash)) {
      return inFlightRequests.get(resumeHash);
    }

    const promise = this._executeWithRetry(resumeText);

    if (resumeHash) {
      inFlightRequests.set(resumeHash, promise);
      promise
        .finally(() => {
          inFlightRequests.delete(resumeHash);
        })
        .catch(() => {});
    }

    return promise;
  }

  /** Execution with retries for rate limits and server errors. */
  async _executeWithRetry(resumeText) {
    const { systemPrompt, userPrompt } = buildAnalyzerPrompts(resumeText);
    let lastError = null;
    let currentModel = this.primaryModel;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const payload = {
          model: currentModel,
          temperature: 0.1,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: RESUME_ANALYZER_JSON_SCHEMA,
          },
        };

        const response = await this.httpClient.post(GROQ_API_URL, payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60000,
        });

        const choice = response.data?.choices?.[0];
        const content = choice?.message?.content;

        if (!content) {
          throw new Error("Groq returned an empty response content.");
        }

        let parsedJson;
        try {
          parsedJson = JSON.parse(content);
        } catch (parseErr) {
          throw new Error(`Failed to parse Groq response as JSON: ${parseErr.message}`);
        }

        const validation = validateAnalysis(parsedJson);
        if (!validation.valid) {
          console.warn("Groq response validation warnings:", validation.errors);
        }

        const usage = {
          promptTokens: response.data?.usage?.prompt_tokens || 0,
          completionTokens: response.data?.usage?.completion_tokens || 0,
          totalTokens: response.data?.usage?.total_tokens || 0,
        };

        return {
          analysis: validation.sanitized,
          modelUsed: currentModel,
          usage,
        };
      } catch (err) {
        lastError = err;
        const status = err.response?.status;
        const headers = err.response?.headers || {};
        const errorData = err.response?.data?.error;

        // Model fallback
        if (status === 400 || status === 404) {
          const errMsg = String(errorData?.message || "").toLowerCase();
          if (errMsg.includes("model") && currentModel !== this.fallbackModel) {
            console.warn(`Primary model ${currentModel} not available, switching to fallback: ${this.fallbackModel}`);
            currentModel = this.fallbackModel;
            continue;
          }
        }

        // Rate limit (429) backoff
        if (status === 429) {
          const retryAfterSec = parseInt(headers["retry-after"], 10);
          let delayMs = !isNaN(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);

          delayMs = Math.min(delayMs, 12000);

          if (attempt < this.maxRetries) {
            console.warn(`[Groq AI] Rate limit reached (429). Retrying in ${delayMs}ms (attempt ${attempt}/${this.maxRetries})...`);
            await sleep(delayMs);
            continue;
          } else {
            const waitTime = !isNaN(retryAfterSec) && retryAfterSec > 0 ? `${retryAfterSec}s` : "a few moments";
            throw new Error(
              `Groq AI service rate limit reached. Please wait ${waitTime} before analyzing another resume.`
            );
          }
        }

        // 5xx transient error retry
        if (status >= 500 && status < 600 && attempt < this.maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 400);
          console.warn(`[Groq AI] Server error (${status}). Retrying in ${delayMs}ms...`);
          await sleep(delayMs);
          continue;
        }

        break;
      }
    }

    const message = lastError?.response?.data?.error?.message || lastError?.message || "Failed to analyze resume with Groq AI.";
    throw new Error(`AI Resume Analysis error: ${message}`);
  }
}

// Global singleton instance
export const groqResumeAnalyzer = new GroqResumeAnalyzerService();
