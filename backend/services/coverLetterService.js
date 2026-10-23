import axios from "axios";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const LLM_MODEL = process.env.RAG_LLM_MODEL || "llama-3.3-70b-versatile";

export function buildCoverLetterPrompt(user, job, analysis) {
  const candidateProfile = user?.candidateProfile || {};
  const skills = analysis?.skills_and_technologies?.primary_skills || candidateProfile.skills || [];
  const userSkills = user?.profile?.skills || [];
  const allSkills = [...new Set([...skills, ...userSkills])].slice(0, 10).join(", ");
  const summary = candidateProfile.summary || analysis?.professional_summary || user?.profile?.bio || "";
  const yearsExp = candidateProfile.experienceYears || analysis?.total_years_experience || user?.profile?.yearsOfExperience || "several";
  const jobSkills = (job.skills || []).slice(0, 6).join(", ");
  const jobDescSnippet = (job.description || "").slice(0, 400);

  return {
    system:
      "You are an expert AI career agent that prepares authentic job applications for candidates. Write an authentic, compelling, 3-4 sentence cover letter paragraph tailored to the specific role using ONLY the applicant's verified profile data and skills. Never invent experience, companies, or qualifications. Return JSON only.",
    user: `Tailor this application for the candidate based on their confirmed profile:

Applicant Profile:
- Full Name: ${user.fullname || "Applicant"}
- Summary/Bio: ${summary || "Dedicated professional with proven domain expertise"}
- Verified Skills: ${allSkills || "Technical skills, communication, problem solving"}
- Years of Experience: ${yearsExp}

Target Job:
- Title: ${job.title}
- Company: ${job.companyName || "the organization"}
- Required Skills: ${jobSkills || "Technical skills relevant to role"}
- Location: ${job.location || ""}
- Description: ${jobDescSnippet}

Output JSON strictly as: { "coverLetter": "<3-4 sentence tailored cover letter body in first person, professional, no greetings, no closing signature>" }`,
  };
}

export function generateFallbackCoverLetter(user = {}, job = {}, analysis = {}) {
  const candidateProfile = user?.candidateProfile || {};
  const skills = analysis?.skills_and_technologies?.primary_skills || candidateProfile.skills || [];
  const userSkills = user?.profile?.skills || [];
  const allSkills = [...new Set([...skills, ...userSkills])];
  const name = user?.fullname || "I";
  const yearsExp = candidateProfile.experienceYears || analysis?.total_years_experience;
  const title = job?.title || "role";
  const company = job?.companyName || job?.company?.name || "your organization";

  const expStr = yearsExp ? ` with ${yearsExp}+ years of experience` : "";
  const skillStr = allSkills.length > 0 ? ` My core competencies include ${allSkills.slice(0, 4).join(", ")}.` : "";

  const letter = `${name} am excited to submit my application for the ${title} role at ${company}${expStr}.${skillStr} I am confident my demonstrated background aligns well with the requirements of this position and I welcome the opportunity to contribute to your team. I look forward to discussing how my skills and experience can deliver impact at ${company}.`;

  return { text: letter, coverLetter: letter, model: "local-template" };
}

export async function generateCoverLetter(user, job, analysis) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return generateFallbackCoverLetter(user, job, analysis);
  }

  try {
    const { system, user: userPrompt } = buildCoverLetterPrompt(user, job, analysis);
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: LLM_MODEL,
        temperature: 0.6,
        max_tokens: 300,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 12000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content);
    if (parsed?.coverLetter && typeof parsed.coverLetter === "string") {
      const letter = parsed.coverLetter.trim();
      return { text: letter, coverLetter: letter, model: LLM_MODEL };
    }
  } catch {
    // Fall through to local generation
  }

  return generateFallbackCoverLetter(user, job, analysis);
}
