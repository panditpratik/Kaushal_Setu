import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

export const coursesRouter = Router();

const getId = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

const createCourseSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(2)
});

const updateCourseSchema = z.object({
  title: z.string().min(2).optional(),
  category: z.string().min(2).optional()
});

coursesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        certifications: true
      }
    });
    res.json({ success: true, count: courses.length, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

coursesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    const course = await prisma.course.findUnique({
      where: { id },
      include: { certifications: true }
    });
    if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

coursesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }
    const course = await prisma.course.create({ data: parsed.data });
    res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

coursesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    const parsed = updateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }
    const course = await prisma.course.update({
      where: { id },
      data: parsed.data
    });
    res.json({ success: true, data: course });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

coursesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    await prisma.course.delete({ where: { id } });
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
