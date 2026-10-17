import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import {
  type SocialSellingApproachService,
  socialSellingApproachService,
} from './socialSellingApproach.service.js';

export class SocialSellingController {
  constructor(
    private readonly service: SocialSellingApproachService = socialSellingApproachService,
  ) {}

  generateApproach = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { organizationId, id: userId } = authReq.user;
      const { targetCompany, targetRole, segment, triggerEvent, channel, tone } = req.body || {};

      const result = await this.service.generateApproach(organizationId, userId, {
        targetCompany,
        targetRole,
        segment,
        triggerEvent,
        channel,
        tone,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const socialSellingController = new SocialSellingController();
