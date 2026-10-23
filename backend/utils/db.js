import "dotenv/config";
import mongoose from "mongoose";
import dns from "dns";

// Fix for Node.js on Windows where system DNS resolver fails on SRV lookups (querySrv ECONNREFUSED)
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore in environments where setting DNS servers is not allowed
}

/** Connects to MongoDB with connection pool settings. */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("[connectDB] Warning: MONGO_URI is not set. Database queries will fail until configured.");
    return false;
  }

  const connectOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
  };

  try {
    await mongoose.connect(uri, connectOptions);
    console.log("MongoDB connected successfully");
    return true;
  } catch (error) {
    if (error.message && error.message.includes("querySrv")) {
      console.warn("[connectDB] SRV DNS resolution failed. Retrying with public DNS (8.8.8.8, 1.1.1.1)...");
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
        await mongoose.connect(uri, connectOptions);
        console.log("MongoDB connected successfully (via public DNS fallback)");
        return true;
      } catch (retryError) {
        console.error("[connectDB error]: Failed to connect to MongoDB after DNS retry:", retryError.message);
        return false;
      }
    }
    console.error("[connectDB error]: Failed to connect to MongoDB:", error.message);
    return false;
  }
};

export default connectDB;