// server/src/routes/trainees.ts
// GET /api/trainees/:id/dossier
// Assembles one trainee's full longitudinal record for the Trajectory Arc card
// and dossier view. Keep this shape stable — the frontend maps it 1:1.

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const traineeIncludeConfig = {
  user: { select: { name: true, email: true } },
  verifications: true,
  certifications: {
    include: { certification: { include: { course: true } } },
  },
  employmentRecords: {
    include: { employer: { select: { companyName: true, sector: true } } },
    orderBy: { startDate: 'desc' as const },
  },
  skillAssessments: {
    orderBy: { assessmentDate: 'desc' as const },
    include: {
      skillGaps: {
        include: {
          interventions: {
            include: {
              outcomes: {
                include: {
                  insights: true,
                  employer: { select: { companyName: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  cohortEnrollments: {
    include: { cohort: { include: { trainingProvider: true } } },
    orderBy: { enrolledAt: 'desc' as const },
    take: 1,
  },
};

router.get('/:id/dossier', async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  try {
    const isMe = id.toLowerCase() === 'me';
    const isPriya = id.toLowerCase() === 'priya' || id === 'default';

    let trainee: any = null;

    if (isMe && (req as any).user?.traineeId) {
      trainee = await prisma.trainee.findUnique({
        where: { id: (req as any).user.traineeId },
        include: traineeIncludeConfig,
      });
    } else if (isPriya || isMe) {
      trainee = await prisma.trainee.findFirst({
        where: {
          OR: [
            { user: { name: { contains: 'Priya', mode: 'insensitive' } } },
            { user: { email: { contains: 'priya', mode: 'insensitive' } } },
          ],
        },
        include: traineeIncludeConfig,
      });
      // Fallback to first trainee in database if Priya not found
      if (!trainee) {
        trainee = await prisma.trainee.findFirst({
          include: traineeIncludeConfig,
        });
      }
    } else {
      trainee = await prisma.trainee.findUnique({
        where: { id },
        include: traineeIncludeConfig,
      });
    }

    if (!trainee) {
      return res.status(404).json({ error: 'Trainee not found' });
    }

    // --- Flatten the pipeline into the ordered stages the UI consumes -------
    // TRAINEE → SKILL → JOB → OUTCOME → PROGRESS
    const stages = trainee.skillAssessments.flatMap((assessment: any) =>
      assessment.skillGaps.flatMap((gap: any) =>
        gap.interventions.flatMap((intervention: any) =>
          intervention.outcomes.map((outcome: any) => ({
            assessment: {
              id: assessment.id,
              date: assessment.assessmentDate.toISOString(),
              overallScore: assessment.overallScore,
            },
            skillGap: {
              id: gap.id,
              skillName: gap.skillName,
              severity: gap.severity,
            },
            intervention: {
              id: intervention.id,
              type: intervention.type,
              providerName: intervention.providerName,
              status: intervention.status,
              startDate: intervention.startDate.toISOString(),
              endDate: intervention.endDate ? intervention.endDate.toISOString() : null,
            },
            outcome: {
              id: outcome.id,
              type: outcome.outcomeType,
              wageLiftPercent: outcome.wageLiftPercent,
              employerName: outcome.employer?.companyName ?? null,
              recordedAt: outcome.recordedAt.toISOString(),
            },
            insights: outcome.insights.map((i: any) => ({
              text: i.text,
              confidenceScore: i.confidenceScore,
            })),
          }))
        )
      )
    );

    const currentEnrollment = trainee.cohortEnrollments[0] ?? null;
    const activeEmployment = trainee.employmentRecords.find((r: any) => !r.endDate) ?? null;

    // Tenure in months for the "ACTIVE VELOCITY" strip
    const tenureMonths = activeEmployment
      ? Math.max(
          0,
          Math.round(
            (Date.now() - new Date(activeEmployment.startDate).getTime()) /
              (1000 * 60 * 60 * 24 * 30)
          )
        )
      : null;

    const latestOutcome = stages[0]?.outcome ?? null;

    const dossier = {
      trainee: {
        id: trainee.id,
        name: trainee.user.name,
        gender: trainee.gender,
        aadhaarLinked: trainee.aadhaarLinked,
        epfoId: trainee.epfoId,
      },
      verification: {
        aadhaar: trainee.verifications.find((v: any) => v.type === 'AADHAAR')?.status ?? 'PENDING',
        epfo: trainee.verifications.find((v: any) => v.type === 'EPFO')?.status ?? 'PENDING',
      },
      cohort: currentEnrollment
        ? {
            name: currentEnrollment.cohort.name,
            trainingProvider: currentEnrollment.cohort.trainingProvider.orgName,
          }
        : null,
      certifications: trainee.certifications.map((tc: any) => ({
        name: tc.certification.name,
        course: tc.certification.course.title,
        issuedAt: tc.issuedAt.toISOString(),
        certificateNumber: tc.certificateNumber,
      })),
      activeEmployment: activeEmployment
        ? {
            jobTitle: activeEmployment.jobTitle,
            employerName: activeEmployment.employer.companyName,
            monthlySalary: activeEmployment.monthlySalary,
            tenureMonths,
          }
        : null,
      // What the Trajectory Arc card renders directly:
      trajectoryVelocity: {
        wageLiftPercent: latestOutcome?.wageLiftPercent ?? null,
        tenureMonths,
      },
      stages, // full TRAINEE→SKILL→JOB→OUTCOME→PROGRESS chain, newest first
    };

    res.json(dossier);
  } catch (err) {
    console.error('Failed to build trainee dossier:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trainees - List all trainees
router.get('/', async (_req: Request, res: Response) => {
  try {
    const trainees = await prisma.trainee.findMany({
      include: {
        user: true,
        certifications: {
          include: { certification: { include: { course: true } } },
        },
        employmentRecords: {
          include: { employer: true },
          orderBy: { startDate: 'desc' },
        },
        verifications: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, count: trainees.length, data: trainees });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/trainees/:id/outcome - Trainee submits an updated outcome (Phase 12, 33)
router.post('/:id/outcome', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { outcomeType, monthlySalary, jobTitle, employerName, wageLiftPercent } = req.body;

    // Resolve trainee
    const trainee = id === 'me' || id === 'priya'
      ? await prisma.trainee.findFirst({ include: { user: true } })
      : await prisma.trainee.findUnique({ where: { id }, include: { user: true } });

    if (!trainee) {
      return res.status(404).json({ success: false, error: 'Trainee not found' });
    }

    // Find or create employer if employerName provided
    let employerId: string | null = null;
    if (employerName) {
      let emp = await prisma.employer.findFirst({
        where: { companyName: { contains: employerName, mode: 'insensitive' } }
      });
      if (!emp) {
        const empUser = await prisma.user.create({
          data: {
            name: `${employerName} HR`,
            email: `hr@${employerName.toLowerCase().replace(/[^a-z0-9]/g, '')}.example.com`,
            role: 'EMPLOYER',
          }
        });
        emp = await prisma.employer.create({
          data: {
            userId: empUser.id,
            companyName: employerName,
            sector: 'Industrial Sector',
          }
        });
      }
      employerId = emp.id;
    }

    // Find latest intervention to link outcome
    let intervention = await prisma.intervention.findFirst({
      where: { skillGap: { skillAssessment: { traineeId: trainee.id } } },
      orderBy: { startDate: 'desc' }
    });

    if (!intervention) {
      // Create a default assessment and intervention
      const assessment = await prisma.skillAssessment.create({
        data: {
          traineeId: trainee.id,
          overallScore: 85.0,
          assessorType: 'Self Reported Outcome',
          skillGaps: {
            create: {
              skillName: 'General Workplace Competency',
              severity: 'LOW',
            }
          }
        },
        include: { skillGaps: true }
      });

      intervention = await prisma.intervention.create({
        data: {
          skillGapId: assessment.skillGaps[0].id,
          type: 'Direct Employment Tracking',
          providerName: 'Centurion Skill Academy',
          startDate: new Date(),
          status: 'COMPLETED'
        }
      });
    }

    // Use Prisma transaction: update outcome + employment record + audit log + notification
    const result = await prisma.$transaction(async (tx) => {
      const outcome = await tx.outcome.create({
        data: {
          interventionId: intervention.id,
          outcomeType: outcomeType || 'EMPLOYED',
          wageLiftPercent: wageLiftPercent !== undefined ? Number(wageLiftPercent) : 22.0,
          employerId: employerId,
          validationStatus: 'PENDING',
        }
      });

      if (employerId && monthlySalary) {
        await tx.employmentRecord.create({
          data: {
            traineeId: trainee.id,
            employerId: employerId,
            jobTitle: jobTitle || 'Industrial Electrician',
            startDate: new Date(),
            monthlySalary: Number(monthlySalary) || 21500,
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: trainee.user.id,
          actorRole: 'TRAINEE',
          action: 'OUTCOME_UPDATED',
          entity: 'Outcome',
          entityId: outcome.id,
          metadata: JSON.stringify({ outcomeType, monthlySalary, employerName }),
        }
      });

      await tx.notification.create({
        data: {
          userId: trainee.user.id,
          title: 'Outcome Recorded',
          message: `Your outcome update has been logged and queued for employer verification.`,
        }
      });

      return outcome;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error updating outcome:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/trainees/:id/assessment-request - Trainee requests a new assessment
router.post('/:id/assessment-request', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { skillCategory, notes } = req.body;

    const trainee = id === 'me' || id === 'priya'
      ? await prisma.trainee.findFirst({ include: { user: true } })
      : await prisma.trainee.findUnique({ where: { id }, include: { user: true } });

    if (!trainee) {
      return res.status(404).json({ success: false, error: 'Trainee not found' });
    }

    const followUp = await prisma.followUp.create({
      data: {
        traineeId: trainee.id,
        followUpDate: new Date(),
        status: 'Assessment Requested',
        notes: notes || `Requested Level 5 assessment for: ${skillCategory || 'Industrial Automation'}`,
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: trainee.user.id,
        actorRole: 'TRAINEE',
        action: 'ASSESSMENT_REQUESTED',
        entity: 'FollowUp',
        entityId: followUp.id,
        metadata: JSON.stringify({ skillCategory, notes }),
      }
    });

    res.status(201).json({ success: true, data: followUp });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/trainees/:id/follow-up - Complete a follow-up item
router.post('/:id/follow-up', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { followUpId, notes, status } = req.body;

    if (followUpId) {
      const updated = await prisma.followUp.update({
        where: { id: followUpId },
        data: {
          status: status || 'Completed',
          notes: notes ? notes : undefined,
        }
      });
      return res.json({ success: true, data: updated });
    }

    const trainee = id === 'me' || id === 'priya'
      ? await prisma.trainee.findFirst()
      : await prisma.trainee.findUnique({ where: { id } });

    if (!trainee) {
      return res.status(404).json({ success: false, error: 'Trainee not found' });
    }

    const created = await prisma.followUp.create({
      data: {
        traineeId: trainee.id,
        followUpDate: new Date(),
        status: status || 'Completed',
        notes: notes || 'Longitudinal follow-up survey submitted.',
      }
    });

    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
export { router as traineesRouter };

