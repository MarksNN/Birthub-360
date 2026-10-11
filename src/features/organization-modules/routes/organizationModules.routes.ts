import { type NextFunction, type Request, type Response, Router } from 'express';
import { routeParam } from '../../../shared/http/routeParams.js';
import type { AuthRequest } from '../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../shared/middlewares/requireRole.js';
import type { OrganizationModulesView } from '../domain/OrganizationModules.js';
import {
  OrganizationModulesServiceError,
  organizationModulesService,
} from '../services/organizationModules.service.js';

/**
 * Montado em /api/organization-modules (authenticateToken + requireTenant em bootstrap/routes.ts).
 * Consumido por SetupWizard.tsx (/setup), OnboardingGate e RequireProductModule
 * (via useOrganizationModules).
 */
const router = Router();

type Handler = (authReq: AuthRequest, req: Request) => Promise<OrganizationModulesView>;

function handle(fn: Handler) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await fn(req as AuthRequest, req);
      res.json({ success: true, data });
    } catch (error: any) {
      if (error instanceof OrganizationModulesServiceError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      next(error);
    }
  };
}

// Leitura: qualquer usuário autenticado do tenant (o gate de módulo roda para todos os papéis).
router.get(
  '/',
  handle((authReq) => organizationModulesService.get(authReq.user.organizationId)),
);

router.use(requireRole(['ADMIN']));

// Precisa vir antes de '/:moduleKey'.
router.post(
  '/onboarding/complete',
  handle((authReq) =>
    organizationModulesService.completeOnboarding(authReq.user.organizationId, authReq.user.id),
  ),
);

router.put(
  '/',
  handle((authReq, req) =>
    organizationModulesService.replace(
      authReq.user.organizationId,
      authReq.user.id,
      (req.body as { modules?: unknown } | undefined)?.modules,
    ),
  ),
);

router.post(
  '/:moduleKey',
  handle((authReq, req) =>
    organizationModulesService.enable(
      authReq.user.organizationId,
      authReq.user.id,
      routeParam(req.params.moduleKey, 'moduleKey'),
    ),
  ),
);

router.delete(
  '/:moduleKey',
  handle((authReq, req) =>
    organizationModulesService.disable(
      authReq.user.organizationId,
      authReq.user.id,
      routeParam(req.params.moduleKey, 'moduleKey'),
    ),
  ),
);

export const organizationModulesRoutes = router;
