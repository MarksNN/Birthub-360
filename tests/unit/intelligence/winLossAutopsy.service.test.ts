import { describe, expect, it } from 'vitest';
import { WinLossAutopsyService } from '../../../src/features/intelligence/services/winLossAutopsy.service.js';
import { InMemoryWinLossAutopsyRepository } from '../../../src/features/intelligence/infra/winLossAutopsyRepository.js';

describe('WinLossAutopsyService — Eixo 19 (Win-Loss Deep Autopsy)', () => {
  const service = new WinLossAutopsyService(new InMemoryWinLossAutopsyRepository());
  const orgId = 'org-winloss-autopsy-001';

  it('deve realizar autópsia forense de DEAL_LOST gerando as 9 seções estruturadas', async () => {
    const report = await service.performAutopsy({
      organizationId: orgId,
      dealId: 'deal-lost-101',
      dealTitle: 'Frota 50 Caminhões - TransPaulista',
      companyName: 'TransPaulista Cargas',
      dealValue: 120000,
      salesCycleDays: 45,
      outcome: 'DEAL_LOST',
      closedAt: new Date().toISOString(),
      stageHistory: [
        { stageName: 'Prospecção', enteredAt: '2026-09-01T10:00:00Z', durationDays: 5 },
        { stageName: 'Demonstração', enteredAt: '2026-09-06T10:00:00Z', durationDays: 10 },
        { stageName: 'Proposta Enviada', enteredAt: '2026-09-16T10:00:00Z', durationDays: 30 },
      ],
      activities: [
        { type: 'call', date: '2026-09-02', notes: 'Contato inicial positivo' },
        { type: 'demo', date: '2026-09-10', notes: 'Demonstração de telemetria' },
      ],
      messagesAndNotes: [
        {
          source: 'email',
          date: '2026-09-20',
          text: 'Recebemos a proposta, mas achamos o valor de implantação muito caro.',
        },
      ],
      unresolvedObjections: ['Preço de implantação muito alto'],
      competitorsMentioned: ['Concorrente X'],
    });

    expect(report.id).toBeDefined();
    expect(report.outcome).toBe('DEAL_LOST');

    // Validar as 9 seções da autópsia forense
    expect(report.sectionA_Timeline.length).toBeGreaterThan(0);
    expect(report.sectionB_PositiveSignals.length).toBeGreaterThan(0);
    expect(report.sectionC_NegativeSignalsAndObjections.length).toBeGreaterThan(0);
    expect(report.sectionD_FactorHypotheses.length).toBeGreaterThan(0);
    expect(report.sectionD_FactorHypotheses[0].confidenceScore).toBeLessThanOrEqual(1.0);
    expect(report.sectionE_AuditableEvidences.length).toBeGreaterThan(0);
    expect(report.sectionF_InformationGaps.length).toBeGreaterThanOrEqual(0);
    expect(report.sectionG_ProcessRecommendations.length).toBeGreaterThan(0);
    expect(report.sectionH_CuratedLearningCandidates.length).toBeGreaterThan(0);
    expect(report.sectionI_ActionItems.length).toBeGreaterThan(0);
  });

  it('deve realizar autópsia forense de DEAL_WON identificando estratégias vencedoras', async () => {
    const report = await service.performAutopsy({
      organizationId: orgId,
      dealId: 'deal-won-202',
      dealTitle: 'Telemetria e Gestão de Risco - Sul Brasil',
      companyName: 'Sul Brasil Transportes',
      dealValue: 250000,
      salesCycleDays: 32,
      outcome: 'DEAL_WON',
      closedAt: new Date().toISOString(),
      stageHistory: [
        { stageName: 'Prospecção', enteredAt: '2026-09-15T10:00:00Z', durationDays: 4 },
        { stageName: 'Proposta', enteredAt: '2026-09-19T10:00:00Z', durationDays: 12 },
        { stageName: 'Negociação', enteredAt: '2026-10-01T10:00:00Z', durationDays: 16 },
      ],
      activities: [
        {
          type: 'meeting',
          date: '2026-09-22',
          notes: 'Reunião de alinhamento técnico com diretor de TI',
        },
      ],
      messagesAndNotes: [
        {
          source: 'whatsapp',
          date: '2026-10-10',
          text: 'Fechado! O diferencial foi a conformidade LGPD e tokenização.',
        },
      ],
    });

    expect(report.outcome).toBe('DEAL_WON');
    expect(report.sectionB_PositiveSignals.length).toBeGreaterThan(0);
    expect(report.sectionH_CuratedLearningCandidates.length).toBeGreaterThan(0);
  });

  it('deve promover aprendizado da autópsia para o Playbook mediante aprovação de gestor', async () => {
    const report = await service.performAutopsy({
      organizationId: orgId,
      dealId: 'deal-lost-303',
      dealTitle: 'Contrato Frigorífico - Boi Gordo Cargas',
      companyName: 'Boi Gordo Cargas',
      dealValue: 90000,
      salesCycleDays: 60,
      outcome: 'DEAL_LOST',
      closedAt: new Date().toISOString(),
      stageHistory: [
        { stageName: 'Proposta', enteredAt: '2026-08-01T10:00:00Z', durationDays: 60 },
      ],
      activities: [],
      messagesAndNotes: [],
      unresolvedObjections: ['Preço 40% superior ao concorrente local'],
    });

    const result = await service.promoteLearningToPlaybook({
      organizationId: orgId,
      reportId: report.id,
      candidateIndex: 0,
      reviewedBy: 'Gestor Comercial Carlos',
    });

    expect(result.promoted).toBe(true);
    expect(result.playbookEntryId).toBeDefined();
  });
});
