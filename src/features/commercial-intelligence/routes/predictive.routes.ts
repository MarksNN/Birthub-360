import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import {
  type PredictiveRevenueOracleService,
  predictiveRevenueOracleService,
} from '../services/predictiveRevenueOracle.service.js';
import {
  RebalanceApprovalError,
  type RebalanceApprovalService,
  rebalanceApprovalRequestSchema,
  rebalanceApprovalService,
} from '../services/rebalanceApproval.service.js';

/**
 * Rotas do Revenue Oracle / rebalanceamento — montadas em `commercialIntelligence.routes.ts` sob
 * `/predictive`, herdando authenticateToken + requireTenant (mount em bootstrap/routes.ts) e
 * `requireRole(COMMERCIAL_INTELLIGENCE_ROLES)` = ADMIN/GESTOR. Envelope `{ success, data }`.
 */
export function createPredictiveRoutes(deps?: {
  oracle?: PredictiveRevenueOracleService;
  approvals?: RebalanceApprovalService;
}): Router {
  const oracle = deps?.oracle ?? predictiveRevenueOracleService;
  const approvals = deps?.approvals ?? rebalanceApprovalService;
  const router = Router();

  const tenantOf = (req: Request): { organizationId: string; userId: string } | null => {
    const user = (req as unknown as AuthRequest).user;
    if (!user?.organizationId || !user.id) return null;
    return { organizationId: user.organizationId, userId: user.id };
  };
  const forbidden = (res: Response) =>
    res.status(403).json({ success: false, error: 'Organização não identificada.' });

  router.get('/cockpit', async (req, res, next: NextFunction) => {
    try {
      const t = tenantOf(req);
      if (!t) return forbidden(res);
      res.json({ success: true, data: await oracle.getCockpitData(t.organizationId) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/backtest', async (req, res, next: NextFunction) => {
    try {
      const t = tenantOf(req);
      if (!t) return forbidden(res);
      res.json({ success: true, data: await oracle.getBacktestMetrics(t.organizationId) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/rebalance/approvals', async (req, res, next: NextFunction) => {
    try {
      const t = tenantOf(req);
      if (!t) return forbidden(res);
      const parsed = rebalanceApprovalRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({
          success: false,
          error: 'Payload inválido.',
          details: z.flattenError(parsed.error).fieldErrors,
        });
      }
      const result = await approvals.decide({
        organizationId: t.organizationId,
        decidedBy: t.userId,
        input: parsed.data,
        ipAddress: req.ip,
      });
      res.status(result.alreadyRecorded ? 200 : 201).json({ success: true, data: result });
    } catch (err) {
      if (err instanceof RebalanceApprovalError) {
        const status = err.code === 'NOT_FOUND' ? 404 : 409;
        return res.status(status).json({
          success: false,
          error: err.message,
          ...(err.existing ? { data: { existing: err.existing } } : {}),
        });
      }
      next(err);
    }
  });

  return router;
}

export const predictiveRoutes = createPredictiveRoutes();
