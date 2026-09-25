// server/src/routes/trainees.ts
// GET /api/trainees/:id/dossier
// Assembles one trainee's full longitudinal record for the Trajectory Arc card
// and dossier view. Keep this shape stable — the frontend maps it 1:1.

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/:id/dossier', async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  try {
    let trainee = null;

    if (id.toLowerCase() === 'priya' || id === 'default') {
      trainee = await prisma.trainee.findFirst({
        where: {
          user: {
            OR: [
              { name: { contains: 'Priya', mode: 'insensitive' } },
              { email: { contains: 'priya', mode: 'insensitive' } },
            ],
          },
        },
        include: {
          user: { select: { name: true, email: true } },
          verifications: true,
          certifications: {
            include: { certification: { include: { course: true } } },
          },
          employmentRecords: {
            include: { employer: { select: { companyName: true, sector: true } } },
            orderBy: { startDate: 'desc' },
          },
          skillAssessments: {
            orderBy: { assessmentDate: 'desc' },
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
            orderBy: { enrolledAt: 'desc' },
            take: 1,
          },
        },
      });
    } else {
      trainee = await prisma.trainee.findUnique({
        where: { id },
        include: {
          user: { select: { name: true, email: true } },
          verifications: true,
          certifications: {
            include: { certification: { include: { course: true } } },
          },
          employmentRecords: {
            include: { employer: { select: { companyName: true, sector: true } } },
            orderBy: { startDate: 'desc' },
          },
          skillAssessments: {
            orderBy: { assessmentDate: 'desc' },
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
            orderBy: { enrolledAt: 'desc' },
            take: 1,
          },
        },
      });
    }

    if (!trainee) {
      return res.status(404).json({ error: 'Trainee not found' });
    }

    // --- Flatten the pipeline into the ordered stages the UI consumes -------
    // TRAINEE → SKILL → JOB → OUTCOME → PROGRESS
    const stages = trainee.skillAssessments.flatMap((assessment) =>
      assessment.skillGaps.flatMap((gap) =>
        gap.interventions.flatMap((intervention) =>
          intervention.outcomes.map((outcome) => ({
            assessment: {
              id: assessment.id,
              date: assessment.assessmentDate,
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
              startDate: intervention.startDate,
              endDate: intervention.endDate,
            },
            outcome: {
              id: outcome.id,
              type: outcome.outcomeType,
              wageLiftPercent: outcome.wageLiftPercent,
              employerName: outcome.employer?.companyName ?? null,
              recordedAt: outcome.recordedAt,
            },
            insights: outcome.insights.map((i) => ({
              text: i.text,
              confidenceScore: i.confidenceScore,
            })),
          }))
        )
      )
    );

    const currentEnrollment = trainee.cohortEnrollments[0] ?? null;
    const activeEmployment = trainee.employmentRecords.find((r) => !r.endDate) ?? null;

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
        aadhaar: trainee.verifications.find((v) => v.type === 'AADHAAR')?.status ?? 'PENDING',
        epfo: trainee.verifications.find((v) => v.type === 'EPFO')?.status ?? 'PENDING',
      },
      cohort: currentEnrollment
        ? {
            name: currentEnrollment.cohort.name,
            trainingProvider: currentEnrollment.cohort.trainingProvider.orgName,
          }
        : null,
      certifications: trainee.certifications.map((tc) => ({
        name: tc.certification.name,
        course: tc.certification.course.title,
        issuedAt: tc.issuedAt,
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

export default router;
export { router as traineesRouter };
