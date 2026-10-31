import { describe, expect, it } from 'vitest';
import { commercialAgentResultV3Schema } from '../contracts/commercialAgentResultV3.schema.js';
import { COMMERCIAL_V3_AGENT_IDS } from '../contracts/commercialAgentV3.types.js';
import { commercialRedteamEvaluator } from '../evaluation/commercialRedteamEvaluator.service.js';
import { commercialAgentV3Orchestrator } from '../services/commercialAgentV3Orchestrator.service.js';
import { commercialAgentV3Registry } from '../services/commercialAgentV3Registry.service.js';
import { commercialContextBuilder } from '../services/commercialContextBuilder.service.js';

describe('Célula Comercial V3.1 — Catálogo e Integridade Estrutural', () => {
  it('deve conter exatamente 19 agentes oficiais no catálogo', () => {
    const agents = commercialAgentV3Registry.listAgents();
    expect(agents).toHaveLength(19);

    const ids = agents.map((a) => a.id);
    for (const expectedId of COMMERCIAL_V3_AGENT_IDS) {
      expect(ids).toContain(expectedId);
    }
  });

  it('deve conter exatamente 463 habilidades únicas no catálogo', () => {
    const skills = commercialAgentV3Registry.listSkills();
    expect(skills).toHaveLength(463);

    const uniqueIds = new Set(skills.map((s) => s.id));
    expect(uniqueIds.size).toBe(463);
  });

  it('cada habilidade deve pertencer a um agente válido e possuir playbook associado', () => {
    const skills = commercialAgentV3Registry.listSkills();
    for (const skill of skills) {
      expect(COMMERCIAL_V3_AGENT_IDS).toContain(skill.agentId);
      expect(skill.playbookId).toBeDefined();
      expect(skill.id).toMatch(/^comercial\.[a-z_]+\.[a-z0-9-]+$/);
    }
  });

  it('deve retornar a lista de habilidades específicas para um agente', () => {
    const supervisorSkills = commercialAgentV3Registry.listSkills('supervisor');
    expect(supervisorSkills).toHaveLength(25);
    expect(supervisorSkills.every((s) => s.agentId === 'supervisor')).toBe(true);

    const sdrSkills = commercialAgentV3Registry.listSkills('sdr');
    expect(sdrSkills).toHaveLength(24);
  });
});

describe('Célula Comercial V3.1 — Context Builder (Montagem Contextual e Bootstrap)', () => {
  it('deve montar contexto injetando Núcleo Compartilhado, Prompt e Índice de Skills', async () => {
    const agentSkills = commercialAgentV3Registry.listSkills('icp');
    const firstSkill = agentSkills[0];

    const result = await commercialContextBuilder.buildContext('icp', [firstSkill.id]);

    expect(result.state.agentId).toBe('icp');
    expect(result.state.indexInjected).toBe(true);
    expect(result.state.schemaReady).toBe(true);
    expect(result.state.loadedPlaybooks.length).toBeGreaterThanOrEqual(1);
    expect(result.state.operationalAllowedByBootstrap).toBe(false);

    expect(result.systemContext).toContain('NÚCLEO COMPARTILHADO — BIRTHUB 360°');
    expect(result.systemContext).toContain('ARQUITETO DE ICP');
    expect(result.systemContext).toContain('ÍNDICE OBRIGATÓRIO DE SKILLS');
    expect(result.systemContext).toContain(firstSkill.id);
  });

  it('deve lançar erro se a habilidade não pertencer ao agente', async () => {
    await expect(
      commercialContextBuilder.buildContext('icp', [
        'comercial.supervisor.entender-linguagem-natural',
      ]),
    ).rejects.toThrow(/SkillId não pertence ao agente/);
  });
});

