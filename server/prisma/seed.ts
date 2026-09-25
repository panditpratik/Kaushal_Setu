// Kaushal Setu — Seed script
// Run: npx prisma db seed  (with "prisma": { "seed": "ts-node prisma/seed.ts" } in package.json)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean slate for repeatable local seeding
  await prisma.insight.deleteMany();
  await prisma.outcome.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.skillGap.deleteMany();
  await prisma.skillAssessment.deleteMany();
  await prisma.employmentRecord.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.employerFeedback.deleteMany();
  await prisma.traineeCertification.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.course.deleteMany();
  await prisma.cohortEnrollment.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.trainee.deleteMany();
  await prisma.employer.deleteMany();
  await prisma.trainingProvider.deleteMany();
  await prisma.governmentUser.deleteMany();
  await prisma.user.deleteMany();

  // --- Training provider ---------------------------------------------------
  const tpUser = await prisma.user.create({
    data: { name: 'SkillBridge Academy', email: 'admin@skillbridge.example', role: 'TRAINING_PROVIDER' },
  });
  const trainingProvider = await prisma.trainingProvider.create({
    data: { userId: tpUser.id, orgName: 'SkillBridge Academy', accreditationId: 'NCVET-TP-1042' },
  });

  const cohort = await prisma.cohort.create({
    data: {
      trainingProviderId: trainingProvider.id,
      name: 'Retail & Logistics — Batch 14',
      startDate: new Date('2025-05-01'),
      endDate: new Date('2025-08-01'),
    },
  });

  // --- Employer --------------------------------------------------------------
  const employerUser = await prisma.user.create({
    data: { name: 'Nexora Logistics Pvt Ltd', email: 'hr@nexora.example', role: 'EMPLOYER' },
  });
  const employer = await prisma.employer.create({
    data: { userId: employerUser.id, companyName: 'Nexora Logistics Pvt Ltd', sector: 'Logistics' },
  });

  // --- Course / Certification --------------------------------------------
  const course = await prisma.course.create({
    data: { title: 'Warehouse Operations & Inventory Management', category: 'Logistics' },
  });
  const certification = await prisma.certification.create({
    data: { courseId: course.id, name: 'Certified Warehouse Associate', issuingBody: 'NCVET' },
  });

  // --- Helper to build one full trainee + pipeline ---------------------------
  async function createTraineeWithPipeline(opts: {
    name: string;
    email: string;
    dob: string;
    gender: string;
    aadhaarLinked: boolean;
    epfoId: string | null;
    certNumber: string;
    assessmentScore: number;
    skillName: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    interventionType: string;
    outcomeType: 'EMPLOYED' | 'UNEMPLOYED' | 'UPSKILLED' | 'NO_CHANGE';
    wageLiftPercent: number | null;
    tenureMonths: number;
    insightText: string;
  }) {
    const user = await prisma.user.create({
      data: { name: opts.name, email: opts.email, role: 'TRAINEE' },
    });

    const trainee = await prisma.trainee.create({
      data: {
        userId: user.id,
        dob: new Date(opts.dob),
        gender: opts.gender,
        aadhaarLinked: opts.aadhaarLinked,
        epfoId: opts.epfoId,
      },
    });

    await prisma.cohortEnrollment.create({
      data: { cohortId: cohort.id, traineeId: trainee.id },
    });

    await prisma.traineeCertification.create({
      data: {
        traineeId: trainee.id,
        certificationId: certification.id,
        certificateNumber: opts.certNumber,
      },
    });

    await prisma.verification.createMany({
      data: [
        {
          traineeId: trainee.id,
          type: 'AADHAAR',
          status: opts.aadhaarLinked ? 'VERIFIED' : 'PENDING',
          verifiedAt: opts.aadhaarLinked ? new Date() : null,
        },
        {
          traineeId: trainee.id,
          type: 'EPFO',
          status: opts.epfoId ? 'VERIFIED' : 'PENDING',
          verifiedAt: opts.epfoId ? new Date() : null,
        },
      ],
    });

    const assessment = await prisma.skillAssessment.create({
      data: {
        traineeId: trainee.id,
        assessmentDate: new Date('2025-06-01'),
        overallScore: opts.assessmentScore,
        assessorType: 'NCVET_CERTIFIED_ASSESSOR',
      },
    });

    const gap = await prisma.skillGap.create({
      data: {
        skillAssessmentId: assessment.id,
        skillName: opts.skillName,
        severity: opts.severity,
      },
    });

    const intervention = await prisma.intervention.create({
      data: {
        skillGapId: gap.id,
        type: opts.interventionType,
        providerName: trainingProvider.orgName,
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-07-30'),
        status: 'COMPLETED',
      },
    });

    const outcome = await prisma.outcome.create({
      data: {
        interventionId: intervention.id,
        outcomeType: opts.outcomeType,
        wageLiftPercent: opts.wageLiftPercent,
        employerId: opts.outcomeType === 'EMPLOYED' ? employer.id : null,
      },
    });

    await prisma.insight.create({
      data: {
        outcomeId: outcome.id,
        text: opts.insightText,
        confidenceScore: 0.91,
      },
    });

    if (opts.outcomeType === 'EMPLOYED') {
      await prisma.employmentRecord.create({
        data: {
          traineeId: trainee.id,
          employerId: employer.id,
          jobTitle: 'Warehouse Associate',
          startDate: new Date('2025-08-05'),
          monthlySalary: 22000,
        },
      });

      await prisma.employerFeedback.create({
        data: {
          traineeId: trainee.id,
          employerId: employer.id,
          rating: 5,
          feedbackText: 'Reliable, strong grasp of inventory systems.',
        },
      });
    }

    await prisma.followUp.create({
      data: {
        traineeId: trainee.id,
        followUpDate: new Date('2026-10-05'),
        status: 'SCHEDULED',
        notes: `${opts.tenureMonths}-month tenure check-in`,
      },
    });

    return trainee;
  }

  // --- Priya: the canonical dossier shown on the homepage --------------------
  await createTraineeWithPipeline({
    name: 'Priya Sharma',
    email: 'priya.sharma@example.in',
    dob: '2001-03-14',
    gender: 'Female',
    aadhaarLinked: true,
    epfoId: 'EPFO-MH-88213',
    certNumber: 'CWA-2025-04892',
    assessmentScore: 82,
    skillName: 'Inventory Management Systems',
    severity: 'MEDIUM',
    interventionType: 'On-the-job coaching + module retake',
    outcomeType: 'EMPLOYED',
    wageLiftPercent: 22,
    tenureMonths: 14,
    insightText: 'Wage lift driven primarily by certification-linked role placement rather than tenure alone.',
  });

  // --- A few more trainees for realistic list/aggregate views ----------------
  await createTraineeWithPipeline({
    name: 'Rahul Verma', email: 'rahul.verma@example.in', dob: '1999-11-02', gender: 'Male',
    aadhaarLinked: true, epfoId: 'EPFO-DL-55210', certNumber: 'CWA-2025-04893',
    assessmentScore: 74, skillName: 'Forklift Safety Protocol', severity: 'HIGH',
    interventionType: 'Supervised practical retraining', outcomeType: 'EMPLOYED',
    wageLiftPercent: 15, tenureMonths: 9,
    insightText: 'High-severity gap closed fully; placement stable past 6-month risk window.',
  });

  await createTraineeWithPipeline({
    name: 'Anjali Nair', email: 'anjali.nair@example.in', dob: '2002-07-22', gender: 'Female',
    aadhaarLinked: true, epfoId: null, certNumber: 'CWA-2025-04894',
    assessmentScore: 68, skillName: 'Barcode & RFID Systems', severity: 'MEDIUM',
    interventionType: 'Peer mentorship program', outcomeType: 'UPSKILLED',
    wageLiftPercent: null, tenureMonths: 3,
    insightText: 'Upskilled but not yet placed; EPFO linkage pending, flagged for follow-up.',
  });

  await createTraineeWithPipeline({
    name: 'Mohammed Irfan', email: 'irfan@example.in', dob: '2000-01-30', gender: 'Male',
    aadhaarLinked: false, epfoId: null, certNumber: 'CWA-2025-04895',
    assessmentScore: 58, skillName: 'Basic Digital Literacy', severity: 'HIGH',
    interventionType: 'Remedial digital-skills bootcamp', outcomeType: 'NO_CHANGE',
    wageLiftPercent: null, tenureMonths: 0,
    insightText: 'No placement yet; Aadhaar linkage incomplete is blocking verification pipeline.',
  });

  await createTraineeWithPipeline({
    name: 'Sneha Reddy', email: 'sneha.reddy@example.in', dob: '2001-09-18', gender: 'Female',
    aadhaarLinked: true, epfoId: 'EPFO-TS-77441', certNumber: 'CWA-2025-04896',
    assessmentScore: 90, skillName: 'Warehouse Management Software', severity: 'LOW',
    interventionType: 'Advanced module fast-track', outcomeType: 'EMPLOYED',
    wageLiftPercent: 31, tenureMonths: 18,
    insightText: 'Top-quartile outcome; strong candidate for case-study / referral cohort.',
  });

  console.log('Seed complete: 5 trainees, 1 cohort, 1 course/certification, 1 employer.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
