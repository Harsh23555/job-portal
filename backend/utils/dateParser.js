/** Date parser and relative time formatter. */

/** Parses various date formats to Date or null without fabricating. */
export function parsePublicationDate(rawDate) {
  if (rawDate === null || rawDate === undefined || rawDate === "") {
    return null;
  }

  // Date instance
  if (rawDate instanceof Date) {
    return isNaN(rawDate.getTime()) ? null : rawDate;
  }

  // Timestamp number
  if (typeof rawDate === "number") {
    if (isNaN(rawDate) || rawDate <= 0) return null;
    if (rawDate < 1e11) {
      const d = new Date(rawDate * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(rawDate);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof rawDate !== "string") {
    return null;
  }

  const trimmed = rawDate.trim();
  if (!trimmed) return null;

  // Numeric string
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num) && num > 0) {
      if (num < 1e11) {
        const d = new Date(num * 1000);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(num);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  const lower = trimmed.toLowerCase();

  // Relative dates
  if (lower === "today" || lower === "just now" || lower === "now") {
    return new Date();
  }
  if (lower === "yesterday") {
    return new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  const relMatch = lower.match(/^(\d+)\s*(minute|min|hour|hr|day|week|month)s?\s*ago$/);
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    let ms = 0;
    if (unit.startsWith("min")) ms = amount * 60 * 1000;
    else if (unit.startsWith("hour") || unit === "hr") ms = amount * 60 * 60 * 1000;
    else if (unit.startsWith("day")) ms = amount * 24 * 60 * 60 * 1000;
    else if (unit.startsWith("week")) ms = amount * 7 * 24 * 60 * 60 * 1000;
    else if (unit.startsWith("month")) ms = amount * 30 * 24 * 60 * 60 * 1000;

    if (ms > 0) {
      return new Date(Date.now() - ms);
    }
  }

  // Standard ISO / RFC string
  const standardDate = new Date(trimmed.includes(" ") && !trimmed.includes("T") ? trimmed.replace(" ", "T") : trimmed);
  if (!isNaN(standardDate.getTime())) {
    const year = standardDate.getFullYear();
    if (year >= 2000 && standardDate.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000) {
      return standardDate;
    }
  }

  return null;
}

/** Formats relative time (e.g. "2h ago", "3d ago") or returns null. */
export function formatRelativeTime(dateInput) {
  const date = parsePublicationDate(dateInput);
  if (!date) return null;

  const now = Date.now();
  const diffMs = now - date.getTime();

  if (diffMs < 0) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  return `${Math.floor(diffDays / 365)}y ago`;
}
