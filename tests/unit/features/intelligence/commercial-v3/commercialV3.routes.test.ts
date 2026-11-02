import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../src/lib/ai/gateway.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../src/lib/ai/gateway.js')>();
  return {
    ...actual,
    generateStructuredOutput: vi.fn(async (options: { fallback?: () => unknown }) => {
      if (typeof options.fallback === 'function') return options.fallback();
      throw new Error('fallback ausente no teste');
    }),
  };
});
import { commercialV3Routes } from '../../../../../src/features/intelligence/commercial-v3/routes/commercialV3.routes.js';
import { commercialAgentV3Registry } from '../../../../../src/features/intelligence/commercial-v3/services/commercialAgentV3Registry.service.js';

function buildApp(user?: { id: string; role: string; organizationId: string }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) (req as Request & { user: typeof user }).user = user;
    next();
  });
  app.use('/api/agent/commercial-v3', commercialV3Routes);
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'erro';
    res.status(400).json({ success: false, error: message });
  });
  return app;
}

describe('rotas da suíte comercial V3.1', () => {
  const admin = buildApp({ id: 'user-1', role: 'ADMIN', organizationId: 'org-1' });
  const sdr = buildApp({ id: 'user-2', role: 'SDR', organizationId: 'org-1' });
  const viewer = buildApp({ id: 'user-3', role: 'VISUALIZADOR', organizationId: 'org-1' });
  const anonymous = buildApp();
  let skillId = '';

  beforeAll(() => {
    skillId = commercialAgentV3Registry.listSkills('icp')[0].id;
  });

  it('lista agentes, detalhe, playbook, skills e política', async () => {
    const agents = await request(admin).get('/api/agent/commercial-v3/agents');
    expect(agents.status).toBe(200);
    expect(agents.body.data).toHaveLength(19);

    const detail = await request(admin).get('/api/agent/commercial-v3/agents/icp');
    expect(detail.status).toBe(200);
    expect(detail.body.data.agent.id).toBe('icp');
    expect(detail.body.data.skills.length).toBeGreaterThan(0);

    const missingAgent = await request(admin).get('/api/agent/commercial-v3/agents/nao-existe');
    expect(missingAgent.status).toBe(400);

    const playbookId = detail.body.data.playbooks[0].id as string;
    const playbook = await request(admin).get(
      `/api/agent/commercial-v3/playbooks/icp/${playbookId}`,
    );
    expect(playbook.status).toBe(200);
    expect(playbook.body.data.content.length).toBeGreaterThan(0);

    const missingPlaybook = await request(admin).get(
      '/api/agent/commercial-v3/playbooks/icp/P99_INEXISTENTE',
    );
    expect(missingPlaybook.status).toBe(404);
    expect(missingPlaybook.body.success).toBe(false);

    const filtered = await request(admin).get('/api/agent/commercial-v3/skills?agentId=sdr');
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.every((skill: { agentId: string }) => skill.agentId === 'sdr')).toBe(
      true,
    );

    const allSkills = await request(admin).get(
      '/api/agent/commercial-v3/skills?agentId=desconhecido',
    );
    expect(allSkills.status).toBe(200);
    expect(allSkills.body.total).toBe(463);

    const policy = await request(admin).get('/api/agent/commercial-v3/policy');
    expect(policy.status).toBe(200);
    expect(policy.body.success).toBe(true);
  });

  it('exige papel de escrita no contexto e rejeita skill de outro agente', async () => {
    expect((await request(anonymous).post('/api/agent/commercial-v3/context').send({})).status).toBe(
      401,
    );
    expect(
      (
        await request(viewer)
          .post('/api/agent/commercial-v3/context')
          .send({ agentId: 'icp', skillIds: [skillId] })
      ).status,
    ).toBe(403);

    const ok = await request(sdr)
      .post('/api/agent/commercial-v3/context')
      .send({ agentId: 'icp', skillIds: [skillId] });
    expect(ok.status).toBe(200);
    expect(ok.body.data.state.agentId).toBe('icp');

    const badSkill = await request(sdr)
      .post('/api/agent/commercial-v3/context')
      .send({ agentId: 'icp', skillIds: ['comercial.supervisor.entender-linguagem-natural'] });
    expect(badSkill.status).toBe(400);
  });

  it('despacha missão consultiva e recusa missão vazia', async () => {
    const ok = await request(sdr).post('/api/agent/commercial-v3/dispatch').send({
      agentId: 'supervisor',
      mission: 'Priorize oportunidades do trimestre sem enviar mensagem.',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data.execution.performed).toBe(false);
    expect(ok.body.data.compliance.sendEligible).toBe(false);

    const empty = await request(sdr)
      .post('/api/agent/commercial-v3/dispatch')
      .send({ agentId: 'supervisor', mission: '   ' });
    expect(empty.status).toBe(400);
  });

  it('roda redteam por agente, por padrão e na suíte inteira só para gestão', async () => {
    expect(
      (await request(sdr).post('/api/agent/commercial-v3/evaluate-redteam').send({ all: true }))
        .status,
    ).toBe(403);

    const one = await request(admin)
      .post('/api/agent/commercial-v3/evaluate-redteam')
      .send({ agentId: 'icp' });
    expect(one.status).toBe(200);
    expect(one.body.data.agentId).toBe('icp');

    const fallback = await request(admin).post('/api/agent/commercial-v3/evaluate-redteam').send({});
    expect(fallback.status).toBe(200);
    expect(fallback.body.data.agentId).toBe('supervisor');

    const all = await request(admin)
      .post('/api/agent/commercial-v3/evaluate-redteam')
      .send({ all: true });
    expect(all.status).toBe(200);
    expect(all.body.data.totalCasesEvaluated).toBe(209);
    expect(all.body.data.totalAgentsEvaluated).toBe(19);
  }, 30000);
});
