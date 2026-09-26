import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { traineesRouter } from './routes/trainees.js';
import { cohortsRouter } from './routes/cohorts.js';
import { outcomesRouter } from './routes/outcomes.js';
import { trainingProvidersRouter } from './routes/trainingProviders.js';
import { employersRouter } from './routes/employers.js';
import { coursesRouter } from './routes/courses.js';
import { certificationsRouter } from './routes/certifications.js';
import { interventionsRouter } from './routes/interventions.js';
import { governmentRouter } from './routes/government.js';
import { notificationsRouter, auditLogsRouter } from './routes/notifications.js';
import crudEntitiesRouter from './routes/crudEntities.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// CORS configuration for Vite frontend
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check with real database connectivity testing (Phase 44)
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      server: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      server: 'ok',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/government', governmentRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api', crudEntitiesRouter);
app.use('/api/trainees', traineesRouter);
app.use('/api/cohorts', cohortsRouter);
app.use('/api/outcomes', outcomesRouter);
app.use('/api/training-providers', trainingProvidersRouter);
app.use('/api/employers', employersRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/certifications', certificationsRouter);
app.use('/api/interventions', interventionsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal Server Error',
    },
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` KaushalSetu Core API Server running on port ${PORT}`);
  console.log(` Database connected via Prisma & PostgreSQL (5432)`);
  console.log(` CORS enabled for ${CLIENT_ORIGIN}`);
  console.log(`====================================================`);
});

export default app;
