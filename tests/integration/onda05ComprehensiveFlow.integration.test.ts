import { describe, expect, it, beforeEach } from 'vitest';
import { multimodalRoleplaySimulatorService } from '../../src/features/roleplay/services/multimodalRoleplaySimulator.service.js';
import { predictiveRevenueOracleService } from '../../src/features/commercial-intelligence/services/predictiveRevenueOracle.service.js';
import { multiRegionResilienceService } from '../../src/lib/runtime/services/multiRegionResilience.service.js';
import { continuousSecurityAuditService } from '../../src/lib/security/services/continuousSecurityAudit.service.js';

describe('Onda 05 — Teste Integrado E2E: Escala, Governança e Resiliência', () => {
  const tenantA = 'org-enterprise-logistica-alpha';
  const tenantB = 'org-concorrente-varejo-beta';
  const sellerLucas = 'seller-lucas-01';

  beforeEach(() => {
    multimodalRoleplaySimulatorService.clear();
    predictiveRevenueOracleService.clear();
    multiRegionResilienceService.clear();
    continuousSecurityAuditService.clear();
  });

  it('deve executar o fluxo integrado da Onda 05 de ponta a ponta com rigor multi-tenant', async () => {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Evolução 17: Roleplay Multimodal com Persona B2B e Framework SPIN
    // ─────────────────────────────────────────────────────────────────────────
    const roleplaySession = await multimodalRoleplaySimulatorService.startSession({
      organizationId: tenantA,
      sellerId: sellerLucas,
      framework: 'SPIN',
      personaArchetype: 'cfo_skeptical',
    });

    expect(roleplaySession.sessionId).toBeDefined();
    expect(roleplaySession.persona.archetype).toBe('cfo_skeptical');

    // Turno 1: Vendedor explora o custo da inação (SPIN Implication Question)
    const turn1 = await multimodalRoleplaySimulatorService.submitTurn({
      organizationId: tenantA,
      sessionId: roleplaySession.sessionId,
      sellerMessage: 'Qual o custo mensal que sua operação absorve hoje devido a atrasos em manutenções preventivas?',
      talkDurationSeconds: 11,
    });
    expect(turn1.buyerReply).toContain('desperdício direto');

    // Turno 2: Vendedor propõe próximo passo objetivo
    const turn2 = await multimodalRoleplaySimulatorService.submitTurn({
      organizationId: tenantA,
      sessionId: roleplaySession.sessionId,
      sellerMessage: 'Podemos agendar a apresentação do cálculo detalhado de ROI na próxima quinta-feira às 14h?',
      talkDurationSeconds: 7,
    });
    expect(turn2.buyerReply).toContain('quinta-feira');

    // Avaliação pedagógica da sessão
    const roleplayEval = await multimodalRoleplaySimulatorService.evaluateSession({
      organizationId: tenantA,
      sessionId: roleplaySession.sessionId,
    });

    expect(roleplayEval.compositeScore).toBeGreaterThanOrEqual(80);
    expect(roleplayEval.awardedXp).toBe(200);
    expect(roleplayEval.talkListenRatio).toBeLessThan(0.6); // Escuta ativa comprovada

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Evolução 18: Forecast Preditivo, Simulação What-If e Rebalanceamento
    // ─────────────────────────────────────────────────────────────────────────
    const cockpit = await predictiveRevenueOracleService.getCockpitData(tenantA);
    expect(cockpit.projections.days30.expectedRevenue).toBeGreaterThan(0);
    expect(cockpit.projections.days90.confidenceInterval.p10).toBeLessThan(
      cockpit.projections.days90.confidenceInterval.p90,
    );

    // Simulação What-If: Aumento de 20% no volume de prospecção e 10% no ticket médio
    const whatIf = await predictiveRevenueOracleService.runWhatIfSimulation({
      organizationId: tenantA,
      name: 'Simulação Expansão Estratégica 2027',
      horizonDays: 90,
      prospectingVolumeDeltaPercent: 20,
      avgTicketDeltaPercent: 10,
    });

    expect(whatIf.simulatedRevenue).toBeGreaterThan(whatIf.baselineRevenue);
    expect(whatIf.netRevenueDelta).toBeGreaterThan(0);
    expect(whatIf.impactBreakdown.prospectingImpact).toBeGreaterThan(0);

    // Verificação de calibração via Backtest
    const backtest = await predictiveRevenueOracleService.getBacktestMetrics(tenantA);
    expect(backtest.isModelCalibrated).toBe(true);
    expect(backtest.meanAbsolutePercentageError).toBeLessThan(15);

    // Geração e aprovação de recomendação de realocação de carteira
    const allocations = await predictiveRevenueOracleService.generateAccountAllocationRecommendations({
      organizationId: tenantA,
      accounts: [
        {
          accountId: 'acc-quente-01',
          accountName: 'Transportes Brasil S.A.',
          currentOwnerId: 'seller-ocupado',
          currentOwnerName: 'Rodrigo',
          currentOwnerWorkload: 14,
          industry: 'Logística',
          estimatedPotential: 80000,
        },
      ],
      sellers: [
        {
          sellerId: 'seller-lucas-01',
          sellerName: 'Lucas Especialista',
          activeDealsCount: 4,
          maxCapacity: 10,
          specialtyIndustries: ['Logística', 'Agronegócio'],
          winRateInIndustry: 0.38,
        },
      ],
    });

    expect(allocations.length).toBeGreaterThanOrEqual(1);
    expect(allocations[0].suggestedOwnerName).toBeDefined();

    const approvedAllocation = await predictiveRevenueOracleService.approveAccountAllocation({
      organizationId: tenantA,
      recommendationId: allocations[0].recommendationId,
      approvedBy: 'diretor-comercial',
    });

    expect(approvedAllocation.executedAllocation.approvalStatus).toBe('APPROVED');

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Evolução 19: Arquitetura Multi-Região e Failover de Workers
    // ─────────────────────────────────────────────────────────────────────────
    const saEastHealth = await multiRegionResilienceService.getRegionHealth('sa-east-1');
    expect(saEastHealth.status).toBe('healthy');

    // Executa failover controlado de tráfego de sa-east-1 para us-east-1
    const failoverResult = await multiRegionResilienceService.triggerFailover({
      fromRegion: 'sa-east-1',
      toRegion: 'us-east-1',
      reason: 'Instabilidade de conectividade internacional detectada',
      organizationId: tenantA,
    });

    expect(failoverResult.status).toBe('completed');
    expect(failoverResult.statePreserved).toBe(true);
    expect(failoverResult.durationMs).toBeLessThan(500);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Evolução 20: Governança Contínua de Segurança e Integridade do SBOM
    // ─────────────────────────────────────────────────────────────────────────
    const securitySweep = await continuousSecurityAuditService.runSecuritySweep();
    expect(securitySweep.sweepId).toBeDefined();
    expect(securitySweep.criticalCount).toBe(0);
    expect(['PASS', 'WARN_WAIVED']).toContain(securitySweep.complianceRating);

    // Verificação da assinatura do SBOM CycloneDX
    const sbomIntegrity = await continuousSecurityAuditService.validateSbomIntegrity(
      securitySweep.sbomSummary.sha256Digest,
    );
    expect(sbomIntegrity.valid).toBe(true);
    expect(sbomIntegrity.componentCount).toBeGreaterThan(400);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Isolamento Multi-Tenant Estrito (Tenant A vs Tenant B)
    // ─────────────────────────────────────────────────────────────────────────
    // Tenant B não deve acessar a sessão de roleplay do Tenant A
    const tenantBProbe = await multimodalRoleplaySimulatorService.getSession(
      tenantB,
      roleplaySession.sessionId,
    );
    expect(tenantBProbe).toBeNull();

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Eixo 13: Inteligência Conversacional, Talk-to-Listen e Coaching
    // ─────────────────────────────────────────────────────────────────────────
    const { conversationalIntelligenceService } = await import(
      '../../src/features/ai-voice/server/conversationalIntelligence.service.js'
    );
    const coachingReport = await conversationalIntelligenceService.generatePostCallReport({
      organizationId: tenantA,
      callId: 'call-e2e-onda05',
      sellerId: sellerLucas,
      callGoal: 'Qualificação de Oportunidade e Alinhamento Técnico',
      turns: [
        {
          turnId: 't-1',
          speaker: 'seller',
          startTimeSeconds: 0,
          endTimeSeconds: 30,
          durationSeconds: 30,
          text: 'Como vocês estruturam hoje o controle de SLA de entrega?',
        },
        {
          turnId: 't-2',
          speaker: 'customer',
          startTimeSeconds: 32,
          endTimeSeconds: 62,
          durationSeconds: 30,
          text: 'Hoje enfrentamos problemas de visibilidade e o custo atual é bem puxado.',
        },
        {
          turnId: 't-3',
          speaker: 'seller',
          startTimeSeconds: 63,
          endTimeSeconds: 90,
          durationSeconds: 27,
          text: 'Podemos agendar a demonstração na próxima quinta-feira às 15h?',
        },
      ],
      expectedFramework: 'SPIN',
    });

    expect(coachingReport.reportId).toBe('coaching-call-e2e-onda05');
    expect(coachingReport.dynamics.sellerTalkRatio).toBeCloseTo(0.66, 1);
    expect(coachingReport.commitments.length).toBeGreaterThan(0);
    expect(coachingReport.objections.some((o) => o.category === 'price')).toBe(true);

    // Multi-tenant check no relatório de coaching
    const tenantBAccessCoaching = conversationalIntelligenceService.getReport(
      coachingReport.reportId,
      tenantB,
    );
    expect(tenantBAccessCoaching).toBeNull();

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Eixo 18: Bem-Estar Operacional, Gestão de Carga e Microtreinamento
    // ─────────────────────────────────────────────────────────────────────────
    const { workloadWellbeingService } = await import(
      '../../src/features/calendar/services/workloadWellbeing.service.js'
    );
    const metrics = workloadWellbeingService.calculateDailyWorkloadMetrics(
      tenantA,
      sellerLucas,
      '2026-10-19',
      [
        {
          id: 'm1',
          title: 'Reunião A',
          startTime: '2026-10-19T10:00:00Z',
          endTime: '2026-10-19T11:00:00Z',
          isCommercialMeeting: true,
        },
        {
          id: 'm2',
          title: 'Reunião B',
          startTime: '2026-10-19T11:00:00Z',
          endTime: '2026-10-19T12:00:00Z',
          isCommercialMeeting: true,
        },
      ],
    );

    const recs = workloadWellbeingService.generateRecommendations(
      tenantA,
      sellerLucas,
      metrics,
      {
        id: 'm3',
        title: 'Demo Importante',
        startTime: '2026-10-19T14:00:00Z',
        endTime: '2026-10-19T15:00:00Z',
        isCommercialMeeting: true,
      },
    );

    expect(recs.some((r) => r.type === 'SUGGEST_BREAK')).toBe(true);
    expect(recs.some((r) => r.type === 'PRE_MEETING_PREPARATION')).toBe(true);

    // Inicia microtreinamento voluntário de 3 minutos
    const microTraining = workloadWellbeingService.createMicroTrainingSession(
      tenantA,
      sellerLucas,
      'PRICE_OBJECTION_REHEARSAL',
    );
    expect(microTraining.targetDurationMinutes).toBe(3);
    const completedTraining = workloadWellbeingService.completeMicroTraining(
      microTraining.trainingId,
      tenantA,
      5,
    );
    expect(completedTraining.isCompleted).toBe(true);
  });
});
