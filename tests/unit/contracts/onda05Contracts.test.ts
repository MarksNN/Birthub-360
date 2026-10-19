import { describe, expect, it } from 'vitest';
import type {
  BuyerPersona,
  MultimodalRoleplaySession,
  RoleplayEvaluationScore,
  SalesMethodologyFramework,
} from '../../../src/shared/contracts/multimodalRoleplay.contract.js';
import type {
  AccountAllocationRecommendation,
  BacktestValidationMetrics,
  ProjectedRevenueHorizon,
  WhatIfSimulationInput,
  WhatIfSimulationResult,
} from '../../../src/shared/contracts/predictiveRevenueOracle.contract.ts';
import type {
  FailoverEvent,
  RegionTelemetry,
} from '../../../src/shared/contracts/multiRegionResilience.contract.js';
import type {
  SbomManifestSummary,
  SecuritySweepReport,
  SecurityVulnerability,
} from '../../../src/shared/contracts/continuousSecurityAudit.contract.js';
import type { DomainEventType } from '../../../src/shared/contracts/domainEventMesh.contract.js';

describe('Onda 05 — Validação de Contratos Canônicos', () => {
  it('Evolução 17: Multimodal Roleplay — deve validar tipagem de persona, frameworks e avaliação objetiva', () => {
    const persona: BuyerPersona = {
      id: 'persona-cfo-01',
      name: 'Roberto Valente',
      title: 'Diretor Financeiro (CFO)',
      archetype: 'cfo_skeptical',
      companySize: 'Enterprise (500+ funcionários)',
      primaryPainPoint: 'Falta de previsibilidade nos custos operacionais de frota',
      hiddenObjection: 'Incerteza sobre o prazo real de retorno do investimento (ROI)',
      decisionCriteria: ['Payback comprovado < 6 meses', 'Contrato com SLA de 99.9%'],
    };

    const evaluation: RoleplayEvaluationScore = {
      framework: 'SPIN',
      needDiscoveryScore: 90,
      activeListeningScore: 85,
      objectionHandlingScore: 88,
      valueArticulationScore: 92,
      nextStepAlignmentScore: 95,
      compositeScore: 90,
      talkListenRatio: 0.42, // Vendedor falou 42% do tempo (excelente escuta ativa)
      awardedXp: 180,
      feedbackSummary: 'Excelente condução com foco em perguntas de implicação e confirmação de próximo passo.',
      actionableTips: ['Aprofundar na ancoragem de custos ocultos antes de revelar o valor total.'],
    };

    const session: MultimodalRoleplaySession = {
      sessionId: 'sess-roleplay-123',
      organizationId: 'org-tenant-01',
      sellerId: 'user-seller-lucas',
      persona,
      framework: 'SPIN',
      status: 'completed',
      turns: [
        {
          turnNumber: 1,
          speaker: 'buyer',
          content: 'Qual o valor total do software e como isso justifica o gasto agora?',
          timestamp: new Date().toISOString(),
          detectedObjection: 'Preço / Timing',
          talkDurationSeconds: 8,
        },
        {
          turnNumber: 2,
          speaker: 'seller',
          content: 'Antes de falarmos sobre preços, quanto custa hoje para a sua operação cada caminhão parado por falta de telemetria?',
          timestamp: new Date().toISOString(),
          methodologyTechniqueUsed: 'SPIN_IMPLICATION_QUESTION',
          talkDurationSeconds: 12,
        },
      ],
      evaluation,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    expect(session.sessionId).toBe('sess-roleplay-123');
    expect(session.persona.archetype).toBe('cfo_skeptical');
    expect(session.evaluation?.compositeScore).toBe(90);
    expect(session.evaluation?.talkListenRatio).toBeLessThan(0.5);
  });

  it('Evolução 18: Predictive Revenue Oracle — deve validar horizontes de projeção, simulação What-If e backtest', () => {
    const horizon: ProjectedRevenueHorizon = {
      horizonDays: 90,
      expectedRevenue: 350000,
      confidenceInterval: {
        p10: 290000,
        p50: 350000,
        p90: 420000,
      },
      pipelineWeightedAmount: 480000,
      projectedWonDealsCount: 12,
      keyDrivers: ['Propostas quentes no setor logístico', 'Alta aderência ao playbook'],
      uncertaintyDegree: 'LOW',
    };

    const whatIfInput: WhatIfSimulationInput = {
      organizationId: 'org-tenant-01',
      name: 'Expansão de Prospecção Outbound Q4',
      horizonDays: 90,
      prospectingVolumeDeltaPercent: 20,
      avgTicketDeltaPercent: 10,
    };

    const whatIfResult: WhatIfSimulationResult = {
      simulationId: 'sim-whatif-01',
      organizationId: 'org-tenant-01',
      name: whatIfInput.name,
      baselineRevenue: 350000,
      simulatedRevenue: 435000,
      netRevenueDelta: 85000,
      deltaPercent: 24.28,
      impactBreakdown: {
        prospectingImpact: 55000,
        conversionImpact: 0,
        cycleImpact: 0,
        ticketImpact: 30000,
        capacityImpact: 0,
      },
      simulatedAt: new Date().toISOString(),
    };

    const backtest: BacktestValidationMetrics = {
      evaluationPeriod: '2026-Q3',
      samplesEvaluated: 140,
      meanAbsoluteError: 12400,
      meanAbsolutePercentageError: 6.8,
      predictionBias: 0.02,
      calibrationScore: 0.94,
      predictionIntervalCoveragePercent: 92.5,
      isModelCalibrated: true,
      status: 'CALIBRATED',
    };

    expect(horizon.confidenceInterval.p10).toBeLessThan(horizon.confidenceInterval.p50);
    expect(horizon.confidenceInterval.p50).toBeLessThan(horizon.confidenceInterval.p90);
    expect(whatIfResult.netRevenueDelta).toBe(85000);
    expect(backtest.isModelCalibrated).toBe(true);
    expect(backtest.meanAbsolutePercentageError).toBeLessThan(10);
  });

  it('Evolução 19: Multi-Region Resilience — deve validar telemetria regional e contrato de failover de tráfego', () => {
    const telemetrySaoPaulo: RegionTelemetry = {
      region: 'sa-east-1',
      status: 'healthy',
      latencyMs: 38,
      errorRatePercent: 0.01,
      activeWorkersCount: 16,
      cacheHitRatio: 0.96,
      lastHealthCheckIso: new Date().toISOString(),
    };

    const failover: FailoverEvent = {
      failoverId: 'failover-ev-001',
      organizationId: 'org-tenant-01',
      fromRegion: 'sa-east-1',
      toRegion: 'us-east-1',
      reason: 'Degradação temporária de rota submarina em sa-east-1',
      initiatedAt: new Date().toISOString(),
      reroutedTrafficPercent: 100,
      statePreserved: true,
      status: 'completed',
    };

    expect(telemetrySaoPaulo.region).toBe('sa-east-1');
    expect(telemetrySaoPaulo.status).toBe('healthy');
    expect(failover.fromRegion).toBe('sa-east-1');
    expect(failover.toRegion).toBe('us-east-1');
    expect(failover.statePreserved).toBe(true);
  });

  it('Evolução 20: Continuous Security Audit — deve validar estrutura de SBOM CycloneDX e relatório de vulnerabilidades', () => {
    const vulnerability: SecurityVulnerability = {
      cveId: 'CVE-2026-9999',
      packageName: 'sample-crypto-lib',
      affectedVersionRange: '< 2.1.0',
      severity: 'HIGH',
      fixedInVersion: '2.1.0',
      description: 'Potencial buffer parsing anomaly',
      waiverReference: 'WAIVER-2026-10-A',
    };

    const sbom: SbomManifestSummary = {
      format: 'CycloneDX_JSON',
      specVersion: '1.5',
      totalComponents: 420,
      sha256Digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      isReproducible: true,
      generatedAt: new Date().toISOString(),
    };

    const sweep: SecuritySweepReport = {
      sweepId: 'sweep-audit-20261018',
      executedAt: new Date().toISOString(),
      durationMs: 1450,
      totalDependenciesScanned: 420,
      vulnerabilitiesFound: [vulnerability],
      criticalCount: 0,
      highCount: 1,
      activeWaiversCount: 1,
      sbomSummary: sbom,
      complianceRating: 'WARN_WAIVED',
    };

    expect(sweep.totalDependenciesScanned).toBe(420);
    expect(sweep.criticalCount).toBe(0);
    expect(sweep.sbomSummary.isReproducible).toBe(true);
    expect(sweep.complianceRating).toBe('WARN_WAIVED');
  });

  it('Domain Event Mesh — deve validar inclusão dos novos tipos de eventos da Onda 05', () => {
    const events: DomainEventType[] = [
      'MULTIMODAL_ROLEPLAY_EVALUATED',
      'MULTI_REGION_FAILOVER_TRIGGERED',
      'SECURITY_AUDIT_SWEEP_COMPLETED',
    ];

    expect(events).toContain('MULTIMODAL_ROLEPLAY_EVALUATED');
    expect(events).toContain('MULTI_REGION_FAILOVER_TRIGGERED');
    expect(events).toContain('SECURITY_AUDIT_SWEEP_COMPLETED');
  });
});
