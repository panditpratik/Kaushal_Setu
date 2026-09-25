import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

export const cohortsRouter = Router();

const getId = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

const createCohortSchema = z.object({
  trainingProviderId: z.string(),
  name: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional()
});

const updateCohortSchema = z.object({
  trainingProviderId: z.string().optional(),
  name: z.string().min(2).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional()
});

// GET /api/cohorts - List cohorts
cohortsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.query;

    const cohorts = await prisma.cohort.findMany({
      where: providerId ? { trainingProviderId: String(providerId) } : undefined,
      include: {
        trainingProvider: true,
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    res.json({
      success: true,
      count: cohorts.length,
      data: cohorts
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/cohorts/:id - Cohort + trainees + provider
cohortsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);

    const cohort = await prisma.cohort.findUnique({
      where: { id },
      include: {
        trainingProvider: {
          include: { user: true }
        },
        enrollments: {
          include: {
            trainee: {
              include: {
                user: true,
                certifications: {
                  include: { certification: true }
                },
                employmentRecords: {
                  include: { employer: true }
                },
                verifications: true
              }
            }
          }
        }
      }
    });

    if (!cohort) {
      return res.status(404).json({ success: false, error: 'Cohort not found' });
    }

    res.json({
      success: true,
      data: {
        cohort,
        provider: cohort.trainingProvider,
        trainees: cohort.enrollments.map(e => ({
          enrollmentId: e.id,
          enrolledAt: e.enrolledAt,
          ...e.trainee
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/cohorts - Create cohort
cohortsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createCohortSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { trainingProviderId, name, startDate, endDate } = parsed.data;

    const cohort = await prisma.cohort.create({
      data: {
        trainingProviderId,
        name,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null
      },
      include: { trainingProvider: true }
    });

    res.status(201).json({ success: true, data: cohort });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/cohorts/:id - Update cohort
cohortsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    const parsed = updateCohortSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { trainingProviderId, name, startDate, endDate } = parsed.data;

    const cohort = await prisma.cohort.update({
      where: { id },
      data: {
        ...(trainingProviderId && { trainingProviderId }),
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null })
      },
      include: { trainingProvider: true }
    });

    res.json({ success: true, data: cohort });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/cohorts/:id - Delete cohort
cohortsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    await prisma.cohort.delete({ where: { id } });
    res.json({ success: true, message: 'Cohort deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
