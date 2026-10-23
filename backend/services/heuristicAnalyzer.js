import { validateAnalysis } from "../utils/analysisValidator.js";

/** Local heuristic resume analyzer fallback. */
export function generateLocalResumeAnalysis(resumeText = "") {
  const text = resumeText || "";
  const lower = text.toLowerCase();

  // 1. Detect Experience Level
  let level = "Entry Level";
  let reason = "Candidate demonstrates foundational skills and relevant academic or initial project experience.";
  const evidence = [];

  const yearMatch = text.match(/(\d+)\+?\s*years?(?:\s+of)?\s+experience/i);
  const years = yearMatch ? parseInt(yearMatch[1], 10) : 0;

  if (years >= 5 || lower.includes("senior software engineer") || lower.includes("lead engineer") || lower.includes("staff engineer")) {
    level = "Senior";
    reason = `Demonstrated ${years > 0 ? years + "+ years" : "substantial industry track record"} with leadership, architecture, and advanced system design capabilities.`;
    evidence.push(yearMatch ? yearMatch[0] : "Senior engineering responsibilities observed in work history");
  } else if (years >= 2 || lower.includes("software engineer") || lower.includes("full stack engineer") || lower.includes("web developer")) {
    level = "Mid Level";
    reason = `Documented professional engineering roles and proven capability across production codebases.`;
    if (yearMatch) evidence.push(yearMatch[0]);
    evidence.push("Multiple production projects and end-to-end feature delivery documented");
  } else if (lower.includes("intern") || lower.includes("student") || lower.includes("fresher") || lower.includes("graduate")) {
    level = "Junior";
    reason = "Academic foundation and internship or personal project experience demonstrated.";
    evidence.push("Internship experience and academic coursework documented");
  }

  // 2. Skill Catalog Definition & Extraction
  const CATALOG = {
    programming_languages: [
      { name: "JavaScript", regex: /\bjavascript\b|\bes6\b|\bjs\b/i },
      { name: "TypeScript", regex: /\btypescript\b|\bts\b/i },
      { name: "Python", regex: /\bpython\b/i },
      { name: "Java", regex: /\bjava\b(?!script)/i },
      { name: "C++", regex: /\bc\+\+\b/i },
      { name: "Go", regex: /\bgolang\b|\bgo\b/i },
      { name: "SQL", regex: /\bsql\b/i },
      { name: "HTML5", regex: /\bhtml5?\b/i },
      { name: "CSS3", regex: /\bcss3?\b/i },
    ],
    frameworks: [
      { name: "React.js", regex: /\breact(?:\.js)?\b/i },
      { name: "Next.js", regex: /\bnext(?:\.js)?\b/i },
      { name: "Node.js", regex: /\bnode(?:\.js)?\b/i },
      { name: "Express.js", regex: /\bexpress(?:\.js)?\b/i },
      { name: "Vue.js", regex: /\bvue(?:\.js)?\b/i },
      { name: "Angular", regex: /\bangular\b/i },
      { name: "Redux", regex: /\bredux\b/i },
      { name: "Tailwind CSS", regex: /\btailwind(?:\s*css)?\b/i },
      { name: "Bootstrap", regex: /\bbootstrap\b/i },
    ],
    databases: [
      { name: "MongoDB", regex: /\bmongodb\b|\bmongo\b/i },
      { name: "PostgreSQL", regex: /\bpostgres(?:ql)?\b/i },
      { name: "MySQL", regex: /\bmysql\b/i },
      { name: "Redis", regex: /\bredis\b/i },
      { name: "DynamoDB", regex: /\bdynamodb\b/i },
    ],
    cloud_devops: [
      { name: "AWS", regex: /\baws\b|\bamazon web services\b|\bec2\b|\bs3\b/i },
      { name: "Docker", regex: /\bdocker\b/i },
      { name: "Kubernetes", regex: /\bkubernetes\b|\bk8s\b/i },
      { name: "CI/CD", regex: /\bci\/cd\b|\bgithub actions\b|\bjenkins\b/i },
      { name: "Nginx", regex: /\bnginx\b/i },
      { name: "Linux", regex: /\blinux\b/i },
    ],
    tools: [
      { name: "Git", regex: /\bgit\b|\bgithub\b/i },
      { name: "Postman", regex: /\bpostman\b/i },
      { name: "Jest", regex: /\bjest\b/i },
      { name: "Vite", regex: /\bvite\b/i },
      { name: "Figma", regex: /\bfigma\b/i },
      { name: "Webpack", regex: /\bwebpack\b/i },
    ],
    technical_skills: [
      { name: "RESTful APIs", regex: /\brest(?:ful)?\s*apis?\b/i },
      { name: "Microservices", regex: /\bmicroservices?\b/i },
      { name: "GraphQL", regex: /\bgraphql\b/i },
      { name: "System Design", regex: /\bsystem design\b|\barchitecture\b/i },
      { name: "JWT Authentication", regex: /\bjwt\b|\bauthentication\b/i },
      { name: "Data Structures & Algorithms", regex: /\bdsa\b|\bdata structures\b|\bleetcode\b/i },
    ],
    soft_skills: [
      { name: "Agile / Scrum", regex: /\bagile\b|\bscrum\b/i },
      { name: "Code Review", regex: /\bcode review\b/i },
      { name: "Team Leadership", regex: /\bleadership\b|\bmentored\b|\bled team\b/i },
      { name: "Cross-Functional Collaboration", regex: /\bcollaboration\b|\bcross-functional\b/i },
    ],
    domain_skills: [
      { name: "E-Commerce", regex: /\be-commerce\b|\bcheckout\b|\bstripe\b/i },
      { name: "Analytics & Dashboards", regex: /\banalytics\b|\bdashboard\b/i },
      { name: "Cloud Infrastructure", regex: /\bcloud\b|\binfrastructure\b/i },
    ],
  };

  const detectedSkills = {};
  for (const [cat, list] of Object.entries(CATALOG)) {
    detectedSkills[cat] = [];
    for (const item of list) {
      if (item.regex.test(text)) {
        let status = "explicitly_mentioned";
        if (/experience|responsibilities|work history/i.test(text) && item.regex.test(text.slice(text.indexOf("EXPERIENCE") || 0))) {
          status = "demonstrated_in_experience";
        } else if (/projects?/i.test(text)) {
          status = "demonstrated_in_project";
        }
        detectedSkills[cat].push({ name: item.name, status });
      }
    }
  }

  // 3. Extract Strengths
  const strengths = [];
  if (detectedSkills.frameworks.some((f) => f.name.includes("React")) && detectedSkills.frameworks.some((f) => f.name.includes("Node"))) {
    strengths.push({
      title: "Comprehensive Full Stack Capability",
      description: "Proven front-to-back delivery utilizing modern React interfaces and Node.js backend services.",
      evidence: "Demonstrated React.js and Node.js microservices in experience and projects.",
    });
  }
  if (detectedSkills.databases.some((d) => d.name === "Redis") || /\b4[0-9]%|\b3[0-9]%/i.test(text)) {
    strengths.push({
      title: "Quantified Performance Optimization",
      description: "Features tangible engineering metrics showing measurable performance and latency improvements.",
      evidence: "Specific metrics documented: reduced latency, caching efficiency, and throughput improvements.",
    });
  }
  if (detectedSkills.cloud_devops.some((c) => c.name === "Docker" || c.name === "AWS")) {
    strengths.push({
      title: "Cloud & Containerization Proficiency",
      description: "Practical familiarity deploying scalable services using Docker containers and cloud infrastructure.",
      evidence: "AWS and Docker deployments documented in professional experience.",
    });
  }
  if (strengths.length === 0) {
    strengths.push({
      title: "Solid Engineering Core",
      description: "Strong foundation in software engineering fundamentals and modern web technologies.",
      evidence: "Verified skill set and technical projects in resume.",
    });
  }

  // 4. Missing Skills / Gaps
  const missing_skills = [];
  if (!detectedSkills.tools.some((t) => t.name === "Jest")) {
    missing_skills.push({
      skill: "Automated Unit & E2E Testing (Jest / Cypress)",
      importance: "high",
      reason: "High-value engineering teams require verifiable test coverage for enterprise pull requests.",
      recommended_action: "Add unit tests to existing projects using Jest, Vitest, or Cypress.",
    });
  }
  if (!detectedSkills.cloud_devops.some((c) => c.name === "Kubernetes")) {
    missing_skills.push({
      skill: "Kubernetes (K8s) Orchestration",
      importance: "medium",
      reason: "Crucial for large-scale microservice clustering and cloud-native architecture.",
      recommended_action: "Explore Minikube or deploy a multi-service pod to AWS EKS.",
    });
  }
  if (!detectedSkills.technical_skills.some((ts) => ts.name === "GraphQL")) {
    missing_skills.push({
      skill: "GraphQL API Design",
      importance: "low",
      reason: "Common in modern frontend data-fetching and mobile BFF architectures.",
      recommended_action: "Build an Apollo Server / Client playground integration.",
    });
  }

  // 5. Weak Areas
  const weak_areas = [];
  if (!/leetcode|hackerrank|codeforces/i.test(text)) {
    weak_areas.push({
      area: "Algorithms & Competitive Problem Solving",
      problem: "No verified algorithmic profile or LeetCode ranking cited.",
      improvement: "Mention problem-solving benchmarks or competitive programming ratings.",
    });
  }
  weak_areas.push({
    area: "Quantified Business Impact",
    problem: "Some project bullet points describe features without explicit user or revenue impact metrics.",
    improvement: "Augment bullets with user counts, transaction volume, or latency reduction percentages.",
  });

  // 6. Job Recommendations
  const isFullStack = detectedSkills.frameworks.some((f) => f.name.includes("React")) && detectedSkills.frameworks.some((f) => f.name.includes("Node"));
  const recommended_jobs = [
    {
      role: isFullStack ? "Full Stack Software Engineer" : "Frontend Engineer",
      match_level: "strong",
      match_score: isFullStack ? 92 : 86,
      why_match: [
        "Direct alignment with React.js frontend and Node.js REST API stacks.",
        "Demonstrated database design with MongoDB / PostgreSQL and state management.",
      ],
      demonstrated_skills: [
        ...detectedSkills.programming_languages.slice(0, 2).map((s) => s.name),
        ...detectedSkills.frameworks.slice(0, 2).map((s) => s.name),
        ...detectedSkills.databases.slice(0, 1).map((s) => s.name),
      ],
      missing_skills: ["Kubernetes", "E2E Testing"],
      next_steps: [
        "Prepare system design walkthroughs for distributed web apps.",
        "Review concurrency and caching patterns with Redis.",
      ],
    },
    {
      role: "Backend / Microservices Engineer",
      match_level: "good",
      match_score: 84,
      why_match: [
        "Strong RESTful microservice development experience using Node.js and Express.",
        "Database optimization and Redis caching layer implementation.",
      ],
      demonstrated_skills: ["Node.js", "Express.js", "MongoDB", "PostgreSQL", "Redis"],
      missing_skills: ["Go / Java", "Kafka / Message Queues"],
      next_steps: [
        "Study event-driven architectures with Apache Kafka or RabbitMQ.",
      ],
    },
    {
      role: "Frontend Developer (React / TypeScript)",
      match_level: "strong",
      match_score: 89,
      why_match: [
        "Deep expertise in React.js, TypeScript, Tailwind CSS, and state management.",
        "Proven experience creating responsive, accessible UI modules.",
      ],
      demonstrated_skills: ["React.js", "TypeScript", "Tailwind CSS", "JavaScript"],
      missing_skills: ["Next.js App Router (advanced)", "Web Vitals Optimization"],
      next_steps: [
        "Showcase interactive UI components on GitHub or live portfolio demo.",
      ],
    },
  ];

  // 7. Resume Improvements
  const resume_improvements = [
    {
      priority: "high",
      section: "Experience",
      problem: "Bullet points can follow Google's X-Y-Z formula more rigorously (Accomplished [X] as measured by [Y], by doing [Z]).",
      recommendation: "Rephrase bullet points to highlight business impact followed by technical implementation.",
    },
    {
      priority: "medium",
      section: "Technical Skills",
      problem: "List tools by proficiency or verified production usage rather than an unranked list.",
      recommendation: "Categorize skills explicitly by 'Core Proficiencies' vs 'Familiar Technologies'.",
    },
    {
      priority: "low",
      section: "Certifications",
      problem: "Verify credential expiration dates and include verification links.",
      recommendation: "Add credential ID numbers or direct verification badges.",
    },
  ];

  // 8. Learning Priorities
  const learning_priorities = [
    {
      skill: "System Design & Distributed Systems",
      priority: "high",
      reason: "Differentiates mid-level engineers from senior roles in technical interviews.",
    },
    {
      skill: "Kubernetes & Cloud Infrastructure (Terraform)",
      priority: "medium",
      reason: "Critical for modern DevOps workflows and infrastructure-as-code automation.",
    },
    {
      skill: "Event-Driven Architecture (Kafka / BullMQ)",
      priority: "medium",
      reason: "Expands backend scalability for high-concurrency enterprise workloads.",
    },
  ];

  // Summary
  const summaryName = text.split("\n")[0] || "Candidate";
  const summary = `${summaryName.trim()} is an accomplished ${level} candidate with verifiable proficiency in ${detectedSkills.programming_languages.map((l) => l.name).slice(0, 3).join(", ")}, modern frameworks (${detectedSkills.frameworks.map((f) => f.name).slice(0, 3).join(", ")}), and database architectures. The profile displays strong practical problem-solving capabilities, clear technical ownership, and competitive alignment for modern product engineering roles.`;

  const rawAnalysis = {
    summary,
    experience_level: {
      level,
      reason,
      evidence,
    },
    strengths,
    skills: detectedSkills,
    missing_skills,
    weak_areas,
    recommended_jobs,
    resume_improvements,
    learning_priorities,
  };

  const validated = validateAnalysis(rawAnalysis);
  return validated.sanitized;
}
