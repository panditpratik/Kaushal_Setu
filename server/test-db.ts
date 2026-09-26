import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function run() {
  const [
    users,
    trainees,
    employers,
    providers,
    cohorts,
    courses,
    certifications,
    assessments,
    skillGaps,
    interventions,
    outcomes,
    followUps,
    auditLogs
  ] = await Promise.all([
    p.user.count(),
    p.trainee.count(),
    p.employer.count(),
    p.trainingProvider.count(),
    p.cohort.count(),
    p.course.count(),
    p.certification.count(),
    p.skillAssessment.count(),
    p.skillGap.count(),
    p.intervention.count(),
    p.outcome.count(),
    p.followUp.count(),
    p.auditLog.count()
  ]);

  console.log('=== VERIFIED POSTGRESQL COUNTS ===');
  console.log({
    users,
    trainees,
    employers,
    providers,
    cohorts,
    courses,
    certifications,
    assessments,
    skillGaps,
    interventions,
    outcomes,
    followUps,
    auditLogs
  });
  console.log('==================================');
}

run()
  .catch(console.error)
  .finally(() => p.$disconnect());
