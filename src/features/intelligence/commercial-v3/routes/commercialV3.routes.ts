import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../../../shared/middlewares/authenticateToken.js';
import { requireRole } from '../../../../shared/middlewares/requireRole.js';
import { validateRequest } from '../../../../shared/middlewares/validateRequest.js';
import { COMMERCIAL_V3_AGENT_IDS } from '../contracts/commercialAgentV3.types.js';
import { commercialRedteamEvaluator } from '../evaluation/commercialRedteamEvaluator.service.js';
import { commercialAgentV3Orchestrator } from '../services/commercialAgentV3Orchestrator.service.js';
import { commercialAgentV3Registry } from '../services/commercialAgentV3Registry.service.js';
import { commercialContextBuilder } from '../services/commercialContextBuilder.service.js';

const router = Router();
const writeRoles = requireRole(['ADMIN', 'GESTOR', 'CLOSER', 'SDR']);
const adminRoles = requireRole(['ADMIN', 'GESTOR']);

const agentIdParamSchema = z.object({
  agentId: z.enum(COMMERCIAL_V3_AGENT_IDS),
});

const playbookParamSchema = z.object({
  agentId: z.enum(COMMERCIAL_V3_AGENT_IDS),
  playbookId: z.string().min(1),
});

const buildContextSchema = z.object({
  agentId: z.enum(COMMERCIAL_V3_AGENT_IDS),
  skillIds: z.array(z.string()).optional(),
});

const dispatchMissionSchema = z.object({
  agentId: z.enum(COMMERCIAL_V3_AGENT_IDS),
  skillIds: z.array(z.string()).optional(),
  mission: z.string().trim().min(1, 'A missão não pode ser vazia').max(4_000),
  correlationId: z.string().optional(),
  allowOperational: z.boolean().optional(),
});

const evaluateRedteamSchema = z.object({
  agentId: z.enum(COMMERCIAL_V3_AGENT_IDS).optional(),
  all: z.boolean().optional(),
});

/**
 * GET /api/agent/commercial-v3/agents
 * Retorna os 19 agentes comerciais da suíte V3.1.
 */
router.get('/agents', (_req: Request, res: Response) => {
  const agents = commercialAgentV3Registry.listAgents();
  res.json({ success: true, data: agents });
});

/**
 * GET /api/agent/commercial-v3/agents/:agentId
 * Detalhes de um agente específico, suas habilidades e playbooks.
 */
router.get(
  '/agents/:agentId',
  validateRequest({ params: agentIdParamSchema }),
  (req: Request, res: Response) => {
    const { agentId } = req.params as z.infer<typeof agentIdParamSchema>;
    const agent = commercialAgentV3Registry.getAgent(agentId);
    if (!agent) {
      res.status(404);
      res.json({ success: false, error: 'Agente não encontrado' });
      return;
    }

    const skills = commercialAgentV3Registry.listSkills(agentId);
    const playbooks = commercialAgentV3Registry.getPlaybooks(agentId);
    const handoffs = commercialAgentV3Registry.getHandoffCandidates(agentId);

    res.json({
      success: true,
      data: {
        agent,
        skillsCount: skills.length,
        skills,
        playbooksCount: playbooks.length,
        playbooks,
        handoffs,
      },
    });
  },
);

/**
 * GET /api/agent/commercial-v3/playbooks/:agentId/:playbookId
 * Retorna o conteúdo Markdown e metadados de um Playbook operacional específico.
 */
router.get(
  '/playbooks/:agentId/:playbookId',
  validateRequest({ params: playbookParamSchema }),
  (req: Request, res: Response) => {
    const { agentId, playbookId } = req.params as z.infer<typeof playbookParamSchema>;
    const playbookData = commercialAgentV3Registry.getPlaybookContent(agentId, playbookId);
    if (!playbookData) {
      res.status(404);
      res.json({ success: false, error: 'Playbook não encontrado' });
      return;
    }

    res.json({ success: true, data: playbookData });
  },
);

/**
 * GET /api/agent/commercial-v3/skills
 * Retorna a lista das 463 habilidades do catálogo, opcionalmente filtrada por agentId.
 */
router.get('/skills', (req: Request, res: Response) => {
  const agentId = req.query.agentId as string | undefined;
  if (agentId && (COMMERCIAL_V3_AGENT_IDS as readonly string[]).includes(agentId)) {
    const skills = commercialAgentV3Registry.listSkills(agentId as any);
    res.json({ success: true, data: skills });
    return;
  }
  const skills = commercialAgentV3Registry.listSkills();
  res.json({ success: true, total: skills.length, data: skills });
});

/**
 * GET /api/agent/commercial-v3/policy
 * Retorna a política de execução V3.1 e limites operacionais.
 */
router.get('/policy', (_req: Request, res: Response) => {
  const policy = commercialAgentV3Registry.getExecutionPolicy();
  res.json({ success: true, data: policy });
});

/**
 * POST /api/agent/commercial-v3/context
 * Monta o contexto para um agente e suas habilidades selecionadas.
 */
router.post(
  '/context',
  writeRoles,
  validateRequest(buildContextSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId, skillIds } = req.body as z.infer<typeof buildContextSchema>;
      const result = await commercialContextBuilder.buildContext(agentId, skillIds ?? []);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/agent/commercial-v3/dispatch
 * Despacha uma missão comercial para um especialista V3.1.
 */
router.post(
  '/dispatch',
  writeRoles,
  validateRequest(dispatchMissionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthRequest).user;
      const { agentId, skillIds, mission, correlationId, allowOperational } = req.body as z.infer<
        typeof dispatchMissionSchema
      >;

      const result = await commercialAgentV3Orchestrator.dispatchMission({
        agentId,
        skillIds,
        mission,
        organizationId: user.organizationId,
        userId: user.id,
        correlationId,
        allowOperational,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/agent/commercial-v3/evaluate-redteam
 * Executa a avaliação da suíte Golden Redteam (209 casos) contra injeções de prompt e limites.
 */
router.post(
  '/evaluate-redteam',
  adminRoles,
  validateRequest(evaluateRedteamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId, all } = req.body as z.infer<typeof evaluateRedteamSchema>;

      if (agentId) {
        const report = await commercialRedteamEvaluator.evaluateAgent(agentId);
        res.json({ success: true, data: report });
        return;
      }

      if (all) {
        const report = await commercialRedteamEvaluator.evaluateAll();
        res.json({ success: true, data: report });
        return;
      }

      // Se não especificou nem agentId nem all, roda para o Supervisor como padrão
      const report = await commercialRedteamEvaluator.evaluateAgent('supervisor');
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  },
);

export const commercialV3Routes = router;
