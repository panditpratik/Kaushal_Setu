import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, JWT_SECRET } from '../lib/authMiddleware.js';
import { UserRole } from '@prisma/client';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole),
  orgName: z.string().optional(),
  companyName: z.string().optional(),
  sector: z.string().optional(),
  department: z.string().optional(),
  region: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' },
      });
    }

    const { name, email, password, role, orgName, companyName, sector, department, region } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash,
        ...(role === UserRole.TRAINEE && {
          trainee: {
            create: {
              dob: new Date('2002-01-01'),
              aadhaarLinked: false,
            },
          },
        }),
        ...(role === UserRole.EMPLOYER && {
          employer: {
            create: {
              companyName: companyName || `${name} Enterprises`,
              sector: sector || 'Industrial Engineering',
            },
          },
        }),
        ...(role === UserRole.TRAINING_PROVIDER && {
          trainingProvider: {
            create: {
              orgName: orgName || `${name} Academy`,
              accreditationId: `NCVET-${Date.now().toString().slice(-6)}`,
            },
          },
        }),
        ...(role === UserRole.GOVERNMENT && {
          governmentUser: {
            create: {
              department: department || 'Skill Development Directorate',
              region: region || 'National Portal',
            },
          },
        }),
      },
      include: {
        trainee: true,
        employer: true,
        trainingProvider: true,
        governmentUser: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'USER_REGISTERED',
        entity: 'User',
        entityId: user.id,
        metadata: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          traineeId: user.trainee?.id,
          employerId: user.employer?.id,
          providerId: user.trainingProvider?.id,
          govId: user.governmentUser?.id,
        },
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Internal server error' },
    });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' },
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        trainee: true,
        employer: true,
        trainingProvider: true,
        governmentUser: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        metadata: JSON.stringify({ email: user.email }),
      },
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          traineeId: user.trainee?.id,
          employerId: user.employer?.id,
          providerId: user.trainingProvider?.id,
          govId: user.governmentUser?.id,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Internal server error' },
    });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});
