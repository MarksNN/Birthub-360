import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import { SalesOrchestrationService } from './SalesOrchestrationService.js';

export class SalesOrchestrationController {
  static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.db || !authReq.user?.organizationId) {
        throw new AppError('Contexto de organização não inicializado.', 500);
      }

      const service = new SalesOrchestrationService(authReq.db, authReq.user.organizationId);
      const overview = await service.getOverview();

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }
}
