import { type NextFunction, type Request, type Response, Router } from 'express';
import { prisma } from '../../../lib/prisma.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';

const router = Router();

router.get('/agents', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizationId = (req as AuthRequest).user.organizationId;

    // Aggregate tokens per agentRole
    const logs = await prisma.aILog.groupBy({
      by: ['agentRole'],
      where: { organizationId, agentRole: { not: null } },
      _sum: { tokens: true },
      _max: { createdAt: true },
    });

    const agents = logs.map((log) => {
      const isWorking = log._max.createdAt
        ? Date.now() - log._max.createdAt.getTime() < 5 * 60 * 1000
        : false;
      return {
        id: log.agentRole || 'unknown',
        name: log.agentRole,
        role: `Clula ${log.agentRole}`,
        status: isWorking ? 'WORKING' : 'IDLE',
        tokensUsed: log._sum.tokens ?? 0,
        lastActive: log._max.createdAt ? log._max.createdAt.toISOString() : 'N/A',
      };
    });

    res.json({ success: true, data: agents });
  } catch (error) {
    next(error);
  }
});

router.get('/logs', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizationId = (req as AuthRequest).user.organizationId;
    const recentLogs = await prisma.aILog.findMany({
      where: { organizationId, agentRole: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const logs = recentLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt.toLocaleTimeString('pt-BR'),
      agent: log.agentRole,
      action: `Inferncia com ${log.model} (${log.tokens} tokens, ${log.latencyMs}ms)`,
      level: 'info',
    }));

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

export const swarmObservabilityRoutes = router;
