import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import traineesRouter from './routes/trainees.js';
import cohortsRouter from './routes/cohorts.js';
import outcomesRouter from './routes/outcomes.js';
import { trainingProvidersRouter } from './routes/trainingProviders.js';
import { employersRouter } from './routes/employers.js';
import { coursesRouter } from './routes/courses.js';
import { certificationsRouter } from './routes/certifications.js';
import { interventionsRouter } from './routes/interventions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// CORS configuration for Vite frontend
app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    system: 'KaushalSetu Sovereign Core API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
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
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` KaushalSetu Core API Server running on port ${PORT}`);
  console.log(` Database connected via Prisma & PostgreSQL`);
  console.log(` CORS enabled for ${CLIENT_ORIGIN}`);
  console.log(`====================================================`);
});
