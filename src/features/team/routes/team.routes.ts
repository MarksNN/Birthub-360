import { type NextFunction, type Request, type Response, Router } from 'express';
import { container } from '../../../shared/di/container.js';
import { routeParam } from '../../../shared/http/routeParams.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import { TeamUseCases } from '../application/TeamUseCases.js';
import { PrismaTeamRepository } from '../infrastructure/PrismaTeamRepository.js';
import { TeamController } from '../presentation/TeamController.js';
import {
  createTeamMember,
  deleteTeamMember,
  listAssignableOwners,
  resetTeamMemberPassword,
  TeamServiceError,
  unlockTeamMember,
} from '../services/team.service.js';

const router = Router();

function resolve(): TeamController {
  try {
    return container.resolve<TeamController>('TeamController');
  } catch {
    const repo = new PrismaTeamRepository();
    const useCases = new TeamUseCases(repo);
    const ctrl = new TeamController(useCases);
    container.register('TeamRepository', repo);
    container.register('TeamUseCases', useCases);
    container.register('TeamController', ctrl);
    return ctrl;
  }
}

// Rota publica para usuarios autenticados da organizacao: ver a lista de possiveis responsaveis
// (atribuicao de leads, contatos, etc.) nao exige papel ADMIN. Fica ANTES do requireRole(['ADMIN'])
// abaixo, que protege o resto da gestao de equipe (criar/excluir usuario, ver a lista completa).
router.get(
  '/assignable',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const owners = await listAssignableOwners((req as AuthRequest).user.organizationId);
      res.json({ success: true, data: { owners } });
    } catch (error: any) {
      next(error);
    }
  },
);

router.use(requireRole(['ADMIN']));

// Rotas integradas via Clean Architecture / DI Container
router.get('/', (req: Request, res: Response, next: NextFunction) =>
  resolve().getMembers(req, res, next),
);

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const { name, email, role } = req.body;
    const { member, tempPassword } = await createTeamMember({
      organizationId: authReq.user.organizationId,
      name,
      email,
      role,
    });
    res.status(201).json({ success: true, data: { member, tempPassword } });
  } catch (error) {
    if (error instanceof TeamServiceError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

router.post('/invite', (req: Request, res: Response, next: NextFunction) =>
  resolve().inviteMember(req, res, next),
);

router.put('/:memberId/role', (req: Request, res: Response, next: NextFunction) =>
  resolve().updateRole(req, res, next),
);

router.post(
  '/:id/reset-password',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const { member, tempPassword } = await resetTeamMemberPassword(
        authReq.user.organizationId,
        routeParam(req.params.id, 'id'),
      );
      res.json({ success: true, data: { member, tempPassword } });
    } catch (error) {
      if (error instanceof TeamServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  },
);

router.post(
  '/:id/unlock',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const member = await unlockTeamMember(
        authReq.user.organizationId,
        routeParam(req.params.id, 'id'),
      );
      res.json({ success: true, data: { member } });
    } catch (error) {
      if (error instanceof TeamServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  },
);

router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    await deleteTeamMember(
      authReq.user.organizationId,
      routeParam(req.params.id, 'id'),
      authReq.user.id,
    );
    res.json({ success: true, message: 'Usuario removido.' });
  } catch (error) {
    if (error instanceof TeamServiceError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
});

export const teamRoutes = router;
