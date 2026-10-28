import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { JobRoleUseCases } from '../application/JobRoleUseCases.js';
import type { AgentCapability } from '../domain/JobRoleDomain.js';

export class JobRoleController {
  constructor(private useCases = new JobRoleUseCases()) {}

  getCatalog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role } = (req as AuthRequest).user;
      const agents = await this.useCases.getCatalog(role || 'VENDEDOR');
      res.json({ success: true, data: agents });
    } catch (error) {
      next(error);
    }
  };

  authorize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role } = (req as AuthRequest).user;
      const { agentCode, capability } = req.body;
      if (!agentCode) {
        res.status(400).json({ success: false, error: 'agentCode é obrigatório' });
        return;
      }
      const authResult = await this.useCases.authorizeExecution(
        role || 'VENDEDOR',
        agentCode,
        capability as AgentCapability,
      );
      if (!authResult.allowed) {
        res.status(403).json({ success: false, error: authResult.reason });
        return;
      }
      res.json({ success: true, data: authResult });
    } catch (error) {
      next(error);
    }
  };
}