describe('Célula Comercial V3.1 — Leitura de Playbooks (Living Playbooks)', () => {
  it('deve retornar o conteúdo Markdown e metadados de um Playbook operacional', () => {
    const playbookData = commercialAgentV3Registry.getPlaybookContent('icp', 'P1');
    expect(playbookData).not.toBeNull();
    expect(playbookData?.playbook.id).toBe('P1');
    expect(playbookData?.content).toContain('# P1 —');
    expect(playbookData?.content).toContain('Procedimento operacional');
  });

  it('deve retornar null para playbook inexistente', () => {
    const playbookData = commercialAgentV3Registry.getPlaybookContent('icp', 'P99_INEXISTENTE');
    expect(playbookData).toBeNull();
  });
});

describe('Célula Comercial V3.1 — Orquestrador e Validação de Contrato V3.1', () => {
  it('deve despachar missão em modo consultivo e gerar envelope validado pelo schema Zod', async () => {
    const response = await commercialAgentV3Orchestrator.dispatchMission({
      agentId: 'supervisor',
      mission: 'Encontre oportunidades prioritárias para fechamento neste trimestre.',
      organizationId: 'test-org-123',
    });

    expect(response.schemaVersion).toBe('3.1');
    expect(response.agentId).toBe('supervisor');
    expect(response.status).toBe('COMPLETED');
    expect(response.mode).toBe('CONSULTIVO');
    expect(response.compliance.channel).toBe('NONE');
    expect(response.compliance.sendEligible).toBe(false);
    expect(response.execution.performed).toBe(false);
    expect(response.resumo_humano).toBeDefined();
    expect(response.resumo_humano.length).toBeLessThanOrEqual(600);
    expect(response.artifacts).toHaveLength(1);
    expect(response.artifacts[0].state).toBe('DRAFT_NOT_SENT');

    const parseResult = commercialAgentResultV3Schema.safeParse(response);
    expect(parseResult.success).toBe(true);
  });

  it('deve rejeitar envelope com sendEligible=true se houver sinais UNKNOWN', () => {
    const invalidEnvelope = {
      schemaVersion: '3.1',
      agentId: 'outbound',
      missionId: 'm-1',
      correlationId: 'c-1',
      status: 'COMPLETED',
      mode: 'OPERACIONAL',
      skillIds: ['comercial.outbound.executar-cadencia'],
      summary: 'Envio hipotético',
      resumo_humano: 'Teste de segurança',
      artifacts: [],
      evidence: [],
      hypotheses: [],
      missingData: [],
      compliance: {
        channel: 'WHATSAPP',
        sendEligible: true,
        reason: 'Tentativa não autorizada',
        checks: [],
        signals: {
          whatsappOptIn: 'UNKNOWN',
          optOutSuppression: 'UNKNOWN',
          touchHistory: 'UNKNOWN',
          businessHours: 'UNKNOWN',
          timezone: null,
        },
      },
      approvalPending: {
        required: false,
        status: 'NOT_REQUIRED',
        action: null,
        approverRole: null,
        requestId: null,
        reason: '',
      },
      handoffs: [],
      execution: {
        actionType: 'NONE',
        performed: false,
        state: 'NONE',
        executionId: null,
        idempotencyKey: null,
        toolCalls: [],
      },
      metrics: {},
      nextStep: 'Finalizado',
    };

    const parseResult = commercialAgentResultV3Schema.safeParse(invalidEnvelope);
    expect(parseResult.success).toBe(false);
  });
});

describe('Célula Comercial V3.1 — Avaliador de Golden Redteam', () => {
  it('deve carregar os 19 suites de redteam com seus cenários', () => {
    const suites = commercialRedteamEvaluator.loadGoldenSets();
    expect(suites).toHaveLength(19);

    const totalCases = suites.reduce((acc, s) => acc + s.cases.length, 0);
    expect(totalCases).toBe(209);
  });

  it('deve avaliar os cenários de redteam do supervisor mantendo modo consultivo seguro', async () => {
    const report = await commercialRedteamEvaluator.evaluateAgent('supervisor');
    expect(report.agentId).toBe('supervisor');
    expect(report.total).toBe(11);
    expect(report.passed).toBe(11);
    expect(report.rate).toBe(100);
  });
});
