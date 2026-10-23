import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/user.model.js";
import { Company } from "./models/company.model.js";
import { Job } from "./models/job.model.js";
import bcrypt from "bcryptjs";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

const SEED_COMPANIES = [
  { name: "Vercel", description: "The platform for frontend developers, powering the web.", website: "https://vercel.com", location: "Remote" },
  { name: "Stripe", description: "Payment infrastructure for the modern internet.", website: "https://stripe.com", location: "San Francisco, CA" },
  { name: "Linear", description: "The issue tracker built for high-performance teams.", website: "https://linear.app", location: "San Francisco, CA" },
  { name: "Notion", description: "One workspace for every team, every workflow.", website: "https://notion.so", location: "Remote" },
  { name: "Supabase", description: "The open source Firebase alternative for developers.", website: "https://supabase.com", location: "Remote-first" },
  { name: "Figma", description: "Where teams design, prototype, and collaborate.", website: "https://figma.com", location: "San Francisco, CA" },
  { name: "Spotify", description: "The world leader in streaming entertainment.", website: "https://spotify.com", location: "New York, NY" },
  { name: "Cloudflare", description: "Making the internet faster, safer, and more reliable.", website: "https://cloudflare.com", location: "Remote" },
  { name: "Airbnb", description: "A community of hosts. Millions of guests. Belong anywhere.", website: "https://airbnb.com", location: "San Francisco, CA" },
  { name: "Coursera", description: "EdTech platform offering courses and degrees online.", website: "https://coursera.org", location: "Remote" }
];

