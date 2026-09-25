import { PrismaClient, UserRole, GapSeverity, InterventionStatus, OutcomeType, VerificationType, VerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Kaushal Setu Core Database...');

  // Clean existing records in safe reverse-dependency order
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
  await prisma.employerFeedback.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.employmentRecord.deleteMany();
  await prisma.trainee.deleteMany();
  await prisma.governmentUser.deleteMany();
  await prisma.employer.deleteMany();
  await prisma.trainingProvider.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Training Providers
  const centurionUser = await prisma.user.create({
    data: {
      name: 'Centurion Skill Academy',
      email: 'centurion@vtp.gov.in',
      role: UserRole.TRAINING_PROVIDER,
      trainingProvider: {
        create: {
          orgName: 'Centurion Skill Academy',
          accreditationId: 'TC-NCVET-CENTURION-01'
        }
      }
    },
    include: { trainingProvider: true }
  });

  const smartUser = await prisma.user.create({
    data: {
      name: 'SMART Delhi Skills',
      email: 'smart.delhi@vtp.gov.in',
      role: UserRole.TRAINING_PROVIDER,
      trainingProvider: {
        create: {
          orgName: 'SMART Delhi Skill Center',
          accreditationId: 'TC-NCVET-SMART-02'
        }
      }
    },
    include: { trainingProvider: true }
  });

  const donBoscoUser = await prisma.user.create({
    data: {
      name: 'Don Bosco ITI',
      email: 'donbosco@iti.gov.in',
      role: UserRole.TRAINING_PROVIDER,
      trainingProvider: {
        create: {
          orgName: 'Don Bosco ITI Faridabad',
          accreditationId: 'TC-NCVET-DONBOSCO-03'
        }
      }
    },
    include: { trainingProvider: true }
  });

  // 2. Create Employers
  const tataUser = await prisma.user.create({
    data: {
      name: 'Tata Motors Ancillary Ltd.',
      email: 'workplace@tatamotors.ancillary.in',
      role: UserRole.EMPLOYER,
      employer: {
        create: {
          companyName: 'Tata Motors Ancillary Ltd.',
          sector: 'Automotive & Heavy Manufacturing'
        }
      }
    },
    include: { employer: true }
  });

  const siemensUser = await prisma.user.create({
    data: {
      name: 'Siemens Industrial Automation',
      email: 'careers@siemens.com',
      role: UserRole.EMPLOYER,
      employer: {
        create: {
          companyName: 'Siemens Industrial Automation India',
          sector: 'Industrial IoT & Energy Systems'
        }
      }
    },
    include: { employer: true }
  });

  // 3. Create Government User
  await prisma.user.create({
    data: {
      name: 'National Council for Vocational Education and Training',
      email: 'registry@ncvet.gov.in',
      role: UserRole.GOVERNMENT,
      governmentUser: {
        create: {
          department: 'NCVET Sovereign Registry Cell',
          region: 'National / All India'
        }
      }
    }
  });

  // 4. Create Courses & Certifications
  const courseElectrician = await prisma.course.create({
    data: {
      title: 'Industrial Electrician',
      category: 'Electrical & Power Systems'
    }
  });

  const certElectrician = await prisma.certification.create({
    data: {
      courseId: courseElectrician.id,
      name: 'Level 4 (NCVET Certified)',
      issuingBody: 'National Council for Vocational Education and Training (NCVET)'
    }
  });

  const courseCNC = await prisma.course.create({
    data: {
      title: 'CNC Machine Operator & Programmer',
      category: 'Capital Goods & Precision Machining'
    }
  });

  const certCNC = await prisma.certification.create({
    data: {
      courseId: courseCNC.id,
      name: 'Level 4 CNC Specialist',
      issuingBody: 'NCVET / ASDC'
    }
  });

  const courseQA = await prisma.course.create({
    data: {
      title: 'Automotive Quality Inspector',
      category: 'Automotive Quality Assurance'
    }
  });

  const certQA = await prisma.certification.create({
    data: {
      courseId: courseQA.id,
      name: 'Level 4 QA Inspector',
      issuingBody: 'NCVET / ASDC'
    }
  });

  const courseAssembly = await prisma.course.create({
    data: {
      title: 'Assembly Line Specialist',
      category: 'Automotive & Assembly'
    }
  });

  const certAssembly = await prisma.certification.create({
    data: {
      courseId: courseAssembly.id,
      name: 'Level 3 Assembly Technician',
      issuingBody: 'NCVET'
    }
  });

  const courseSolar = await prisma.course.create({
    data: {
      title: 'Solar PV Installation & Grid Connect',
      category: 'Green Energy / Renewables'
    }
  });

  const certSolar = await prisma.certification.create({
    data: {
      courseId: courseSolar.id,
      name: 'Level 4 Solar Technician',
      issuingBody: 'Skill Council for Green Jobs (SCGJ)'
    }
  });

  // 5. Create Cohorts
  const cohortPune14 = await prisma.cohort.create({
    data: {
      trainingProviderId: centurionUser.trainingProvider!.id,
      name: 'Centurion Pune Batch #14',
      startDate: new Date('2023-06-01T00:00:00.000Z'),
      endDate: new Date('2023-11-30T00:00:00.000Z')
    }
  });

  const cohortDelhi401 = await prisma.cohort.create({
    data: {
      trainingProviderId: smartUser.trainingProvider!.id,
      name: 'SMART Delhi TC-401',
      startDate: new Date('2023-07-01T00:00:00.000Z'),
      endDate: new Date('2023-12-31T00:00:00.000Z')
    }
  });

  const cohortFaridabad = await prisma.cohort.create({
    data: {
      trainingProviderId: donBoscoUser.trainingProvider!.id,
      name: 'Don Bosco ITI Faridabad Batch',
      startDate: new Date('2024-03-01T00:00:00.000Z'),
      endDate: new Date('2024-08-31T00:00:00.000Z')
    }
  });

  const cohortSolar = await prisma.cohort.create({
    data: {
      trainingProviderId: centurionUser.trainingProvider!.id,
      name: 'Solar PV & Automated Drives Batch #03',
      startDate: new Date('2024-01-15T00:00:00.000Z'),
      endDate: new Date('2024-06-30T00:00:00.000Z')
    }
  });

  // -------------------------------------------------------------------------
  // 6. PRIYA SHARMA (PRIMARY TRAINEE DOSSIER)
  // -------------------------------------------------------------------------
  const priyaUser = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      role: UserRole.TRAINEE,
      trainee: {
        create: {
          dob: new Date('2001-05-14T00:00:00.000Z'),
          gender: 'Female',
          aadhaarLinked: true,
          epfoId: 'MH/PUN/0088219/000/0192'
        }
      }
    },
    include: { trainee: true }
  });

  const priyaTraineeId = priyaUser.trainee!.id;

  // Cohort Enrollment
  await prisma.cohortEnrollment.create({
    data: {
      cohortId: cohortPune14.id,
      traineeId: priyaTraineeId,
      enrolledAt: new Date('2023-06-01T00:00:00.000Z')
    }
  });

  // Certification
  await prisma.traineeCertification.create({
    data: {
      traineeId: priyaTraineeId,
      certificationId: certElectrician.id,
      issuedAt: new Date('2023-12-15T00:00:00.000Z'),
      certificateNumber: 'KS-CERT-2023-9812'
    }
  });

  // Longitudinal Pipeline: SkillAssessment → SkillGap → Intervention → Outcome → Insight
  const priyaAssessment = await prisma.skillAssessment.create({
    data: {
      traineeId: priyaTraineeId,
      assessmentDate: new Date('2023-12-10T00:00:00.000Z'),
      overallScore: 89.2,
      assessorType: 'NCVET Board Certified Assessor'
    }
  });

  await prisma.skillGap.createMany({
    data: [
      {
        skillAssessmentId: priyaAssessment.id,
        skillName: 'Technical Mastery & Circuit Diagnostics',
        severity: GapSeverity.LOW
      },
      {
        skillAssessmentId: priyaAssessment.id,
        skillName: 'Practical Tool Handling & Industrial Safety',
        severity: GapSeverity.LOW
      },
      {
        skillAssessmentId: priyaAssessment.id,
        skillName: 'Digital Tooling & PLC Systems Calibration',
        severity: GapSeverity.HIGH
      },
      {
        skillAssessmentId: priyaAssessment.id,
        skillName: 'Role-Specific Compliance & Factory SOPs',
        severity: GapSeverity.LOW
      }
    ]
  });

  const gaps = await prisma.skillGap.findMany({
    where: { skillAssessmentId: priyaAssessment.id }
  });
  const plcGap = gaps.find(g => g.skillName.includes('PLC Systems Calibration'))!;

  const priyaIntervention = await prisma.intervention.create({
    data: {
      skillGapId: plcGap.id,
      type: 'In-Job Micro-Credential',
      providerName: 'Centurion Skill Academy / Tata Motors Ancillary',
      startDate: new Date('2024-02-01T00:00:00.000Z'),
      endDate: new Date('2024-04-15T00:00:00.000Z'),
      status: InterventionStatus.COMPLETED
    }
  });

  const priyaOutcome = await prisma.outcome.create({
    data: {
      interventionId: priyaIntervention.id,
      outcomeType: OutcomeType.EMPLOYED,
      wageLiftPercent: 22.1,
      employerId: tataUser.employer!.id,
      recordedAt: new Date('2024-11-15T00:00:00.000Z')
    }
  });

  await prisma.insight.create({
    data: {
      outcomeId: priyaOutcome.id,
      text: "Automated monthly EPFO pulse confirms ₹21,500/mo net wage lift (+22.1%) with active continuous 14-month tenure at Tata Motors Ancillary Ltd.",
      confidenceScore: 0.98,
      generatedAt: new Date('2024-11-20T00:00:00.000Z')
    }
  });

  // Employment Records
  // Baseline (first 6 months)
  await prisma.employmentRecord.create({
    data: {
      traineeId: priyaTraineeId,
      employerId: tataUser.employer!.id,
      jobTitle: 'Jr. Technician (Electrical Maintenance)',
      startDate: new Date('2024-01-15T00:00:00.000Z'),
      endDate: new Date('2024-06-30T00:00:00.000Z'),
      monthlySalary: 17600
    }
  });

  // Current Role (promoted / escalated)
  await prisma.employmentRecord.create({
    data: {
      traineeId: priyaTraineeId,
      employerId: tataUser.employer!.id,
      jobTitle: 'Sr. Industrial Electrician (Diagnostic Lead)',
      startDate: new Date('2024-07-01T00:00:00.000Z'),
      endDate: null,
      monthlySalary: 21500
    }
  });

  // Verifications
  await prisma.verification.createMany({
    data: [
      {
        traineeId: priyaTraineeId,
        type: VerificationType.AADHAAR,
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date('2023-06-05T00:00:00.000Z')
      },
      {
        traineeId: priyaTraineeId,
        type: VerificationType.EPFO,
        status: VerificationStatus.VERIFIED,
        verifiedAt: new Date('2024-01-25T00:00:00.000Z')
      }
    ]
  });

  // Follow-ups
  await prisma.followUp.createMany({
    data: [
      {
        traineeId: priyaTraineeId,
        followUpDate: new Date('2025-05-15T00:00:00.000Z'),
        status: 'SCHEDULED',
        notes: '18-Month Longitudinal Audit: Automated employer wage slip pulse via EPFO linkage and attendance integrity audit.'
      },
      {
        traineeId: priyaTraineeId,
        followUpDate: new Date('2025-06-02T00:00:00.000Z'),
        status: 'ACTION_REQUIRED',
        notes: 'PLC Advanced Diagnostic Assessment: Self-paced employer micro-credential module to bridge calibration deficit in PLC systems.'
      },
      {
        traineeId: priyaTraineeId,
        followUpDate: new Date('2025-06-28T00:00:00.000Z'),
        status: 'PENDING_SIGNOFF',
        notes: 'Supervisor Retention Validation (Q2): Direct supervisor Vikram R. confirmation for Level 5 promotion and continuous industrial placement.'
      }
    ]
  });

  // Employer Feedback
  await prisma.employerFeedback.create({
    data: {
      traineeId: priyaTraineeId,
      employerId: tataUser.employer!.id,
      rating: 5,
      feedbackText: 'Priya demonstrated exceptional precision in circuit diagnostics and resolved Shift B assembly downtime by 35%. Promoted to Diagnostic Lead.',
      submittedAt: new Date('2024-10-15T00:00:00.000Z')
    }
  });

  // -------------------------------------------------------------------------
  // 7. ADDITIONAL TRAINEES (4-5 realistic peers across providers/cohorts)
  // -------------------------------------------------------------------------

  // Trainee 2: Rahul K. Verma
  const rahulUser = await prisma.user.create({
    data: {
      name: 'Rahul K. Verma',
      email: 'rahul.verma@example.com',
      role: UserRole.TRAINEE,
      trainee: {
        create: {
          dob: new Date('1999-11-20T00:00:00.000Z'),
          gender: 'Male',
          aadhaarLinked: true,
          epfoId: 'DL/CPM/0045129/000/0812'
        }
      }
    },
    include: { trainee: true }
  });
  await prisma.cohortEnrollment.create({
    data: {
      cohortId: cohortDelhi401.id,
      traineeId: rahulUser.trainee!.id,
      enrolledAt: new Date('2023-07-01T00:00:00.000Z')
    }
  });
  await prisma.traineeCertification.create({
    data: {
      traineeId: rahulUser.trainee!.id,
      certificationId: certCNC.id,
      issuedAt: new Date('2023-12-28T00:00:00.000Z'),
      certificateNumber: 'KS-CERT-2023-4419'
    }
  });
  await prisma.employmentRecord.create({
    data: {
      traineeId: rahulUser.trainee!.id,
      employerId: tataUser.employer!.id,
      jobTitle: 'CNC Machine Operator',
      startDate: new Date('2024-02-01T00:00:00.000Z'),
      monthlySalary: 19800
    }
  });
  await prisma.verification.createMany({
    data: [
      { traineeId: rahulUser.trainee!.id, type: VerificationType.AADHAAR, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2023-07-05T00:00:00.000Z') },
      { traineeId: rahulUser.trainee!.id, type: VerificationType.EPFO, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2024-02-15T00:00:00.000Z') }
    ]
  });

  // Trainee 3: Ananya Deshmukh
  const ananyaUser = await prisma.user.create({
    data: {
      name: 'Ananya Deshmukh',
      email: 'ananya.deshmukh@example.com',
      role: UserRole.TRAINEE,
      trainee: {
        create: {
          dob: new Date('2002-03-08T00:00:00.000Z'),
          gender: 'Female',
          aadhaarLinked: true,
          epfoId: 'MH/PUN/0091234/000/0341'
        }
      }
    },
    include: { trainee: true }
  });
  await prisma.cohortEnrollment.create({
    data: {
      cohortId: cohortPune14.id,
      traineeId: ananyaUser.trainee!.id,
      enrolledAt: new Date('2023-06-01T00:00:00.000Z')
    }
  });
  await prisma.traineeCertification.create({
    data: {
      traineeId: ananyaUser.trainee!.id,
      certificationId: certQA.id,
      issuedAt: new Date('2023-12-15T00:00:00.000Z'),
      certificateNumber: 'KS-CERT-2024-1182'
    }
  });
  await prisma.employmentRecord.create({
    data: {
      traineeId: ananyaUser.trainee!.id,
      employerId: tataUser.employer!.id,
      jobTitle: 'Automotive Quality Inspector',
      startDate: new Date('2024-04-10T00:00:00.000Z'),
      monthlySalary: 18500
    }
  });
  await prisma.verification.createMany({
    data: [
      { traineeId: ananyaUser.trainee!.id, type: VerificationType.AADHAAR, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2023-06-05T00:00:00.000Z') },
      { traineeId: ananyaUser.trainee!.id, type: VerificationType.EPFO, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2024-04-20T00:00:00.000Z') }
    ]
  });

  // Trainee 4: Mohit S. Rawat
  const mohitUser = await prisma.user.create({
    data: {
      name: 'Mohit S. Rawat',
      email: 'mohit.rawat@example.com',
      role: UserRole.TRAINEE,
      trainee: {
        create: {
          dob: new Date('2000-08-25T00:00:00.000Z'),
          gender: 'Male',
          aadhaarLinked: true,
          epfoId: 'HR/FBD/0022319/000/0942'
        }
      }
    },
    include: { trainee: true }
  });
  await prisma.cohortEnrollment.create({
    data: {
      cohortId: cohortFaridabad.id,
      traineeId: mohitUser.trainee!.id,
      enrolledAt: new Date('2024-03-01T00:00:00.000Z')
    }
  });
  await prisma.traineeCertification.create({
    data: {
      traineeId: mohitUser.trainee!.id,
      certificationId: certAssembly.id,
      issuedAt: new Date('2024-08-20T00:00:00.000Z'),
      certificateNumber: 'KS-CERT-2024-8841'
    }
  });
  await prisma.employmentRecord.create({
    data: {
      traineeId: mohitUser.trainee!.id,
      employerId: tataUser.employer!.id,
      jobTitle: 'Assembly Line Specialist',
      startDate: new Date('2024-10-01T00:00:00.000Z'),
      monthlySalary: 16800
    }
  });
  await prisma.verification.createMany({
    data: [
      { traineeId: mohitUser.trainee!.id, type: VerificationType.AADHAAR, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2024-03-05T00:00:00.000Z') },
      { traineeId: mohitUser.trainee!.id, type: VerificationType.EPFO, status: VerificationStatus.PENDING }
    ]
  });

  // Trainee 5: Sneha Patel
  const snehaUser = await prisma.user.create({
    data: {
      name: 'Sneha Patel',
      email: 'sneha.patel@example.com',
      role: UserRole.TRAINEE,
      trainee: {
        create: {
          dob: new Date('2001-09-12T00:00:00.000Z'),
          gender: 'Female',
          aadhaarLinked: true,
          epfoId: 'GJ/AHM/0076541/000/0122'
        }
      }
    },
    include: { trainee: true }
  });
  await prisma.cohortEnrollment.create({
    data: {
      cohortId: cohortSolar.id,
      traineeId: snehaUser.trainee!.id,
      enrolledAt: new Date('2024-01-15T00:00:00.000Z')
    }
  });
  await prisma.traineeCertification.create({
    data: {
      traineeId: snehaUser.trainee!.id,
      certificationId: certSolar.id,
      issuedAt: new Date('2024-06-25T00:00:00.000Z'),
      certificateNumber: 'KS-CERT-2024-3310'
    }
  });
  await prisma.employmentRecord.create({
    data: {
      traineeId: snehaUser.trainee!.id,
      employerId: siemensUser.employer!.id,
      jobTitle: 'Renewables Grid Technician',
      startDate: new Date('2024-07-01T00:00:00.000Z'),
      monthlySalary: 22500
    }
  });
  await prisma.verification.createMany({
    data: [
      { traineeId: snehaUser.trainee!.id, type: VerificationType.AADHAAR, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2024-01-20T00:00:00.000Z') },
      { traineeId: snehaUser.trainee!.id, type: VerificationType.EPFO, status: VerificationStatus.VERIFIED, verifiedAt: new Date('2024-07-15T00:00:00.000Z') }
    ]
  });

  console.log('Seeding completed successfully!');
  console.log('Priya Sharma Trainee ID:', priyaTraineeId);
  console.log('Priya Sharma User ID:', priyaUser.id);
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
