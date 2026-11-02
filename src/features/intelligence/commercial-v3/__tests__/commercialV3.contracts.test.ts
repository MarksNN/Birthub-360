import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../../shared/middlewares/errorHandler.js';
import { commercialAgentResultV3Schema } from '../contracts/commercialAgentResultV3.schema.js';
import { COMMERCIAL_V3_AGENT_IDS } from '../contracts/commercialAgentV3.types.js';

// Mock determinístico do AI Gateway preservando exports originais (como createUntrustedContentGuard)
vi.mock('../../../../lib/ai/gateway.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/ai/gateway.js')>();
  return {
    ...actual,
    generateStructuredOutput: vi.fn(async (options: any) => {
      if (typeof options.fallback === 'function') {
        return options.fallback();
      }
      return {
        agentId: options.agentId ?? 'supervisor',
        evaluation: 'consultivo',
        reasoning: 'Mock determinístico para teste de contrato',
        confidence: 0.95,
        operationalDecision: {
          action: 'consultive_response',
          allowOperational: false,
          summary: 'Resposta consultiva mockada',
        },
      };
    }),
  };
});

const { commercialV3Routes } = await import('../routes/commercialV3.routes.js');

function buildTestApp(userContext?: { id: string; organizationId: string; role: string }) {
  const app = express();
  app.use(express.json());

  // Injeção de contexto de autenticação/sessão
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (userContext) {
      (req as any).user = userContext;
    }
    next();
  });

  app.use('/api/agent/commercial-v3', commercialV3Routes);
  app.use(errorHandler);
  return app;
}

