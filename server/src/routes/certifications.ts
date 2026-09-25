import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

export const certificationsRouter = Router();

const getId = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

const createCertSchema = z.object({
  courseId: z.string(),
  name: z.string().min(2),
  issuingBody: z.string().min(2)
});

const updateCertSchema = z.object({
  courseId: z.string().optional(),
  name: z.string().min(2).optional(),
  issuingBody: z.string().min(2).optional()
});

certificationsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const certs = await prisma.certification.findMany({
      include: {
        course: true,
        _count: { select: { trainees: true } }
      }
    });
    res.json({ success: true, count: certs.length, data: certs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

certificationsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    const cert = await prisma.certification.findUnique({
      where: { id },
      include: {
        course: true,
        trainees: {
          include: { trainee: { include: { user: true } } }
        }
      }
    });
    if (!cert) return res.status(404).json({ success: false, error: 'Certification not found' });
    res.json({ success: true, data: cert });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

certificationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createCertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }
    const cert = await prisma.certification.create({
      data: parsed.data,
      include: { course: true }
    });
    res.status(201).json({ success: true, data: cert });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

certificationsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    const parsed = updateCertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }
    const cert = await prisma.certification.update({
      where: { id },
      data: parsed.data,
      include: { course: true }
    });
    res.json({ success: true, data: cert });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

certificationsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    await prisma.certification.delete({ where: { id } });
    res.json({ success: true, message: 'Certification deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
