import { describe, expect, it } from 'vitest';
import {
  detectSubSwarm,
  getSubSwarmCapabilities,
  getSubSwarmSpecialists,
  SUB_SWARMS,
} from '../subSwarms.config.js';

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
    expect(
      detectSubSwarm('Criar copy de abordagem consultiva para o segmento de Logística'),
    ).toBe('marketing');
  });

  it('classifica corretamente missões de Operações Multi-Plataforma', () => {
    expect(
      detectSubSwarm('Criar tarefa no CRM e sincronizar Trello com o resumo da call'),
    ).toBe('operations');
    expect(
      detectSubSwarm('Disparar notificação via push no celular do executivo sobre o fechamento'),
    ).toBe('operations');
  });

  it('classifica missões gerais como Comercial por padrão', () => {
    expect(
      detectSubSwarm('Qualificar o lead e agendar reunião comercial de demonstração'),
    ).toBe('commercial');
    expect(
      detectSubSwarm('Analisar o forecast e conduzir a negociação da proposta anual'),
    ).toBe('commercial');
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