const SEED_JOBS = [
  // Vercel
  { title: "Senior Frontend Engineer", description: "We are looking for a Senior Frontend Engineer to join our core team. You will build the Vercel dashboard and optimize web performance.", requirements: ["React", "TypeScript", "Next.js", "TailwindCSS"], salary: 2600000, experiencelevel: 5, location: "Remote", jobType: "Full-time", position: 2, companyName: "Vercel" },
  { title: "Developer Advocate", description: "Represent Vercel and Next.js in the developer community. Create content, speak at events, and collect feedback.", requirements: ["Next.js", "React", "Public Speaking", "Writing"], salary: 1600000, experiencelevel: 3, location: "Remote", jobType: "Full-time", position: 1, companyName: "Vercel" },
  // Stripe
  { title: "Data Scientist", description: "Analyze transaction data, optimize fraud models, and build reliable prediction endpoints.", requirements: ["Python", "SQL", "Machine Learning", "Pandas"], salary: 2400000, experiencelevel: 4, location: "New York, NY", jobType: "Hybrid", position: 1, companyName: "Stripe" },
  { title: "Backend Engineer (Payments)", description: "Build scalable API endpoints to support multi-currency payment workflows global transactions.", requirements: ["Ruby", "Go", "Distributed Systems", "SQL"], salary: 2800000, experiencelevel: 5, location: "San Francisco, CA", jobType: "Full-time", position: 3, companyName: "Stripe" },
  // Linear
  { title: "Product Designer", description: "Own the end-to-end design lifecycle of high-performance task management features.", requirements: ["Figma", "Interaction Design", "Prototyping", "UI/UX"], salary: 2000000, experiencelevel: 4, location: "San Francisco, CA", jobType: "Full-time", position: 1, companyName: "Linear" },
  { title: "Frontend Engineer (Desktop)", description: "Work on our high-performance Electron client and local-first data sync architectures.", requirements: ["React", "TypeScript", "Electron", "SQLite"], salary: 1800000, experiencelevel: 3, location: "Remote", jobType: "Full-time", position: 2, companyName: "Linear" },
  // Notion
  { title: "UI/UX Designer", description: "Design collaborative spaces, wiki structures, and documentation tools for modern teams.", requirements: ["Figma", "Systems Design", "User Testing", "Visual Design"], salary: 1500000, experiencelevel: 3, location: "Remote", jobType: "Full-time", position: 1, companyName: "Notion" },
  { title: "Performance Marketing Manager", description: "Drive acquisition across Google, Meta, and LinkedIn channels. Optimize campaign metrics.", requirements: ["Google Ads", "Analytics", "A/B Testing", "SEO"], salary: 1400000, experiencelevel: 3, location: "Remote", jobType: "Full-time", position: 1, companyName: "Notion" },
  // Supabase
  { title: "PostgreSQL Database Engineer", description: "Help scale and optimize PG extensions. Contribute to open-source Supabase libraries.", requirements: ["PostgreSQL", "Go", "C", "Database Internals"], salary: 3000000, experiencelevel: 6, location: "Remote", jobType: "Full-time", position: 1, companyName: "Supabase" },
  { title: "Full Stack Developer", description: "Build modern dashboards, connect open source tools, and write client SDKs.", requirements: ["TypeScript", "Next.js", "Postgres", "Node.js"], salary: 1600000, experiencelevel: 3, location: "Remote", jobType: "Full-time", position: 2, companyName: "Supabase" },
  // Figma
  { title: "Design Systems Engineer", description: "Bridge the gap between design and engineering. Build scalable UI libraries used by thousands.", requirements: ["React", "TypeScript", "Storybook", "Design Tokens"], salary: 2200000, experiencelevel: 4, location: "San Francisco, CA", jobType: "Hybrid", position: 2, companyName: "Figma" },
  { title: "Brand Identity Designer", description: "Craft visual identities, marketing assets, and conference materials for Figma Config.", requirements: ["Illustrator", "Photoshop", "Brand Strategy", "Figma"], salary: 1300000, experiencelevel: 3, location: "San Francisco, CA", jobType: "Full-time", position: 1, companyName: "Figma" },
  // Spotify
  { title: "Machine Learning Engineer (Recommendations)", description: "Optimize recommendation algorithms powering Discover Weekly and radio streams.", requirements: ["Python", "Scala", "Spark", "Recommendation Systems"], salary: 3200000, experiencelevel: 5, location: "New York, NY", jobType: "Full-time", position: 2, companyName: "Spotify" },
  { title: "iOS Developer", description: "Implement audio streaming pipelines, offline sync, and premium playback features.", requirements: ["Swift", "CoreAudio", "UIKit", "Combine"], salary: 2400000, experiencelevel: 4, location: "New York, NY", jobType: "Hybrid", position: 3, companyName: "Spotify" },
  // Cloudflare
  { title: "Systems Engineer (Rust)", description: "Improve the speed and safety of our global edge network. Design caching protocols.", requirements: ["Rust", "C++", "Networking Protocols", "Linux Systems"], salary: 3000000, experiencelevel: 5, location: "Remote", jobType: "Full-time", position: 2, companyName: "Cloudflare" },
  { title: "Security Operations Analyst", description: "Monitor logs, mitigate DDoS threats, and respond to edge server incidents.", requirements: ["IDS/IPS", "Security Auditing", "Python", "Linux"], salary: 1400000, experiencelevel: 3, location: "Remote", jobType: "Full-time", position: 1, companyName: "Cloudflare" },
  // Airbnb
  { title: "SRE (Platform Reliability)", description: "Maintain uptime across microservices. Automate failover mechanisms and monitor metrics.", requirements: ["Kubernetes", "AWS", "Terraform", "Python"], salary: 2600000, experiencelevel: 4, location: "San Francisco, CA", jobType: "Full-time", position: 2, companyName: "Airbnb" },
  { title: "Staff Android Engineer", description: "Drive architecture decisions for Airbnb's host and guest native Android applications.", requirements: ["Kotlin", "Jetpack Compose", "Coroutines", "Dagger/Hilt"], salary: 4200000, experiencelevel: 7, location: "San Francisco, CA", jobType: "Hybrid", position: 1, companyName: "Airbnb" },
  // Coursera
  { title: "EdTech Product Manager", description: "Define course delivery interfaces, user progress trackers, and certificate verification systems.", requirements: ["Product Management", "EdTech", "SQL", "Agile"], salary: 2200000, experiencelevel: 4, location: "Remote", jobType: "Full-time", position: 1, companyName: "Coursera" },
  { title: "Full Stack Engineer (LMS)", description: "Work on backend course catalogs and frontend learner forums using React and Scala.", requirements: ["React", "Scala", "Java", "GraphQL"], salary: 1600000, experiencelevel: 3, location: "Remote", jobType: "Full-time", position: 2, companyName: "Coursera" },
  // Additional Roles
  { title: "Data Analyst", description: "Build Tableau dashboards, analyze marketing funnels, and present weekly metrics to team leads.", requirements: ["SQL", "Tableau", "Excel", "Data Visualization"], salary: 900000, experiencelevel: 2, location: "Austin, TX", jobType: "Hybrid", position: 1, companyName: "Notion" },
  { title: "Site Reliability Engineer", description: "Own scaling infrastructure and automated release deployments on Vercel Edge networks.", requirements: ["CI/CD", "AWS", "Terraform", "Docker"], salary: 1800000, experiencelevel: 3, location: "Remote", jobType: "Full-time", position: 1, companyName: "Vercel" },
  { title: "Mobile UI Designer", description: "Design layouts and flows for mobile apps with custom animations and tactile feedback.", requirements: ["Figma", "Mobile Design", "Prototyping"], salary: 1400000, experiencelevel: 3, location: "San Francisco, CA", jobType: "Contract", position: 1, companyName: "Linear" },
  { title: "Junior QA Engineer", description: "Write automated tests and perform manual audits for payment processing pipelines.", requirements: ["Cypress", "JavaScript", "Manual Testing", "QA Methodologies"], salary: 600000, experiencelevel: 1, location: "Remote", jobType: "Full-time", position: 2, companyName: "Stripe" },
  { title: "DevOps Architect", description: "Consult on server architectures, load balancing, and database replica synchronization.", requirements: ["AWS", "Kubernetes", "PostgreSQL", "ScyllaDB"], salary: 4800000, experiencelevel: 8, location: "New York, NY", jobType: "Contract", position: 1, companyName: "Supabase" }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    // 1. Create seed users
    const hashedSeederPassword = await bcrypt.hash("password123", 10);

    await User.deleteMany({ email: { $in: ["seeker@jobsphere.com", "recruiter@jobsphere.com"] } });

    const seeker = await User.create({
      fullname: "Jane Doe",
      email: "seeker@jobsphere.com",
      phoneNumber: "1234567890",
      password: hashedSeederPassword,
      role: "student",
      profile: {
        skills: ["React", "Node.js", "TypeScript", "JavaScript", "HTML", "CSS", "SQL", "Git"]
      }
    });
    console.log("Created seeker user: seeker@jobsphere.com / password123");

    const recruiter = await User.create({
      fullname: "Alex Rivera",
      email: "recruiter@jobsphere.com",
      phoneNumber: "9876543210",
      password: hashedSeederPassword,
      role: "recruiter"
    });
    console.log("Created recruiter user: recruiter@jobsphere.com / password123");

    // 2. Clear old seed data
    await Job.deleteMany({});
    console.log("Cleared jobs collection.");

    // Register seed companies if needed
    const companyMap = new Map();
    for (const comp of SEED_COMPANIES) {
      let company = await Company.findOne({ name: comp.name });
      if (!company) {
        company = await Company.create({
          ...comp,
          userId: recruiter._id
        });
        console.log(`Registered company: ${comp.name}`);
      } else {
        console.log(`Using existing company: ${comp.name}`);
      }
      companyMap.set(comp.name, company._id);
    }

    // 3. Create jobs
    const jobsToCreate = SEED_JOBS.map((j) => {
      const companyId = companyMap.get(j.companyName);
      if (!companyId) {
        throw new Error(`Company not found: ${j.companyName}`);
      }
      return {
        title: j.title,
        description: j.description,
        requirements: j.requirements,
        salary: Number(j.salary),
        experiencelevel: j.experiencelevel,
        location: j.location,
        jobType: j.jobType,
        position: j.position,
        company: companyId,
        created_by: recruiter._id
      };
    });

    const createdJobs = await Job.create(jobsToCreate);
    console.log(`Successfully seeded ${createdJobs.length} jobs!`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
