// server/src/routes/cohorts.ts
// GET /api/cohorts/:id — cohort + enrolled trainees + provider

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const cohortIncludeConfig = {
  trainingProvider: { select: { orgName: true, accreditationId: true } },
  enrollments: {
    include: {
      trainee: {
        include: {
          user: { select: { name: true } },
          verifications: true,
        },
      },
    },
    orderBy: { enrolledAt: 'asc' as const },
  },
};

router.get('/:id', async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  try {
    const isDefault = id === 'default';
    const cohort = isDefault
      ? await prisma.cohort.findFirst({ include: cohortIncludeConfig })
      : await prisma.cohort.findUnique({
          where: { id },
          include: cohortIncludeConfig,
        });

    if (!cohort) {
      return res.status(404).json({ error: 'Cohort not found' });
    }

    res.json({
      id: cohort.id,
      name: cohort.name,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      trainingProvider: cohort.trainingProvider,
      trainees: cohort.enrollments.map((e) => ({
        id: e.trainee.id,
        name: e.trainee.user.name,
        aadhaarLinked: e.trainee.aadhaarLinked,
        epfoVerified:
          e.trainee.verifications.find((v) => v.type === 'EPFO')?.status === 'VERIFIED',
        enrolledAt: e.enrolledAt,
      })),
    });
  } catch (err) {
    console.error('Failed to fetch cohort:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/cohorts - List cohorts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.query;
    const cohorts = await prisma.cohort.findMany({
      where: providerId ? { trainingProviderId: String(providerId) } : undefined,
      include: {
        trainingProvider: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    res.json({ success: true, count: cohorts.length, data: cohorts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
export { router as cohortsRouter };
