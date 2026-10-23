/** Centralized Express error handler. */
export const errorHandler = (err, req, res, next) => {
  console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid resource identifier: '${err.value}' for field '${err.path}'.`,
    });
  }

  // Schema validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation Error", errors: messages });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const duplicateFields = Object.keys(err.keyPattern || {});
    return res.status(409).json({
      success: false,
      message: `Duplicate record detected for field(s): ${duplicateFields.join(", ")}.`,
    });
  }

  // Multer upload errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ success: false, message: "Uploaded file is too large. Maximum allowed size is 5MB." });
    }
    return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid authentication token." });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
  }

  // Fallback error
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  return res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected internal server error occurred.",
  });
};

export default errorHandler;
