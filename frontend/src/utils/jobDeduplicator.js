/** Strips UTM and tracking query parameters from URLs. */
export function cleanUrl(rawUrl = "") {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    const paramsToStrip = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "se", "v", "trk"];
    paramsToStrip.forEach((p) => u.searchParams.delete(p));
    u.hash = "";
    return (u.origin + u.pathname).toLowerCase().replace(/\/+$/, "");
  } catch {
    return trimmed.split("?")[0].split("#")[0].toLowerCase().replace(/\/+$/, "");
  }
}

/** Normalizes text for comparison. */
export function normalizeText(text = "") {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalizes job schema across internal, external, and demo sources. */
export function normalizeJob(job) {
  if (!job) return null;

  const id = String(job._id || job.id || job.externalId || job.external_id || "");
  const isExternal = Boolean(job.isExternal);
  const isDemo = Boolean(job.isDemo || String(id).startsWith("demo_") || (!isExternal && job.provider === "demo"));

  const companyName = job.companyName || (typeof job.company === "object" ? job.company?.name : job.company) || "Company";

  let requirements = [];
  if (Array.isArray(job.requirements) && job.requirements.length > 0) {
    requirements = job.requirements;
  } else if (Array.isArray(job.skills) && job.skills.length > 0) {
    requirements = job.skills;
  } else if (Array.isArray(job.tags) && job.tags.length > 0) {
    requirements = job.tags;
  } else if (typeof job.requirements === "string" && job.requirements.trim()) {
    requirements = job.requirements.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }

  const provider = isDemo
    ? "demo"
    : (job.provider || (isExternal ? "external" : "internal"));

  const source = isDemo
    ? "demo"
    : (job.source || (isExternal ? provider : "JobSphere Direct"));

  const postedAt = job.postedAt || job.posted_date || job.createdAt || null;
  const fetchedAt = job.fetched_at || job.importedAt || new Date().toISOString();
  const refreshedAt = job.refreshedAt || job.refreshed_at || new Date().toISOString();

  return {
    ...job,
    _id: id,
    id: id,
    externalId: job.externalId || job.external_id || (isExternal ? id : undefined),
    title: job.title || "Job Title",
    company: typeof job.company === "object" && job.company !== null ? job.company : { name: companyName },
    companyName,
    location: job.location || "India",
    isRemote: Boolean(job.isRemote || (job.location && job.location.toLowerCase().includes("remote"))),
    jobType: job.jobType || job.type || "Full-time",
    category: job.category || "Engineering",
    requirements,
    skills: requirements,
    isExternal,
    isDemo,
    provider,
    source,
    externalUrl: job.externalUrl || job.apply_url || "",
    apply_url: job.externalUrl || job.apply_url || "",
    postedAt,
    posted_date: postedAt,
    fetchedAt,
    refreshedAt,
    featured: Boolean(job.featured),
  };
}

/** Deduplicates jobs by provider ID, canonical URL, stable ID, or fingerprint. */
export function deduplicateFrontendJobs(jobs = []) {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];

  const seenProviderIds = new Set();
  const seenCanonicalUrls = new Set();
  const seenStableIds = new Set();
  const seenFingerprints = new Set();
  const result = [];

  for (const rawJob of jobs) {
    const job = normalizeJob(rawJob);
    if (!job) continue;

    const id = String(job._id || job.id || "");
    const provider = String(job.provider || "").toLowerCase();
    const externalId = String(job.externalId || "");

    // Provider ID
    if (provider && externalId) {
      const providerKey = `${provider}:${externalId}`;
      if (seenProviderIds.has(providerKey)) continue;
      seenProviderIds.add(providerKey);
    }

    // Canonical URL
    const rawUrl = job.externalUrl || job.apply_url || "";
    const canonicalUrl = cleanUrl(rawUrl);
    if (canonicalUrl) {
      if (seenCanonicalUrls.has(canonicalUrl)) continue;
      seenCanonicalUrls.add(canonicalUrl);
    }

    // Stable ID
    if (id) {
      if (seenStableIds.has(id)) continue;
      seenStableIds.add(id);
    }

    // Fingerprint (title + company + location)
    const normTitle = normalizeText(job.title);
    const normComp = normalizeText(job.companyName);
    const normLoc = normalizeText(job.location);

    if (normTitle && normComp) {
      const fp = `${normTitle}|${normComp}|${normLoc}`;
      if (seenFingerprints.has(fp)) continue;
      seenFingerprints.add(fp);
    }

    result.push(job);
  }

  return result;
}

/** Merges, deduplicates, and sorts jobs by publication date. */
export function mergeAndDeduplicateJobs(existingJobs = [], incomingJobs = [], fallbackSeedJobs = []) {
  const safeExisting = Array.isArray(existingJobs) ? existingJobs : [];
  const safeIncoming = Array.isArray(incomingJobs) ? incomingJobs : [];
  const safeFallback = Array.isArray(fallbackSeedJobs) ? fallbackSeedJobs : [];

  const combinedRaw = [...safeIncoming, ...safeExisting, ...safeFallback];
  const deduplicated = deduplicateFrontendJobs(combinedRaw);

  // Sort by publication date descending
  deduplicated.sort((a, b) => {
    const timeA = a.postedAt
      ? new Date(a.postedAt).getTime()
      : (a.createdAt ? new Date(a.createdAt).getTime() : (a.fetchedAt ? new Date(a.fetchedAt).getTime() : 0));
    const timeB = b.postedAt
      ? new Date(b.postedAt).getTime()
      : (b.createdAt ? new Date(b.createdAt).getTime() : (b.fetchedAt ? new Date(b.fetchedAt).getTime() : 0));
    return timeB - timeA;
  });

  return deduplicated;
}
