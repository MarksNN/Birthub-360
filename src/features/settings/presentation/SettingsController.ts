/**
 * Settings Presentation Layer — BirthHub 360
 * Clean Architecture Modular HTTP Controller
 */

import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import type { SettingsUseCases } from '../application/SettingsUseCases.js';

export class SettingsController {
  constructor(private readonly settingsUseCases: SettingsUseCases) {}

  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId =
        (req as AuthRequest).user?.organizationId || (req.query.organizationId as string);
      if (!organizationId) {
        res.status(400).json({ success: false, error: 'Contexto de organizacao obrigatorio' });
        return;
      }
      const settings = await this.settingsUseCases.getSettings(organizationId);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organizationId || req.body.organizationId;
      if (!organizationId) {
        res.status(400).json({ success: false, error: 'Contexto de organizacao obrigatorio' });
        return;
      }
      const updated = await this.settingsUseCases.updateSettings({
        ...req.body,
        organizationId,
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
