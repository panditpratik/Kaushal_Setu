// server/src/routes/crudEntities.ts
// Wires the generic crudRouter to every entity that only needs standard
// list/get/create/update/delete. Register this once in your Express entry point.

import { Router } from 'express';
import { z } from 'zod';
import { createCrudRouter } from '../lib/crudRouter.js';

const router = Router();

// --- TrainingProvider --------------------------------------------------------
router.use(
  '/training-providers',
  createCrudRouter({
    model: 'trainingProvider',
    createSchema: z.object({
      userId: z.string(),
      orgName: z.string().min(1),
      accreditationId: z.string().min(1),
    }),
    updateSchema: z.object({
      orgName: z.string().min(1).optional(),
      accreditationId: z.string().min(1).optional(),
    }),
  })
);

// --- Employer -----------------------------------------------------------------
router.use(
  '/employers',
  createCrudRouter({
    model: 'employer',
    createSchema: z.object({
      userId: z.string(),
      companyName: z.string().min(1),
      sector: z.string().min(1),
    }),
    updateSchema: z.object({
      companyName: z.string().min(1).optional(),
      sector: z.string().min(1).optional(),
    }),
  })
);

// --- Course ---------------------------------------------------------------
router.use(
  '/courses',
  createCrudRouter({
    model: 'course',
    createSchema: z.object({
      title: z.string().min(1),
      category: z.string().min(1),
    }),
    updateSchema: z.object({
      title: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
    }),
    include: { certifications: true },
  })
);

// --- Certification --------------------------------------------------------
router.use(
  '/certifications',
  createCrudRouter({
    model: 'certification',
    createSchema: z.object({
      courseId: z.string(),
      name: z.string().min(1),
      issuingBody: z.string().min(1),
    }),
    updateSchema: z.object({
      name: z.string().min(1).optional(),
      issuingBody: z.string().min(1).optional(),
    }),
  })
);

// --- Intervention -----------------------------------------------------------
router.use(
  '/interventions',
  createCrudRouter({
    model: 'intervention',
    createSchema: z.object({
      skillGapId: z.string(),
      type: z.string().min(1),
      providerName: z.string().min(1),
      startDate: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'DROPPED']).optional(),
    }),
    updateSchema: z.object({
      type: z.string().min(1).optional(),
      providerName: z.string().min(1).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'DROPPED']).optional(),
    }),
  })
);

// --- Trainee ------------------------------------------------------------------
// Note: keep this separate from the /api/trainees/:id/dossier route (already
// registered elsewhere) — mount this one at /api/trainees/crud to avoid a
// path collision with the composite dossier endpoint.
router.use(
  '/trainees/crud',
  createCrudRouter({
    model: 'trainee',
    createSchema: z.object({
      userId: z.string(),
      dob: z.coerce.date(),
      gender: z.string().optional(),
      aadhaarLinked: z.boolean().optional(),
      epfoId: z.string().optional(),
    }),
    updateSchema: z.object({
      gender: z.string().optional(),
      aadhaarLinked: z.boolean().optional(),
      epfoId: z.string().optional(),
    }),
  })
);

export default router;
export { router as crudEntitiesRouter };
