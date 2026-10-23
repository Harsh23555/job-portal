import React from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

/** Catches React errors and displays fallback UI. */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an unhandled error]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 500,
              width: "100%",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: 16,
              padding: "32px 28px",
              textAlign: "center",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.25)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h2
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                margin: "0 0 10px",
                color: "inherit",
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                fontSize: "0.9rem",
                color: "rgba(160, 160, 175, 0.95)",
                lineHeight: 1.6,
                margin: "0 0 24px",
              }}
            >
              An unexpected error occurred in this view. Your session and saved data are safe.
            </p>

            {this.state.error && (
              <details
                style={{
                  textAlign: "left",
                  background: "rgba(0, 0, 0, 0.2)",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: "0.75rem",
                  color: "rgba(200, 200, 215, 0.8)",
                  marginBottom: 24,
                  wordBreak: "break-word",
                  cursor: "pointer",
                }}
              >
                <summary style={{ fontWeight: 600, color: "#f87171" }}>
                  Error details: {this.state.error.message || "Unknown error"}
                </summary>
                <pre
                  style={{
                    marginTop: 8,
                    whiteSpace: "pre-wrap",
                    fontSize: "0.7rem",
                    overflowX: "auto",
                  }}
                >
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 18px",
                  borderRadius: 9,
                  background: "#7c6af7",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
              >
                <RotateCw size={15} /> Try Again
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 18px",
                  borderRadius: 9,
                  background: "transparent",
                  color: "inherit",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <Home size={15} /> Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
