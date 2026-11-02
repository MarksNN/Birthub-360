import { beforeEach, describe, expect, it, vi } from 'vitest';

const dispatchMission = vi.hoisted(() => vi.fn());
const mockEnv: Record<string, unknown> = { AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS: '*' };

vi.mock('../../../../config/env.js', () => ({ env: mockEnv }));
vi.mock('../../../../lib/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('../../commercial-v3/services/commercialAgentV3Orchestrator.service.js', () => ({
  commercialAgentV3Orchestrator: { dispatchMission },
}));
vi.mock('../fallback.util.js', () => ({
  buildModelWithFallback: () => ({
    withStructuredOutput: () => ({
      invoke: async () => {
        throw new Error('llm desligado no teste');
      },
    }),
  }),
}));

const { requestContext } = await import('../../../../lib/async-context.js');
const { SwarmOrchestrator, supervisorNode } = await import('../supervisor.agent.js');
const { PiiConsentRequiredError } = await import('../../services/guardrails.service.js');

describe('SwarmOrchestrator.executeCommercialV3Specialist', () => {
  const orchestrator = new SwarmOrchestrator();

  beforeEach(() => {
    dispatchMission.mockReset();
    dispatchMission.mockResolvedValue({ mode: 'CONSULTIVO' });
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = '*';
  });

  it('despacha no tenant explícito e preserva a missão', async () => {
    const result = await orchestrator.executeCommercialV3Specialist('icp', 'Monte o ICP.', {
      organizationId: 'org-ok',
      playbookId: 'pb-1',
    });

    expect(result).toEqual({ mode: 'CONSULTIVO' });
    expect(dispatchMission).toHaveBeenCalledWith({
      agentId: 'icp',
      organizationId: 'org-ok',
      mission: 'Monte o ICP.',
    });
  });

  it('cai no tenant da requisição e, sem nenhum, no org_default', async () => {
    await requestContext.run({ tenantId: 'org-ctx' }, () =>
      orchestrator.executeCommercialV3Specialist('sdr', 'Qualifique.'),
    );
    expect(dispatchMission).toHaveBeenLastCalledWith(
      expect.objectContaining({ organizationId: 'org-ctx', agentId: 'sdr' }),
    );

    dispatchMission.mockClear();
    await orchestrator.executeCommercialV3Specialist('closer', 'Feche.', { organizationId: '' });
    expect(dispatchMission).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org_default', mission: 'Feche.' }),
    );
  });

  it('bloqueia o despacho sem base legal LGPD', async () => {
    mockEnv.AI_PII_EXTERNAL_CONSENT_ORGANIZATIONS = '';

    await expect(
      orchestrator.executeCommercialV3Specialist('icp', 'Monte o ICP.', {
        organizationId: 'org-sem-base',
      }),
    ).rejects.toBeInstanceOf(PiiConsentRequiredError);
    expect(dispatchMission).not.toHaveBeenCalled();
  });
});

describe('supervisorNode — sub-swarm da missão', () => {
  function state(partial: {
    mission: string;
    subSwarm?: 'commercial' | 'marketing' | 'operations';
  }) {
    return {
      step: 0,
      completed: [],
      results: {},
      messages: [],
      instruction: '',
      next: 'sdr' as const,
      leadId: '',
      mission: partial.mission,
      subSwarm: partial.subSwarm,
    };
  }

  it('respeita o sub-swarm explícito e detecta churn ou operação quando o estado é comercial', async () => {
    const explicit = await supervisorNode(
      state({ mission: 'qualquer coisa', subSwarm: 'marketing' }) as never,
    );
    expect(explicit.subSwarm).toBe('marketing');

    const churn = await supervisorNode(
      state({ mission: 'reduzir o churn da conta', subSwarm: 'commercial' }) as never,
    );
    expect(churn.subSwarm).toBe('customer_success');

    const ops = await supervisorNode(state({ mission: 'criar tarefa no crm' }) as never);
    expect(ops.subSwarm).toBe('operations');
  });
});
