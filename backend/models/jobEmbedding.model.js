/**
 * JobEmbedding — stores dense vector embeddings for ExternalJob documents.
 * Vectors are computed by EmbeddingService (Xenova/all-MiniLM-L6-v2 or OpenAI).
 * Used by RAGSearchService for cosine-similarity retrieval.
 */
import mongoose from "mongoose";

const jobEmbeddingSchema = new mongoose.Schema(
  {
    /** Reference to the ExternalJob this embedding belongs to. */
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExternalJob",
      required: true,
    },
    /** The embedding model that produced this vector. */
    modelVersion: {
      type: String,
      required: true,
      default: "Xenova/all-MiniLM-L6-v2",
    },
    /**
     * The 384-dimensional embedding vector stored as an array of floats.
     * When using OpenAI ada-002, this will be 1536 dimensions.
     */
    vector: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Vector must be a non-empty array of numbers.",
      },
    },
    /** Dimensions of the vector (for sanity checks). */
    dimensions: {
      type: Number,
      required: true,
    },
    /** The text that was embedded (for cache invalidation). */
    textHash: {
      type: String,
      default: "",
    },
    /** When the embedding was last computed. */
    embeddedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: "jobembeddings",
  }
);

// Unique index: one embedding per job per model version
jobEmbeddingSchema.index({ jobId: 1, modelVersion: 1 }, { unique: true });
jobEmbeddingSchema.index({ embeddedAt: -1 });
jobEmbeddingSchema.index({ modelVersion: 1 });

export const JobEmbedding = mongoose.model("JobEmbedding", jobEmbeddingSchema);
