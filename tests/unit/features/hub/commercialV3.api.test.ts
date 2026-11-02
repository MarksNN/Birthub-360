import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/lib/api.js', () => ({
  api: {
    get: vi.fn(async () => ({ success: true, data: [] })),
    post: vi.fn(async () => ({ success: true, data: {} })),
  },
}));

import { api } from '../../../../src/lib/api.js';
import { commercialV3Api } from '../../../../src/features/hub/commercialV3.api.js';

describe('commercialV3Api', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockClear();
    vi.mocked(api.post).mockClear();
  });

  it('monta as URLs de catálogo, playbook, skills e política', async () => {
    await commercialV3Api.listAgents();
    await commercialV3Api.getAgent('icp');
    await commercialV3Api.getPlaybook('icp', 'P1');
    await commercialV3Api.listSkills();
    await commercialV3Api.listSkills('sdr');
    await commercialV3Api.getExecutionPolicy();

    expect(vi.mocked(api.get).mock.calls.map((call) => call[0])).toEqual([
      '/api/agent/commercial-v3/agents',
      '/api/agent/commercial-v3/agents/icp',
      '/api/agent/commercial-v3/playbooks/icp/P1',
      '/api/agent/commercial-v3/skills',
      '/api/agent/commercial-v3/skills?agentId=sdr',
      '/api/agent/commercial-v3/policy',
    ]);
  });

  it('envia missão e auditoria redteam no corpo', async () => {
    await commercialV3Api.dispatchMission({ agentId: 'icp', mission: 'Mapear ICP' });
    await commercialV3Api.evaluateRedteam({ all: true });
    expect(vi.mocked(api.post).mock.calls[0]).toEqual([
      '/api/agent/commercial-v3/dispatch',
      { agentId: 'icp', mission: 'Mapear ICP' },
    ]);
    expect(vi.mocked(api.post).mock.calls[1]).toEqual([
      '/api/agent/commercial-v3/evaluate-redteam',
      { all: true },
    ]);
  });
});
