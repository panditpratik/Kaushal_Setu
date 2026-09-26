import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const notificationsRouter = Router();

// GET /api/notifications - List notifications
notificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const notifications = await prisma.notification.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
notificationsRouter.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export const auditLogsRouter = Router();

// GET /api/audit-logs - View system audit trail
auditLogsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
