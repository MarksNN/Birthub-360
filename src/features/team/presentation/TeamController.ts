/**
 * Team & RBAC Presentation Layer — BirthHub 360
 * Clean Architecture Modular HTTP / Route Controller
 */

import type { NextFunction, Request, Response } from 'express';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import type { TeamUseCases } from '../application/TeamUseCases.js';
import type { TeamRole } from '../domain/TeamDomain.js';
import { ASSIGNABLE_ROLES } from '../services/team.service.js';

export class TeamController {
  constructor(private readonly teamUseCases: TeamUseCases) {}

  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId =
        (req as AuthRequest).user?.organizationId || (req.query.organizationId as string);
      if (!organizationId) {
        res.status(400).json({ success: false, error: 'Contexto de organizacao obrigatorio' });
        return;
      }
      const members = await this.teamUseCases.listMembers(organizationId);
      res.json({ success: true, data: { members, assignableRoles: ASSIGNABLE_ROLES } });
    } catch (error) {
      next(error);
    }
  }

  async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organizationId || req.body.organizationId;
      const invitedBy = (req as AuthRequest).user?.id || 'system';
      const { email, role } = req.body;

      if (!email || !role) {
        res.status(400).json({ success: false, error: 'Email e papel (role) sao obrigatorios' });
        return;
      }

      const invite = await this.teamUseCases.inviteMember(
        organizationId,
        invitedBy,
        email,
        role as TeamRole,
      );
      res.status(201).json({ success: true, data: invite });
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as AuthRequest).user?.organizationId || req.body.organizationId;
      const { memberId } = req.params;
      const { role } = req.body;

      if (!memberId || !role) {
        res
          .status(400)
          .json({ success: false, error: 'ID do membro e novo papel sao obrigatorios' });
        return;
      }

      const updated = await this.teamUseCases.updateMemberRole(
        organizationId,
        memberId as string,
        role as TeamRole,
      );
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId =
        (req as AuthRequest).user?.organizationId || (req.query.organizationId as string);
      const { memberId } = req.params;

      if (!memberId) {
        res.status(400).json({ success: false, error: 'ID do membro obrigatorio' });
        return;
      }

      await this.teamUseCases.removeMember(organizationId, memberId as string);
      res.status(200).json({ success: true, message: 'Membro removido com sucesso' });
    } catch (error) {
      next(error);
    }
  }
}
