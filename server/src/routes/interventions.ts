import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { InterventionStatus } from '@prisma/client';

export const interventionsRouter = Router();

const getId = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

const createInterventionSchema = z.object({
  skillGapId: z.string(),
  type: z.string().min(2),
  providerName: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  status: z.nativeEnum(InterventionStatus).default(InterventionStatus.PLANNED)
});

const updateInterventionSchema = z.object({
  type: z.string().min(2).optional(),
  providerName: z.string().min(2).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: z.nativeEnum(InterventionStatus).optional()
});

interventionsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const interventions = await prisma.intervention.findMany({
      include: {
        skillGap: {
          include: {
            skillAssessment: {
              include: { trainee: { include: { user: true } } }
            }
          }
        },
        outcomes: true
      }
    });
    res.json({ success: true, count: interventions.length, data: interventions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

interventionsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: {
        skillGap: true,
        outcomes: {
          include: { insights: true }
        }
      }
    });
    if (!intervention) return res.status(404).json({ success: false, error: 'Intervention not found' });
    res.json({ success: true, data: intervention });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

interventionsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createInterventionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }
    const { skillGapId, type, providerName, startDate, endDate, status } = parsed.data;
    const intervention = await prisma.intervention.create({
      data: {
        skillGapId,
        type,
        providerName,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status
      }
    });
    res.status(201).json({ success: true, data: intervention });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

interventionsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    const parsed = updateInterventionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }
    const { type, providerName, startDate, endDate, status } = parsed.data;
    const intervention = await prisma.intervention.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(providerName && { providerName }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status && { status })
      }
    });
    res.json({ success: true, data: intervention });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

interventionsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    await prisma.intervention.delete({ where: { id } });
    res.json({ success: true, message: 'Intervention deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
