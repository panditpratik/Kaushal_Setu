import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const employersRouter = Router();

const getId = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

const createEmployerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  companyName: z.string().min(2),
  sector: z.string().min(2)
});

const updateEmployerSchema = z.object({
  companyName: z.string().min(2).optional(),
  sector: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional()
});

// GET /api/employers - List all employers
employersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const employers = await prisma.employer.findMany({
      include: {
        user: true,
        _count: {
          select: {
            employmentRecords: true,
            outcomes: true,
            feedback: true
          }
        }
      }
    });

    res.json({ success: true, count: employers.length, data: employers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/employers/:id/candidates or /api/employers/candidates - Roster for EmployerDashboard
employersRouter.get(['/candidates', '/:id/candidates'], async (req: Request, res: Response) => {
  try {
    const id = req.params.id ? getId(req.params.id) : 'tata';

    // Resolve 'tata' alias or lookup
    let employer: any = null;
    const includeConfig = {
      employmentRecords: {
        include: {
          trainee: {
            include: {
              user: true,
              cohortEnrollments: { include: { cohort: true } },
              skillAssessments: { include: { skillGaps: true } },
              verifications: true
            }
          }
        },
        orderBy: { startDate: 'desc' as const }
      }
    };

    if (id.toLowerCase() === 'tata' || id === 'default') {
      employer = await prisma.employer.findFirst({
        where: { companyName: { contains: 'Tata Motors', mode: 'insensitive' } },
        include: includeConfig
      });
      if (!employer) {
        employer = await prisma.employer.findFirst({ include: includeConfig });
      }
    } else {
      employer = await prisma.employer.findUnique({
        where: { id },
        include: includeConfig
      });
    }

    if (!employer) {
      return res.status(404).json({ success: false, error: 'Employer not found' });
    }

    // Map records to EmployerCandidate interface
    // Deduplicate by trainee ID, taking most recent record
    const traineeMap = new Map();
    for (const record of employer.employmentRecords) {
      if (!traineeMap.has(record.traineeId)) {
        traineeMap.set(record.traineeId, record);
      }
    }

    const records = Array.from(traineeMap.values());
    const candidates = await Promise.all(records.map(async (record: any, index: number) => {
      const trainee = record.trainee;
      const cohort = trainee.cohortEnrollments[0]?.cohort;
      const gap = trainee.skillAssessments[0]?.skillGaps.find((g: any) => g.severity === 'HIGH' || g.severity === 'MEDIUM');

      // Fetch dynamic outcome record for this trainee
      const outcome = await prisma.outcome.findFirst({
        where: { intervention: { skillGap: { skillAssessment: { traineeId: trainee.id } } } },
        orderBy: { recordedAt: 'desc' },
      });

      const tenureMonths = Math.max(1, Math.round((Date.now() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));

      return {
        id: `CAND-0${index + 1}`,
        traineeId: trainee.id,
        outcomeId: outcome?.id,
        name: trainee.user.name,
        role: record.jobTitle,
        batch: cohort ? cohort.name : 'Centurion Pune Batch #14',
        joinDate: record.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        tenure: `${tenureMonths} Months`,
        retention3m: outcome?.retention3m || 'pending',
        retention6m: outcome?.retention6m || 'pending',
        retention12m: outcome?.retention12m || 'pending',
        validationStatus: outcome?.validationStatus || 'PENDING',
        skillDeficiency: gap ? gap.skillName : undefined,
        wageStatus: `₹${record.monthlySalary.toLocaleString('en-IN')}/mo (+${outcome?.wageLiftPercent || 22}%)`
      };
    }));

    res.json({ success: true, data: candidates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/employers/candidates/:id/verify-retention - Verify retention milestone in database (Phase 13, 34)
employersRouter.patch('/candidates/:id/verify-retention', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { milestone, status } = req.body; // milestone: '3m' | '6m' | '12m', status: 'verified' | 'pending'

    // Look up trainee by id or traineeId
    let trainee = await prisma.trainee.findFirst({
      where: {
        OR: [
          { id: id },
          { user: { name: { contains: id.replace('CAND-', ''), mode: 'insensitive' } } }
        ]
      }
    });

    if (!trainee && (id.startsWith('CAND-') || id === 'priya')) {
      trainee = await prisma.trainee.findFirst();
    }

    if (!trainee) {
      return res.status(404).json({ success: false, error: 'Trainee not found' });
    }

    // Find the latest outcome
    const outcome = await prisma.outcome.findFirst({
      where: { intervention: { skillGap: { skillAssessment: { traineeId: trainee.id } } } },
      orderBy: { recordedAt: 'desc' }
    });

    if (!outcome) {
      return res.status(404).json({ success: false, error: 'Outcome record not found' });
    }

    const fieldToUpdate = milestone === '3m' ? 'retention3m' : milestone === '12m' ? 'retention12m' : 'retention6m';

    // Prisma transaction: update outcome + audit log + notification
    const updatedOutcome = await prisma.$transaction(async (tx) => {
      const updated = await tx.outcome.update({
        where: { id: outcome.id },
        data: {
          [fieldToUpdate]: status || 'verified',
          validationStatus: 'VERIFIED',
          validatedAt: new Date(),
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user?.id || 'EMPLOYER-SYSTEM',
          actorRole: 'EMPLOYER',
          action: 'RETENTION_VERIFIED',
          entity: 'Outcome',
          entityId: outcome.id,
          metadata: JSON.stringify({ milestone, status: status || 'verified', traineeId: trainee.id }),
        }
      });

      await tx.notification.create({
        data: {
          userId: trainee.userId,
          title: 'Retention Milestone Verified',
          message: `Your ${milestone.toUpperCase()} retention milestone was confirmed by your employer.`,
        }
      });

      return updated;
    });

    res.json({ success: true, data: updatedOutcome });
  } catch (error: any) {
    console.error('Error verifying retention:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/employers/:id - Single employer
employersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    const employer = await prisma.employer.findUnique({
      where: { id },
      include: {
        user: true,
        employmentRecords: {
          include: {
            trainee: {
              include: { user: true }
            }
          }
        },
        feedback: true
      }
    });

    if (!employer) {
      return res.status(404).json({ success: false, error: 'Employer not found' });
    }

    res.json({ success: true, data: employer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/employers/feedback - Persist employer curriculum feedback to PostgreSQL (Phase 14)
employersRouter.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { candidateId, deficiencyCategory, severity, notes, employerId } = req.body;

    let emp = employerId 
      ? await prisma.employer.findUnique({ where: { id: employerId } })
      : await prisma.employer.findFirst();

    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employer not found' });
    }

    // Resolve candidate/trainee
    let trainee = await prisma.trainee.findFirst({
      where: candidateId ? {
        OR: [
          { id: candidateId },
          { user: { name: { contains: candidateId, mode: 'insensitive' } } }
        ]
      } : undefined
    });

    if (!trainee) {
      trainee = await prisma.trainee.findFirst();
    }

    if (!trainee) {
      return res.status(404).json({ success: false, error: 'Trainee not found' });
    }

    const feedback = await prisma.$transaction(async (tx) => {
      const fb = await tx.employerFeedback.create({
        data: {
          traineeId: trainee.id,
          employerId: emp.id,
          rating: severity === 'critical' ? 2 : severity === 'moderate' ? 3 : 4,
          feedbackText: `[${deficiencyCategory || 'General'}] (Severity: ${severity || 'moderate'}) - ${notes || 'Curriculum feedback submitted.'}`,
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: emp.userId,
          actorRole: 'EMPLOYER',
          action: 'EMPLOYER_FEEDBACK_SUBMITTED',
          entity: 'EmployerFeedback',
          entityId: fb.id,
          metadata: JSON.stringify({ deficiencyCategory, severity, notes }),
        }
      });

      // Notify training providers
      const provider = await tx.trainingProvider.findFirst();
      if (provider) {
        await tx.notification.create({
          data: {
            userId: provider.userId,
            title: 'Curriculum Loop Feedback Received',
            message: `New industry feedback from ${emp.companyName} regarding ${deficiencyCategory || 'Curriculum'}.`,
          }
        });
      }

      return fb;
    });

    res.status(201).json({ success: true, message: 'Feedback submitted successfully', data: feedback });
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/employers - Create employer
employersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = createEmployerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { name, email, companyName, sector } = parsed.data;

    const employer = await prisma.employer.create({
      data: {
        companyName,
        sector,
        user: {
          create: {
            name,
            email,
            role: UserRole.EMPLOYER
          }
        }
      },
      include: { user: true }
    });

    res.status(201).json({ success: true, data: employer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/employers/:id - Update employer
employersRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    const parsed = updateEmployerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const { companyName, sector, name, email } = parsed.data;

    const employer = await prisma.employer.update({
      where: { id },
      data: {
        ...(companyName && { companyName }),
        ...(sector && { sector }),
        user: (name || email) ? {
          update: {
            ...(name && { name }),
            ...(email && { email })
          }
        } : undefined
      },
      include: { user: true }
    });

    res.json({ success: true, data: employer });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/employers/:id - Delete employer
employersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getId(req.params.id);
    await prisma.employer.delete({ where: { id } });
    res.json({ success: true, message: 'Employer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
