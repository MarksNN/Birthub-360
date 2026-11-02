import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CommercialAgentV3RegistryService,
  commercialAgentV3Registry,
} from '../../../../../src/features/intelligence/commercial-v3/services/commercialAgentV3Registry.service.js';

describe('CommercialAgentV3Registry — leituras que o catálogo real expõe', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devolve a mesma instância, a habilidade e a política de execução', () => {
    expect(CommercialAgentV3RegistryService.getInstance()).toBe(commercialAgentV3Registry);
    const skill = commercialAgentV3Registry.listSkills()[0];
    expect(skill?.id).toBeTruthy();
    expect(commercialAgentV3Registry.getSkill(skill.id)?.id).toBe(skill.id);
    expect(commercialAgentV3Registry.getSkill('comercial.fantasma.nao-existe')).toBeUndefined();
    expect(Object.keys(commercialAgentV3Registry.getExecutionPolicy()).length).toBeGreaterThan(0);
  });

  it('devolve nulo quando o arquivo do playbook sumiu do disco', () => {
    const agent = commercialAgentV3Registry
      .listAgents()
      .find((entry) => commercialAgentV3Registry.getPlaybooks(entry.id).length > 0);
    expect(agent).toBeTruthy();
    const playbook = commercialAgentV3Registry.getPlaybooks(agent!.id)[0];
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    expect(commercialAgentV3Registry.getPlaybookContent(agent!.id, playbook.id)).toBeNull();
    expect(commercialAgentV3Registry.getPlaybookContent(agent!.id, 'playbook-ausente')).toBeNull();
  });
});
