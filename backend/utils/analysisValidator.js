/** Validates and normalizes AI resume analysis response. */
export function validateAnalysis(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, sanitized: null, errors: ["Analysis response must be a JSON object."] };
  }

  // Sanitizer helpers
  const cleanStr = (val, fallback = "") => (typeof val === "string" ? val.trim() : fallback);
  const cleanArr = (val) => (Array.isArray(val) ? val : []);
  const validEnums = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);

  // 1. Summary
  const summary = cleanStr(raw.summary);
  if (!summary) errors.push("Missing or invalid summary.");

  // 2. Experience level
  const expLevelRaw = raw.experience_level || {};
  const allowedLevels = ["Student", "Entry Level", "Junior", "Mid Level", "Senior", "Insufficient evidence"];
  const expLevel = {
    level: validEnums(expLevelRaw.level, allowedLevels, "Insufficient evidence"),
    reason: cleanStr(expLevelRaw.reason, "Assessed from documented experience and education."),
    evidence: cleanArr(expLevelRaw.evidence).map((e) => cleanStr(e)).filter(Boolean),
  };

  // 3. Strengths
  const strengths = cleanArr(raw.strengths).map((s) => ({
    title: cleanStr(s?.title, "Strength"),
    description: cleanStr(s?.description, ""),
    evidence: cleanStr(s?.evidence, "Observed in resume."),
  })).filter((s) => s.title && (s.description || s.evidence));

  if (strengths.length === 0) {
    strengths.push({
      title: "Identified Experience",
      description: "Resume provides documented skills and background.",
      evidence: "Resume text reviewed.",
    });
  }

  // 4. Skills
  const rawSkills = raw.skills || {};
  const skillCategories = [
    "programming_languages",
    "frameworks",
    "databases",
    "cloud_devops",
    "tools",
    "technical_skills",
    "soft_skills",
    "domain_skills",
  ];
  const allowedStatuses = [
    "explicitly_mentioned",
    "demonstrated_in_project",
    "demonstrated_in_experience",
    "inferred",
  ];

  const skills = {};
  for (const cat of skillCategories) {
    skills[cat] = cleanArr(rawSkills[cat])
      .map((item) => {
        if (typeof item === "string") {
          return { name: item.trim(), status: "explicitly_mentioned" };
        }
        return {
          name: cleanStr(item?.name),
          status: validEnums(item?.status, allowedStatuses, "explicitly_mentioned"),
        };
      })
      .filter((s) => Boolean(s.name));
  }

  // 5. Missing skills
  const allowedImportances = ["high", "medium", "low"];
  const missing_skills = cleanArr(raw.missing_skills).map((m) => ({
    skill: cleanStr(m?.skill, "Required Skill"),
    importance: validEnums(String(m?.importance).toLowerCase(), allowedImportances, "medium"),
    reason: cleanStr(m?.reason, "Valuable for targeted career roles."),
    recommended_action: cleanStr(m?.recommended_action, "Build a project or take a course in this topic."),
  })).filter((m) => Boolean(m.skill));

  // 6. Weak areas
  const weak_areas = cleanArr(raw.weak_areas).map((w) => ({
    area: cleanStr(w?.area, "Resume Section"),
    problem: cleanStr(w?.problem, "Needs additional detail or measurable metrics."),
    improvement: cleanStr(w?.improvement, "Add quantified achievements and specific technology usage."),
  })).filter((w) => Boolean(w.area));

  // 7. Recommended jobs
  const allowedMatchLevels = ["strong", "good", "partial"];
  const recommended_jobs = cleanArr(raw.recommended_jobs).map((job) => {
    let score = parseInt(job?.match_score, 10);
    if (isNaN(score) || score < 0) score = 0;
    if (score > 100) score = 100;

    return {
      role: cleanStr(job?.role, "Software Role"),
      match_level: validEnums(String(job?.match_level).toLowerCase(), allowedMatchLevels, "good"),
      match_score: score,
      why_match: cleanArr(job?.why_match).map(cleanStr).filter(Boolean),
      demonstrated_skills: cleanArr(job?.demonstrated_skills).map(cleanStr).filter(Boolean),
      missing_skills: cleanArr(job?.missing_skills).map(cleanStr).filter(Boolean),
      next_steps: cleanArr(job?.next_steps).map(cleanStr).filter(Boolean),
    };
  }).filter((j) => Boolean(j.role));

  // 8. Resume improvements
  const allowedPriorities = ["high", "medium", "low"];
  const resume_improvements = cleanArr(raw.resume_improvements).map((imp) => ({
    priority: validEnums(String(imp?.priority).toLowerCase(), allowedPriorities, "medium"),
    section: cleanStr(imp?.section, "General"),
    problem: cleanStr(imp?.problem, "Can be refined for greater clarity."),
    recommendation: cleanStr(imp?.recommendation, "Provide direct action verbs and quantifiable results."),
  })).filter((imp) => Boolean(imp.problem || imp.recommendation));

  // 9. Learning priorities
  const learning_priorities = cleanArr(raw.learning_priorities).map((lp) => ({
    skill: cleanStr(lp?.skill, "Key Skill"),
    priority: validEnums(String(lp?.priority).toLowerCase(), allowedPriorities, "medium"),
    reason: cleanStr(lp?.reason, "Enhances candidate competitiveness in the job market."),
  })).filter((lp) => Boolean(lp.skill));

  // Composite score (0 - 100)
  let avgJobScore = 70;
  if (recommended_jobs.length > 0) {
    const total = recommended_jobs.reduce((acc, j) => acc + j.match_score, 0);
    avgJobScore = Math.round(total / recommended_jobs.length);
  }
  const totalSkillsCount = Object.values(skills).reduce((acc, arr) => acc + arr.length, 0);
  const skillBreadthScore = Math.min(Math.round((totalSkillsCount / 12) * 100), 100);
  const overall_score = Math.round(avgJobScore * 0.7 + skillBreadthScore * 0.3);

  const sanitized = {
    overall_score: Math.max(10, Math.min(overall_score, 98)),
    summary,
    experience_level: expLevel,
    strengths,
    skills,
    missing_skills,
    weak_areas,
    recommended_jobs,
    resume_improvements,
    learning_priorities,
  };

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}
