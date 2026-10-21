import { describe, expect, it, beforeEach } from 'vitest';
import { rebalanceRecommendationId } from '../../src/features/commercial-intelligence/services/rebalanceRecommendation.service.js';
import { multimodalRoleplaySimulatorService } from '../../src/features/roleplay/services/multimodalRoleplaySimulator.service.js';
import {
  PredictiveRevenueOracleService,
  predictiveRevenueOracleService,
} from '../../src/features/commercial-intelligence/services/predictiveRevenueOracle.service.js';
import { RebalanceApprovalService } from '../../src/features/commercial-intelligence/services/rebalanceApproval.service.js';
import {
  InMemoryOracleReader,
  InMemoryRebalanceApprovalStore,
  ORACLE_FIXED_NOW,
  seedRealHistory,
} from '../unit/commercial-intelligence/oracleTestDoubles.js';
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
    // REMED-03/04: histórico real por tenant (reader em memória) + aprovação persistida.
    const oracleReader = new InMemoryOracleReader();
    seedRealHistory(oracleReader, tenantA);
    const oracle = new PredictiveRevenueOracleService({ reader: oracleReader, now: () => ORACLE_FIXED_NOW });
    const cockpit = await oracle.getCockpitData(tenantA);
    expect(cockpit.projections.days30.expectedRevenue).toBeGreaterThan(0);
    expect(cockpit.projections.days90.confidenceInterval?.p10).toBeLessThan(
      cockpit.projections.days90.confidenceInterval?.p90 ?? 0,
    );

    const whatIf = await oracle.runWhatIfSimulation({
      organizationId: tenantA,
      name: 'Simulação Expansão Estratégica 2027',
      horizonDays: 90,
      prospectingVolumeDeltaPercent: 20,
      avgTicketDeltaPercent: 10,
    });
    expect(whatIf.simulatedRevenue).toBeGreaterThan(whatIf.baselineRevenue ?? Infinity);
    expect(whatIf.netRevenueDelta).toBeGreaterThan(0);
    expect(whatIf.impactBreakdown?.prospectingImpact).toBeGreaterThan(0);

    // Backtest real a partir de ForecastSnapshot
    const backtest = await oracle.getBacktestMetrics(tenantA);
    expect(backtest.isModelCalibrated).toBe(true);
    expect(backtest.meanAbsolutePercentageError).toBeLessThan(15);
    expect((await oracle.getBacktestMetrics(tenantB)).status).toBe('INSUFFICIENT_DATA');

    // Aprovação de rebalanceamento persistida/auditada (sem recomendação inventada)
    const approvalStore = new InMemoryRebalanceApprovalStore();
    approvalStore.addLead(tenantA, 'lead-alpha-1', 'seller-ocupado');
    approvalStore.addUser(tenantA, 'seller-lucas-01');
    const approvals = new RebalanceApprovalService({ store: approvalStore });
    const approvedAllocation = await approvals.decide({
      organizationId: tenantA,
      decidedBy: 'diretor-comercial',
      input: {
        recommendationId: rebalanceRecommendationId(tenantA, 'lead-alpha-1', 'seller-ocupado', 'seller-lucas-01'),
        leadId: 'lead-alpha-1',
        fromOwner: 'seller-ocupado',
        toOwner: 'seller-lucas-01',
        decision: 'APPROVED',
      },
    });
    expect(approvedAllocation.approval.decision).toBe('APPROVED');

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
