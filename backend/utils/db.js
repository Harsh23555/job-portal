import mongoose from "mongoose";

/** Connects to MongoDB with connection pool settings. */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("[connectDB] Warning: MONGO_URI is not set. Database queries will fail until configured.");
    return false;
  }
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
    });
    console.log("MongoDB connected successfully");
    return true;
  } catch (error) {
    console.error("[connectDB error]: Failed to connect to MongoDB:", error.message);
    return false;
  }
};

export default connectDB;