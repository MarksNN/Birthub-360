import { describe, expect, it } from 'vitest';
import {
  detectSubSwarm,
  getAllCatalogAgents,
  getSubSwarmCapabilities,
  getSubSwarmSpecialists,
  mapDomainToSubSwarm,
  matchCatalogAgents,
  SUB_SWARMS,
  semanticRouteMission,
} from '../subSwarms.config.js';
import { SWARM_CATALOG_TOTAL_AGENTS } from '../swarm.constants.js';

describe('Sub-Swarms Hierárquicos — Configuração e Classificação Semântica', () => {
  it('classifica corretamente missões de Customer Success / Churn', () => {
    expect(
      detectSubSwarm('Identificar contas com alto risco de churn e propor plano de retenção'),
    ).toBe('customer_success');
    expect(
      detectSubSwarm('Avaliar queda no health score e risco de cancelamento da Empresa Alpha'),
    ).toBe('customer_success');
  });

  it('classifica corretamente missões de Marketing / Outbound Copy', () => {
    expect(
      detectSubSwarm('Gerar rascunho de email de primeiro contato para o diretor de TI da clínica'),
    ).toBe('marketing');
    expect(
      detectSubSwarm('Redigir mensagem personalizada de WhatsApp para campanha de prospecção fria'),
    ).toBe('marketing');
    expect(detectSubSwarm('Criar copy de abordagem consultiva para o segmento de Logística')).toBe(
      'marketing',
    );
  });

  it('classifica corretamente missões de Operações Multi-Plataforma', () => {
    expect(detectSubSwarm('Criar tarefa no CRM e sincronizar Trello com o resumo da call')).toBe(
      'operations',
    );
    expect(
      detectSubSwarm('Disparar notificação via push no celular do executivo sobre o fechamento'),
    ).toBe('operations');
  });

  it('classifica missões gerais como Comercial por padrão', () => {
    expect(detectSubSwarm('Qualificar o lead e agendar reunião comercial de demonstração')).toBe(
      'commercial',
    );
    expect(detectSubSwarm('Analisar o forecast e conduzir a negociação da proposta anual')).toBe(
      'commercial',
    );
    expect(detectSubSwarm('')).toBe('commercial');
  });

  it('retorna especialistas primários coerentes para cada Sub-Swarm', () => {
    const csAgents = getSubSwarmSpecialists('customer_success');
    expect(csAgents).toContain('crm');
    expect(csAgents).toContain('ops');

    const mktAgents = getSubSwarmSpecialists('marketing');
    expect(mktAgents).toContain('bdr');
    expect(mktAgents).toContain('sdr');

    const commAgents = getSubSwarmSpecialists('commercial');
    expect(commAgents).toContain('closer');
    expect(commAgents).toContain('sdr');
  });

  it('retorna capabilities associadas a cada Sub-Swarm', () => {
    const mktCaps = getSubSwarmCapabilities('marketing');
    expect(mktCaps).toContain('copy.draft');
    expect(mktCaps).toContain('lead.enrich');

    const csCaps = getSubSwarmCapabilities('customer_success');
    expect(csCaps).toContain('churn.analyze');
    expect(csCaps).toContain('deal.read');
  });

  it('possui os 4 domínios requeridos no catálogo oficial', () => {
    expect(Object.keys(SUB_SWARMS)).toEqual([
      'commercial',
      'marketing',
      'customer_success',
      'operations',
    ]);
  });
});

describe('Integração com o Catálogo Oficial de 379 Agentes', () => {
  it('carrega exatamente os 379 agentes canônicos do catálogo', () => {
    const agents = getAllCatalogAgents();
    expect(agents.length).toBe(SWARM_CATALOG_TOTAL_AGENTS);
    expect(agents.length).toBe(379);

    // Verifica integridade dos campos obrigatórios
    const sample = agents[0];
    expect(sample).toHaveProperty('code');
    expect(sample).toHaveProperty('name');
    expect(sample).toHaveProperty('domain');
    expect(sample).toHaveProperty('description');
  });

  it('mapeia domínios do catálogo para os Sub-Swarms correspondentes', () => {
    expect(mapDomainToSubSwarm('Marketing')).toBe('marketing');
    expect(mapDomainToSubSwarm('Customer Success')).toBe('customer_success');
    expect(mapDomainToSubSwarm('Vendas')).toBe('commercial');
    expect(mapDomainToSubSwarm('Executivo')).toBe('commercial');
    expect(mapDomainToSubSwarm('Operações')).toBe('operations');
    expect(mapDomainToSubSwarm('Financeiro')).toBe('operations');
    expect(mapDomainToSubSwarm('Compliance/Jurídico')).toBe('operations');
  });

  it('executa roteamento semântico dinâmico selecionando especialistas adequados do catálogo', () => {
    const mktMatches = matchCatalogAgents(
      'Estruturar testes A/B de marketing para landing page e calcular taxa de conversão',
      'marketing',
      { topK: 3 },
    );

    expect(mktMatches.length).toBeGreaterThanOrEqual(1);
    expect(mktMatches[0].subSwarm).toBe('marketing');
    expect(mktMatches[0].similarityScore).toBeGreaterThan(0.2);
    // Deve encontrar agente relacionado a teste A/B
    const foundAbTest = mktMatches.some(
      (m) => m.code.includes('ab-test') || m.name.includes('ABTest'),
    );
    expect(foundAbTest).toBe(true);
  });

  it('gera plano de roteamento semântico completo com recomendação e justificativa', () => {
    const plan = semanticRouteMission(
      'Analisar contas estagnadas com alto risco de churn e traçar estratégia de retenção',
    );

    expect(plan.subSwarm).toBe('customer_success');
    expect(plan.primarySpecialists).toContain('crm');
    expect(plan.catalogSpecialists.length).toBeGreaterThan(0);
    expect(plan.reasoning).toContain('Sub-Swarm');
  });
});