describe('Contract Testing — 8 Endpoints Comerciais V3.1 (Issue #142)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. GET /api/agent/commercial-v3/agents
  // =========================================================================
  describe('1. GET /api/agent/commercial-v3/agents', () => {
    it('deve retornar status 200 e lista exata dos 19 agentes comerciais', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/agent/commercial-v3/agents');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(19);

      const returnedIds = res.body.data.map((a: any) => a.id);
      for (const expectedId of COMMERCIAL_V3_AGENT_IDS) {
        expect(returnedIds).toContain(expectedId);
      }
    });
  });

  // =========================================================================
  // 2. GET /api/agent/commercial-v3/agents/:agentId
  // =========================================================================
  describe('2. GET /api/agent/commercial-v3/agents/:agentId', () => {
    it('deve retornar status 200 com contrato detalhado para agentId válido', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/agent/commercial-v3/agents/supervisor');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('agent');
      expect(res.body.data.agent.id).toBe('supervisor');
      expect(res.body.data).toHaveProperty('skillsCount');
      expect(res.body.data).toHaveProperty('skills');
      expect(res.body.data).toHaveProperty('playbooksCount');
      expect(res.body.data).toHaveProperty('playbooks');
      expect(res.body.data).toHaveProperty('handoffs');
      expect(Array.isArray(res.body.data.skills)).toBe(true);
    });

    it('deve rejeitar com status 400 quando agentId não pertence ao enum canônico', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/agent/commercial-v3/agents/agente_invalido_xyz');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // 3. GET /api/agent/commercial-v3/playbooks/:agentId/:playbookId
  // =========================================================================
  describe('3. GET /api/agent/commercial-v3/playbooks/:agentId/:playbookId', () => {
    it('deve retornar status 200 com playbook e conteúdo Markdown para ids válidos', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/agent/commercial-v3/playbooks/supervisor/P1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('playbook');
      expect(res.body.data).toHaveProperty('content');
      expect(typeof res.body.data.content).toBe('string');
      expect(res.body.data.content.length).toBeGreaterThan(0);
    });

    it('deve retornar status 400 quando agentId é inválido', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/agent/commercial-v3/playbooks/invalido/P1');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('deve retornar status 404 quando playbookId não existe para o agente', async () => {
      const app = buildTestApp();
      const res = await request(app).get(
        '/api/agent/commercial-v3/playbooks/supervisor/playbook_que_nao_existe_123',
      );

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Playbook não encontrado');
    });
  });

  // =========================================================================
  // 4. GET /api/agent/commercial-v3/skills (Alinhamento de Contrato & Query Schema)
  // =========================================================================
  describe('4. GET /api/agent/commercial-v3/skills', () => {
    it('deve retornar status 200 com total: 463 quando sem filtro de query', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/agent/commercial-v3/skills');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(463);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(463);
    });

    it('deve retornar status 200 com total correspondente quando filtrado por agentId válido', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/agent/commercial-v3/skills?agentId=supervisor');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(25);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(25);
      expect(res.body.data.every((s: any) => s.agentId === 'supervisor')).toBe(true);
    });

    it('deve retornar status 400 Bad Request quando query agentId é inválido (Desvio Issue #142)', async () => {
      const app = buildTestApp();
      const res = await request(app).get(
        '/api/agent/commercial-v3/skills?agentId=invalido_desconhecido',
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // 5. GET /api/agent/commercial-v3/policy
  // =========================================================================
  describe('5. GET /api/agent/commercial-v3/policy', () => {
    it('deve retornar status 200 com a política de execução operacional V3.1', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/agent/commercial-v3/policy');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('policyVersion');
      expect(res.body.data).toHaveProperty('enforcement', 'BACKEND_MUST_ENFORCE_NOT_MODEL');
      expect(res.body.data).toHaveProperty('limits');
      expect(res.body.data).toHaveProperty('operationalActions');
    });
  });

  // =========================================================================
  // 6. POST /api/agent/commercial-v3/context (RBAC & Validações de Contexto)
  // =========================================================================
  describe('6. POST /api/agent/commercial-v3/context', () => {
    it('deve rejeitar chamada anônima com status 401', async () => {
      const app = buildTestApp(undefined);
      const res = await request(app)
        .post('/api/agent/commercial-v3/context')
        .send({ agentId: 'supervisor' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication required');
    });

    it('deve rejeitar papel VISUALIZADOR com status 403', async () => {
      const app = buildTestApp({ id: 'u-1', organizationId: 'org-1', role: 'VISUALIZADOR' });
      const res = await request(app)
        .post('/api/agent/commercial-v3/context')
        .send({ agentId: 'supervisor' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Insufficient permissions');
    });

    it('deve rejeitar requisição sem agentId com status 400 (Required no Schema)', async () => {
      const app = buildTestApp({ id: 'u-1', organizationId: 'org-1', role: 'SDR' });
      const res = await request(app).post('/api/agent/commercial-v3/context').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('deve rejeitar skillId que não pertence ao agente com status 400', async () => {
      const app = buildTestApp({ id: 'u-1', organizationId: 'org-1', role: 'CLOSER' });
      const res = await request(app)
        .post('/api/agent/commercial-v3/context')
        .send({
          agentId: 'icp',
          skillIds: ['comercial.supervisor.entender-linguagem-natural'],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('SkillId não pertence ao agente');
    });

    it('deve retornar status 200 com contexto montado para parâmetros válidos', async () => {
      const app = buildTestApp({ id: 'u-1', organizationId: 'org-1', role: 'GESTOR' });
      const res = await request(app)
        .post('/api/agent/commercial-v3/context')
        .send({
          agentId: 'icp',
          skillIds: ['comercial.icp.construir-icp'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('systemContext');
      expect(res.body.data).toHaveProperty('state');
      expect(res.body.data.state.agentId).toBe('icp');
    });
  });

  // =========================================================================
  // 7. POST /api/agent/commercial-v3/dispatch (Limites 1..4000, Multi-Tenancy & Zod)
  // =========================================================================
  describe('7. POST /api/agent/commercial-v3/dispatch', () => {
    it('deve rejeitar chamada anônima com status 401', async () => {
      const app = buildTestApp(undefined);
      const res = await request(app)
        .post('/api/agent/commercial-v3/dispatch')
        .send({ agentId: 'sdr', mission: 'Qualificar lead inbound' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('deve rejeitar papel VISUALIZADOR com status 403', async () => {
      const app = buildTestApp({ id: 'u-1', organizationId: 'org-1', role: 'VISUALIZADOR' });
      const res = await request(app)
        .post('/api/agent/commercial-v3/dispatch')
        .send({ agentId: 'sdr', mission: 'Qualificar lead inbound' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('deve rejeitar missão vazia com status 400', async () => {
      const app = buildTestApp({ id: 'u-1', organizationId: 'org-1', role: 'CLOSER' });
      const res = await request(app)
        .post('/api/agent/commercial-v3/dispatch')
        .send({ agentId: 'sdr', mission: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('deve rejeitar missão acima de 4000 caracteres com status 400', async () => {
      const app = buildTestApp({ id: 'u-1', organizationId: 'org-1', role: 'CLOSER' });
      const res = await request(app)
        .post('/api/agent/commercial-v3/dispatch')
        .send({ agentId: 'sdr', mission: 'A'.repeat(4001) });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('deve despachar com sucesso (status 200) e respeitar o envelope de resultado V3', async () => {
      const app = buildTestApp({ id: 'u-closer', organizationId: 'tenant-42', role: 'CLOSER' });
      const res = await request(app).post('/api/agent/commercial-v3/dispatch').send({
        agentId: 'sdr',
        mission: 'Estruturar qualificação de conta B2B de saúde',
        allowOperational: false,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      // Validação formal do payload retornado contra o Zod schema canônico
      const parsed = commercialAgentResultV3Schema.safeParse(res.body.data);
      expect(parsed.success).toBe(true);
    });
  });

  // =========================================================================
  // 8. POST /api/agent/commercial-v3/evaluate-redteam (RBAC Restrito ADMIN/GESTOR)
  // =========================================================================
  describe('8. POST /api/agent/commercial-v3/evaluate-redteam', () => {
    it('deve rejeitar chamadas anônimas com status 401', async () => {
      const app = buildTestApp(undefined);
      const res = await request(app).post('/api/agent/commercial-v3/evaluate-redteam').send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('deve rejeitar papéis operacionais (CLOSER e SDR) com status 403', async () => {
      const appCloser = buildTestApp({ id: 'u-closer', organizationId: 'org-1', role: 'CLOSER' });
      const resCloser = await request(appCloser)
        .post('/api/agent/commercial-v3/evaluate-redteam')
        .send({});

      expect(resCloser.status).toBe(403);

      const appSdr = buildTestApp({ id: 'u-sdr', organizationId: 'org-1', role: 'SDR' });
      const resSdr = await request(appSdr)
        .post('/api/agent/commercial-v3/evaluate-redteam')
        .send({});

      expect(resSdr.status).toBe(403);
    });

    it('deve rejeitar agentId inválido com status 400', async () => {
      const app = buildTestApp({ id: 'u-admin', organizationId: 'org-1', role: 'ADMIN' });
      const res = await request(app)
        .post('/api/agent/commercial-v3/evaluate-redteam')
        .send({ agentId: 'agente_desconhecido' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('deve executar avaliação com status 200 quando acionado por ADMIN', async () => {
      const app = buildTestApp({ id: 'u-admin', organizationId: 'org-1', role: 'ADMIN' });
      const res = await request(app)
        .post('/api/agent/commercial-v3/evaluate-redteam')
        .send({ agentId: 'supervisor' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('agentId', 'supervisor');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('passed');
      expect(res.body.data).toHaveProperty('rate');
      expect(res.body.data).toHaveProperty('results');
    });
  });
});
