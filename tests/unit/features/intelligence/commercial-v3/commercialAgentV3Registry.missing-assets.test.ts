import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  const existsSync = () => false;
  const readFileSync = () => '';
  return {
    ...actual,
    existsSync,
    readFileSync,
    default: {
      ...actual,
      existsSync,
      readFileSync,
    },
  };
});

const { CommercialAgentV3RegistryService, commercialAgentV3Registry } = await import(
  '../../../../../src/features/intelligence/commercial-v3/services/commercialAgentV3Registry.service.js'
);

describe('CommercialAgentV3Registry sem diretório de assets', () => {
  it('sobe vazio e não lê catálogo, handoff nem política', () => {
    expect(commercialAgentV3Registry.listAgents()).toEqual([]);
    expect(commercialAgentV3Registry.listSkills()).toEqual([]);
    expect(commercialAgentV3Registry.listSkills('icp')).toEqual([]);
    expect(commercialAgentV3Registry.getAgent('icp')).toBeUndefined();
    expect(commercialAgentV3Registry.getSkill('comercial.icp.qualquer')).toBeUndefined();
    expect(commercialAgentV3Registry.getPlaybooks('icp')).toEqual([]);
    expect(commercialAgentV3Registry.getHandoffCandidates('icp')).toEqual([]);
    expect(commercialAgentV3Registry.getExecutionPolicy()).toEqual({});
    expect(commercialAgentV3Registry.getPlaybookContent('icp', 'qualquer')).toBeNull();
    expect(CommercialAgentV3RegistryService.getInstance()).toBe(commercialAgentV3Registry);
    expect(commercialAgentV3Registry.getAssetsRoot()).toMatch(/commercial-v3[\\/]assets$/);
  });
});
