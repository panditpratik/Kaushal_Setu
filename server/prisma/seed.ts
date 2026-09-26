// server/prisma/seed.ts
// Realistic Synthetic Development Database Seed for KaushalSetu
import { PrismaClient, UserRole, GapSeverity, InterventionStatus, OutcomeType, VerificationType, VerificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning database records ---');
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.employerFeedback.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.employmentRecord.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.outcome.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.skillGap.deleteMany();
  await prisma.skillAssessment.deleteMany();
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

  const defaultPasswordHash = bcrypt.hashSync('Password@123', 10);

  console.log('--- Creating Users ---');
  // 1. Government User
  const govUser = await prisma.user.create({
    data: {
      name: 'Dr. Ramesh Deshmukh',
      email: 'gov@msde.gov.in',
      role: UserRole.GOVERNMENT,
      passwordHash: defaultPasswordHash,
      governmentUser: {
        create: {
          department: 'Directorate of Vocational Education and Training',
          region: 'Maharashtra (Western Zone)',
        },
      },
    },
    include: { governmentUser: true },
  });

  // 2. Training Provider User
  const tpUser = await prisma.user.create({
    data: {
      name: 'Centurion Skill Academy',
      email: 'provider@centurion.example.com',
      role: UserRole.TRAINING_PROVIDER,
      passwordHash: defaultPasswordHash,
      trainingProvider: {
        create: {
          orgName: 'Centurion Skill Academy Pune',
          accreditationId: 'NCVET-TP-MH-9481',
        },
      },
    },
    include: { trainingProvider: true },
  });

  // 3. Employer User
  const empUser = await prisma.user.create({
    data: {
      name: 'Vikram Rajput (HR Operations)',
      email: 'employer@tata.example.com',
      role: UserRole.EMPLOYER,
      passwordHash: defaultPasswordHash,
      employer: {
        create: {
          companyName: 'Tata Motors Ancillary Ltd.',
          sector: 'Automotive & Industrial Manufacturing',
        },
      },
    },
    include: { employer: true },
  });

  // Secondary Employer
  const empUser2 = await prisma.user.create({
    data: {
      name: 'Sunita Mehra (Talent Lead)',
      email: 'hr@bharatforge.example.com',
      role: UserRole.EMPLOYER,
      passwordHash: defaultPasswordHash,
      employer: {
        create: {
          companyName: 'Bharat Forge Precision Hub',
          sector: 'Heavy Industrial Forging',
        },
      },
    },
    include: { employer: true },
  });

  // 4. Trainee Users
  const traineeUser1 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'trainee@kaushalsetu.gov.in',
      role: UserRole.TRAINEE,
      passwordHash: defaultPasswordHash,
      trainee: {
        create: {
          dob: new Date('2001-04-15'),
          gender: 'Female',
          aadhaarLinked: true,
          epfoId: 'MH/PUN/0088219/000/0192',
        },
      },
    },
    include: { trainee: true },
  });

  const traineeUser2 = await prisma.user.create({
    data: {
      name: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      role: UserRole.TRAINEE,
      passwordHash: defaultPasswordHash,
      trainee: {
        create: {
          dob: new Date('1999-11-20'),
          gender: 'Male',
          aadhaarLinked: true,
          epfoId: 'MH/NSK/0045129/000/0811',
        },
      },
    },
    include: { trainee: true },
  });

  const traineeUser3 = await prisma.user.create({
    data: {
      name: 'Anita Patil',
      email: 'anita.patil@example.com',
      role: UserRole.TRAINEE,
      passwordHash: defaultPasswordHash,
      trainee: {
        create: {
          dob: new Date('2002-08-05'),
          gender: 'Female',
          aadhaarLinked: true,
          epfoId: 'MH/AUR/0091823/000/0419',
        },
      },
    },
    include: { trainee: true },
  });

  console.log('--- Creating Courses & Certifications ---');
  const course1 = await prisma.course.create({
    data: {
      title: 'Industrial Electrician & Automation Diagnostics',
      category: 'Electrical & Power Systems',
      certifications: {
        create: [
          {
            name: 'NCVET Level 4 Industrial Electrician',
            issuingBody: 'National Council for Vocational Education and Training',
          },
        ],
      },
    },
    include: { certifications: true },
  });

  const course2 = await prisma.course.create({
    data: {
      title: 'Automotive Mechatronics & Precision Assembly',
      category: 'Automotive Engineering',
      certifications: {
        create: [
          {
            name: 'ASDC Level 4 Mechatronics Specialist',
            issuingBody: 'Automotive Skills Development Council',
          },
        ],
      },
    },
    include: { certifications: true },
  });

  const cert1 = course1.certifications[0];
  const cert2 = course2.certifications[0];

  console.log('--- Creating Cohorts & Enrollments ---');
  const cohort1 = await prisma.cohort.create({
    data: {
      trainingProviderId: tpUser.trainingProvider!.id,
      name: 'PMKVY-4.0-PUNE-IE-B14',
      startDate: new Date('2023-06-01'),
      endDate: new Date('2023-10-15'),
      enrollments: {
        create: [
          { traineeId: traineeUser1.trainee!.id, enrolledAt: new Date('2023-06-01') },
          { traineeId: traineeUser2.trainee!.id, enrolledAt: new Date('2023-06-01') },
          { traineeId: traineeUser3.trainee!.id, enrolledAt: new Date('2023-06-01') },
        ],
      },
    },
  });

  console.log('--- Assigning Trainee Certifications ---');
  await prisma.traineeCertification.createMany({
    data: [
      {
        traineeId: traineeUser1.trainee!.id,
        certificationId: cert1.id,
        issuedAt: new Date('2023-12-10'),
        certificateNumber: 'NCVET-2023-IE-098214',
      },
      {
        traineeId: traineeUser2.trainee!.id,
        certificationId: cert2.id,
        issuedAt: new Date('2023-12-15'),
        certificateNumber: 'ASDC-2023-ME-041920',
      },
      {
        traineeId: traineeUser3.trainee!.id,
        certificationId: cert1.id,
        issuedAt: new Date('2023-12-18'),
        certificateNumber: 'NCVET-2023-IE-098355',
      },
    ],
  });

  console.log('--- Creating Skill Assessments, Skill Gaps, Interventions, Outcomes ---');
  // Trainee 1 (Priya Sharma) Longitudinal Journey
  const assessment1 = await prisma.skillAssessment.create({
    data: {
      traineeId: traineeUser1.trainee!.id,
      assessmentDate: new Date('2023-11-20'),
      overallScore: 88.5,
      assessorType: 'NCVET Certified External Assessor',
      skillGaps: {
        create: [
          {
            skillName: 'PLC & Automation Systems Calibration',
            severity: GapSeverity.MEDIUM,
            interventions: {
              create: [
                {
                  type: 'Advanced PLC Diagnostic Lab (40 Hours)',
                  providerName: 'Centurion Skill Academy Pune',
                  startDate: new Date('2024-03-01'),
                  endDate: new Date('2024-04-10'),
                  status: InterventionStatus.COMPLETED,
                  outcomes: {
                    create: [
                      {
                        outcomeType: OutcomeType.EMPLOYED,
                        wageLiftPercent: 22.1,
                        employerId: empUser.employer!.id,
                        validationStatus: 'VERIFIED',
                        validatedAt: new Date('2024-07-15'),
                        validatedBy: empUser.id,
                        retention3m: 'verified',
                        retention6m: 'verified',
                        retention12m: 'verified',
                        recordedAt: new Date('2024-07-01'),
                        insights: {
                          create: [
                            {
                              text: 'Trainee promoted to Diagnostic Lead following PLC intervention completion; 14-month retention verified via payroll records.',
                              confidenceScore: 0.94,
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            skillName: 'Three-Phase Industrial Switchgear Wiring',
            severity: GapSeverity.LOW,
          },
        ],
      },
    },
  });

  // Trainee 2 (Rahul Verma)
  await prisma.skillAssessment.create({
    data: {
      traineeId: traineeUser2.trainee!.id,
      assessmentDate: new Date('2023-11-25'),
      overallScore: 79.0,
      assessorType: 'ASDC Assessor Panel',
      skillGaps: {
        create: [
          {
            skillName: 'Robotic Welding Calibration',
            severity: GapSeverity.HIGH,
            interventions: {
              create: [
                {
                  type: 'On-the-Job Precision Welding Apprenticeship',
                  providerName: 'Bharat Forge Technical Wing',
                  startDate: new Date('2024-01-15'),
                  endDate: new Date('2024-04-15'),
                  status: InterventionStatus.COMPLETED,
                  outcomes: {
                    create: [
                      {
                        outcomeType: OutcomeType.EMPLOYED,
                        wageLiftPercent: 18.5,
                        employerId: empUser2.employer!.id,
                        validationStatus: 'VERIFIED',
                        validatedAt: new Date('2024-06-20'),
                        validatedBy: empUser2.id,
                        retention3m: 'verified',
                        retention6m: 'verified',
                        retention12m: 'pending',
                        recordedAt: new Date('2024-06-01'),
                        insights: {
                          create: [
                            {
                              text: 'Completed high-intensity apprenticeship; successfully retained for 8+ months with confirmed wage lift.',
                              confidenceScore: 0.91,
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Trainee 3 (Anita Patil)
  await prisma.skillAssessment.create({
    data: {
      traineeId: traineeUser3.trainee!.id,
      assessmentDate: new Date('2023-12-05'),
      overallScore: 84.0,
      assessorType: 'NCVET External Assessor',
      skillGaps: {
        create: [
          {
            skillName: 'Solar Inverter Synchronization',
            severity: GapSeverity.MEDIUM,
            interventions: {
              create: [
                {
                  type: 'Green Energy Micro-Credential Workshop',
                  providerName: 'Centurion Skill Academy Pune',
                  startDate: new Date('2024-02-01'),
                  endDate: new Date('2024-03-15'),
                  status: InterventionStatus.COMPLETED,
                  outcomes: {
                    create: [
                      {
                        outcomeType: OutcomeType.EMPLOYED,
                        wageLiftPercent: 25.0,
                        employerId: empUser.employer!.id,
                        validationStatus: 'VERIFIED',
                        validatedAt: new Date('2024-05-10'),
                        validatedBy: empUser.id,
                        retention3m: 'verified',
                        retention6m: 'verified',
                        retention12m: 'pending',
                        recordedAt: new Date('2024-05-01'),
                        insights: {
                          create: [
                            {
                              text: 'Transitioned from junior trainee to certified solar maintenance technician with a 25% salary enhancement.',
                              confidenceScore: 0.95,
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('--- Creating Employment Records ---');
  await prisma.employmentRecord.createMany({
    data: [
      {
        traineeId: traineeUser1.trainee!.id,
        employerId: empUser.employer!.id,
        jobTitle: 'Sr. Industrial Electrician (Diagnostic Lead)',
        startDate: new Date('2024-01-10'),
        monthlySalary: 21500,
      },
      {
        traineeId: traineeUser2.trainee!.id,
        employerId: empUser2.employer!.id,
        jobTitle: 'Precision Mechatronics Technician',
        startDate: new Date('2024-02-01'),
        monthlySalary: 19800,
      },
      {
        traineeId: traineeUser3.trainee!.id,
        employerId: empUser.employer!.id,
        jobTitle: 'Electrical Maintenance Specialist',
        startDate: new Date('2024-01-20'),
        monthlySalary: 22000,
      },
    ],
  });

  console.log('--- Creating Verifications ---');
  await prisma.verification.createMany({
    data: [
      { traineeId: traineeUser1.trainee!.id, type: VerificationType.AADHAAR, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2023-06-05') },
      { traineeId: traineeUser1.trainee!.id, type: VerificationType.EPFO, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2024-02-15') },
      { traineeId: traineeUser2.trainee!.id, type: VerificationType.AADHAAR, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2023-06-10') },
      { traineeId: traineeUser2.trainee!.id, type: VerificationType.EPFO, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2024-03-01') },
      { traineeId: traineeUser3.trainee!.id, type: VerificationType.AADHAAR, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2023-06-12') },
      { traineeId: traineeUser3.trainee!.id, type: VerificationType.EPFO, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2024-03-10') },
    ],
  });

  console.log('--- Creating Follow-Ups ---');
  await prisma.followUp.createMany({
    data: [
      { traineeId: traineeUser1.trainee!.id, followUpDate: new Date('2024-04-10'), status: 'Completed', notes: '3-Month post-placement audit verified with HR lead Vikram Rajput.' },
      { traineeId: traineeUser1.trainee!.id, followUpDate: new Date('2024-07-15'), status: 'Completed', notes: '6-Month longitudinal retention confirmed; candidate reported promotion to Diagnostic Lead.' },
      { traineeId: traineeUser1.trainee!.id, followUpDate: new Date('2025-01-15'), status: 'Completed', notes: '12-Month audit completed; wage lift of 22.1% confirmed through payroll records.' },
      { traineeId: traineeUser2.trainee!.id, followUpDate: new Date('2024-05-15'), status: 'Completed', notes: '3-Month checkup cleared at Bharat Forge facility.' },
      { traineeId: traineeUser3.trainee!.id, followUpDate: new Date('2024-04-20'), status: 'Completed', notes: 'Active employment confirmed in Pune industrial zone.' },
    ],
  });

  console.log('--- Creating Employer Feedback ---');
  await prisma.employerFeedback.create({
    data: {
      traineeId: traineeUser1.trainee!.id,
      employerId: empUser.employer!.id,
      rating: 5,
      feedbackText: 'Batch 14 graduates understand basic circuit diagrams, but require hands-on calibration experience with Siemens S7-1200 PLCs.',
    },
  });

  console.log('--- Creating Initial Audit Logs ---');
  await prisma.auditLog.createMany({
    data: [
      { actorId: govUser.id, actorRole: 'GOVERNMENT', action: 'PORTAL_AUDIT_INITIALIZED', entity: 'System', entityId: 'GLOBAL', metadata: 'System audit and baseline data verification loaded.' },
      { actorId: empUser.id, actorRole: 'EMPLOYER', action: 'OUTCOME_VALIDATED', entity: 'Outcome', entityId: 'INIT-OUTCOME-01', metadata: 'Validated retention and wage enhancement for Batch 14 candidates.' },
    ],
  });

  console.log('--- Creating Initial Notifications ---');
  await prisma.notification.createMany({
    data: [
      { userId: traineeUser1.id, title: 'Retention Verified', message: 'Your 12-month retention and wage lift have been officially verified by Tata Motors Ancillary Ltd.' },
      { userId: empUser.id, title: 'Candidate Batch Ready', message: 'New candidates from Centurion Skill Academy are ready for outcome confirmation.' },
      { userId: tpUser.id, title: 'Curriculum Feedback Received', message: 'Employer feedback on PLC calibration has been transmitted for Batch 14.' },
    ],
  });

  console.log('=== Database Seed Complete ===');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
