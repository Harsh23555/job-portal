import { describe, it } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { generateCoverLetter } from '../services/coverLetterService.js';
import { User } from '../models/user.model.js';
import { ExternalJobApplication } from '../models/externalJobApplication.model.js';
import { calculateTransparentMatchScore } from '../services/resumeMatchService.js';
import { extractResumeText } from '../utils/resumeExtractor.js';

describe('Candidate RAG & Auto-Apply Pipeline Tests', () => {

  describe('User Model — Candidate Profile & Auto-Apply Fields', () => {
    it('initializes default auto-apply configuration', () => {
      const user = new User({
        fullname: 'Test Candidate',
        email: 'candidate@test.com',
        phoneNumber: 9876543210,
        password: 'password123',
        role: 'student'
      });

      assert.strictEqual(user.profileConfirmed, false);
      assert.strictEqual(user.autoApplyConfig.enabled, false);
      assert.strictEqual(user.autoApplyConfig.minMatchScore, 75);
      assert.strictEqual(user.autoApplyConfig.maxApplicationsPerDay, 5);
      assert.strictEqual(user.autoApplyConfig.emergencyStop, false);
      assert.deepStrictEqual(user.autoApplyConfig.excludedCompanies, []);
    });

    it('stores structured candidateProfile and resumeEmbedding', () => {
      const user = new User({
        fullname: 'AI Engineer',
        email: 'ai@test.com',
        phoneNumber: 9876543211,
        password: 'password123',
        role: 'student',
        profileConfirmed: true,
        candidateProfile: {
          headline: 'Full-Stack & ML Developer',
          summary: 'Experienced with React, Node, and Python',
          skills: ['React', 'Node.js', 'Python', 'FastAPI'],
          experienceYears: 4,
          experience: [{ role: 'Software Engineer', company: 'Tech Corp', duration: '2 years' }],
          education: [{ degree: 'B.Tech CS', institution: 'State University', year: 2022 }],
          preferredJobTypes: ['Full-time', 'Remote'],
          preferredLocations: ['Remote', 'Bengaluru']
        },
        resumeEmbedding: {
          vector: [0.1, 0.2, 0.3],
          modelVersion: 'all-MiniLM-L6-v2',
          updatedAt: new Date()
        }
      });

      assert.strictEqual(user.profileConfirmed, true);
      assert.strictEqual(user.candidateProfile.skills.length, 4);
      assert.strictEqual(user.candidateProfile.experienceYears, 4);
      assert.strictEqual(user.resumeEmbedding.vector.length, 3);
      assert.strictEqual(user.resumeEmbedding.modelVersion, 'all-MiniLM-L6-v2');
    });
  });

  describe('ExternalJobApplication Model — Lifecycle Statuses', () => {
    it('supports all extended application statuses', () => {
      const validStatuses = [
        'recommended',
        'saved',
        'awaiting_review',
        'ready_to_apply',
        'submitted',
        'submission_failed',
        'assessment_requested',
        'interview',
        'rejected',
        'offer_received'
      ];

      for (const status of validStatuses) {
        const app = new ExternalJobApplication({
          userId: new mongoose.Types.ObjectId(),
          jobSnapshot: {
            title: 'Senior Python Engineer',
            companyName: 'Acme Corp'
          },
          status
        });
        const err = app.validateSync();
        assert.ifError(err, `Status "${status}" should be valid`);
      }
    });

    it('rejects invalid application status', () => {
      const app = new ExternalJobApplication({
        userId: new mongoose.Types.ObjectId(),
        jobSnapshot: {
          title: 'Senior Python Engineer'
        },
        status: 'invalid_status_xyz'
      });
      const err = app.validateSync();
      assert.ok(err?.errors?.status, 'Invalid status should trigger validation error');
    });
  });

  describe('Cover Letter Service — Grounded Generation & Fallback', () => {
    it('generates grounded cover letter using candidate profile data without hallucination', async () => {
      const user = {
        fullname: 'Alex Morgan',
        candidateProfile: {
          headline: 'React & Node.js Developer',
          skills: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL'],
          experienceYears: 3,
          experience: [{ role: 'Full Stack Engineer', company: 'CloudScale', duration: '2023-Present' }]
        }
      };

      const job = {
        title: 'Senior Frontend Developer',
        companyName: 'InnovateX',
        location: 'Remote',
        description: 'Looking for a Senior React & TypeScript developer with 3+ years experience.'
      };

      const result = await generateCoverLetter(user, job);

      assert.ok(result.coverLetter, 'Cover letter text should be returned');
      assert.ok(result.coverLetter.includes('Alex Morgan'), 'Includes applicant name');
      assert.ok(result.coverLetter.includes('InnovateX'), 'Includes company name');
      assert.ok(result.coverLetter.includes('Senior Frontend Developer'), 'Includes job title');
    });

    it('handles candidate with minimal profile gracefully', async () => {
      const result = await generateCoverLetter(
        { fullname: 'Jordan Lee' },
        { title: 'Backend Developer', companyName: 'DataCorp' }
      );

      assert.ok(result.coverLetter.includes('Jordan Lee'));
      assert.ok(result.coverLetter.includes('DataCorp'));
    });
  });

  describe('Resume Match Service — Transparent Scoring & Explanations', () => {
    it('calculates transparent match score with reasons breakdown and disclaimer', () => {
      const job = {
        title: 'Full Stack React Engineer',
        requirements: ['React', 'Node.js', 'TypeScript', 'MongoDB'],
        skills: ['React', 'Node.js', 'TypeScript', 'MongoDB']
      };

      const profile = {
        headline: 'React Full Stack Developer',
        skills: ['React', 'Node.js', 'TypeScript', 'Docker', 'Git'],
        experienceYears: 3
      };

      const match = calculateTransparentMatchScore({ job, profile, vectorSimilarity: 0.85 });

      assert.ok(match.matchScore >= 50, 'High relevance job should have strong match score');
      assert.ok(Array.isArray(match.matchedSkills), 'matchedSkills should be an array');
      assert.ok(match.matchedSkills.includes('react'), 'react should be in matchedSkills');
      assert.ok(Array.isArray(match.reasons), 'reasons should be an array');
      assert.ok(match.reasons.length > 0, 'Should include at least one explanation reason');
      assert.strictEqual(typeof match.explanation, 'string', 'Should return explanation summary string');
      assert.ok(match.scoreDisclaimer.includes('Algorithmic match score reflects resume relevance'), 'Must include legal disclaimer');
    });
  });

  describe('Resume Extractor — Unsupported File Types', () => {
    it('rejects unsupported file formats gracefully', async () => {
      await assert.rejects(
        async () => {
          await extractResumeText(
            Buffer.from('binary-png-header-data'),
            'resume.png',
            'image/png'
          );
        },
        /Unsupported resume file format/
      );
    });
  });
});
