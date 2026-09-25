// server/src/lib/crudRouter.ts
// Generic CRUD route factory. One implementation, reused for every entity that
// just needs standard list/get/create/update/delete (Trainee, TrainingProvider,
// Employer, Course, Certification, Intervention). Entity-specific composite
// endpoints (dossier, cohort detail, outcomes summary) stay hand-written.

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ZodSchema } from 'zod';
import { prisma } from './prisma.js';

interface CrudRouterOptions {
  // Name of the Prisma model as exposed on the client, e.g. prisma.trainee
  model: keyof PrismaClient;
  // Zod schema validating the POST body (full create shape)
  createSchema: ZodSchema;
  // Zod schema validating the PATCH body (all fields optional)
  updateSchema: ZodSchema;
  // Optional: relations to include on list/get responses
  include?: Record<string, unknown>;
}

export function createCrudRouter({
  model,
  createSchema,
  updateSchema,
  include,
}: CrudRouterOptions): Router {
  const router = Router();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (prisma as any)[model];

  // GET /?page=&limit=  — paginated list
  router.get('/', async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));

    try {
      const [items, total] = await Promise.all([
        client.findMany({ skip: (page - 1) * limit, take: limit, include }),
        client.count(),
      ]);
      res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
      console.error(`List failed for ${String(model)}:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /:id
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const item = await client.findUnique({ where: { id: req.params.id }, include });
      if (!item) return res.status(404).json({ error: `${String(model)} not found` });
      res.json(item);
    } catch (err) {
      console.error(`Get failed for ${String(model)}:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /
  router.post('/', async (req: Request, res: Response) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    try {
      const created = await client.create({ data: parsed.data });
      res.status(201).json(created);
    } catch (err) {
      console.error(`Create failed for ${String(model)}:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH /:id
  router.patch('/:id', async (req: Request, res: Response) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    try {
      const updated = await client.update({ where: { id: req.params.id }, data: parsed.data });
      res.json(updated);
    } catch (err: any) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: `${String(model)} not found` });
      }
      console.error(`Update failed for ${String(model)}:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // DELETE /:id
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await client.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (err: any) {
      if (err.code === 'P2025') {
        return res.status(404).json({ error: `${String(model)} not found` });
      }
      console.error(`Delete failed for ${String(model)}:`, err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
