/** Strips tracking params and anchors from URLs. */
export function cleanUrl(rawUrl = "") {
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl);
    const paramsToStrip = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "se", "v", "ref"];
    paramsToStrip.forEach((p) => parsed.searchParams.delete(p));
    parsed.hash = "";
    return (parsed.origin + parsed.pathname).toLowerCase().replace(/\/+$/, "");
  } catch {
    return rawUrl.split("?")[0].split("#")[0].toLowerCase().replace(/\/+$/, "");
  }
}

/** Normalizes text (lowercase, trimmed, alphanumeric). */
export function normalizeText(text = "") {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strips corporate entity suffixes for company matching. */
export function normalizeCompany(name = "") {
  let cleaned = normalizeText(name);
  const suffixes = [
    "pvt ltd",
    "private limited",
    "pvt",
    "ltd",
    "limited",
    "inc",
    "incorporated",
    "corp",
    "corporation",
    "technologies",
    "technology",
    "solutions",
    "services",
    "group",
  ];
  for (const s of suffixes) {
    cleaned = cleaned.replace(new RegExp(`\\b${s}\\b`, "g"), "").trim();
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

/** Deduplicates jobs by provider ID, canonical URL, or title/company/location. */
export function deduplicateJobs(jobs = []) {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];

  const seenProviderIds = new Set();
  const seenCanonicalUrls = new Set();
  const seenCrossProviderKeys = new Set();
  const result = [];

  for (const job of jobs) {
    if (!job) continue;

    const provider = (job.provider || job.source || "").toLowerCase();
    const id = String(job._id || job.id || "");
    const externalId = String(job.externalId || job.external_id || id);

    // 1. Provider ID
    if (provider && externalId) {
      const providerKey = `${provider}:${externalId}`;
      if (seenProviderIds.has(providerKey)) {
        continue;
      }
      seenProviderIds.add(providerKey);
    }

    // 2. Canonical URL
    const url = job.externalUrl || job.apply_url || job.source_url || "";
    const canonicalUrl = cleanUrl(url);
    if (canonicalUrl && seenCanonicalUrls.has(canonicalUrl)) {
      continue;
    }

    // 3. Conservative fingerprint
    const compName = job.companyName || (typeof job.company === "object" ? job.company?.name : job.company) || "";
    const normTitle = normalizeText(job.title);
    const normComp = normalizeCompany(compName);
    const normLoc = normalizeText(job.location);

    if (normTitle && normComp && normLoc) {
      const fingerprint = `${normTitle}|${normComp}|${normLoc}`;
      if (seenCrossProviderKeys.has(fingerprint)) {
        continue;
      }
      seenCrossProviderKeys.add(fingerprint);
    }

    if (canonicalUrl) {
      seenCanonicalUrls.add(canonicalUrl);
    }

    result.push(job);
  }

  return result;
}
