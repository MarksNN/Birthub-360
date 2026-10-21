import { beforeEach, describe, expect, it } from 'vitest';
import { rebalanceRecommendationId } from '../../src/features/commercial-intelligence/services/rebalanceRecommendation.service.js';
import { behavioralEngineService } from '../../src/features/gamification/services/behavioralEngine.service.js';
import { selfDrivingCrmService } from '../../src/features/cadence/services/selfDrivingCrm.service.js';
import { roiSimulatorService } from '../../src/features/commercial-intelligence/services/roiSimulator.service.js';
import { valueRealizationService } from '../../src/features/commercial-intelligence/services/valueRealization.service.js';
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
import { adaptiveMultichannelCadenceService } from '../../src/features/cadence/services/adaptiveMultichannelCadence.service.js';
import { recordOptOut } from '../../src/features/cadence/application/optOutService.js';

describe('ONDA 03 — Fluxo Abrangente Integrado e Cinco Jornadas Comerciais E2E', () => {
  const tenantA = 'org-birthub-tenant-alpha';
  const tenantB = 'org-birthub-tenant-beta';

  beforeEach(() => {
    behavioralEngineService.clear();
    selfDrivingCrmService.clear();
    valueRealizationService.clear();
    predictiveRevenueOracleService.clear();
    adaptiveMultichannelCadenceService.clear();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada A: Evolução do Vendedor
  // Indicador de Gargalo → Behavioral Engine → Missão Personalizada → Roleplay → Avaliação → Pontuação Backend → Atualização da Performance
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada A: deve detectar gargalo, gerar missão adaptativa, validar conclusão via Roleplay e conceder XP/badge pelo backend', async () => {
    // 1. Gargalo detectado em métricas reais (baixa conversão de cold calls: 30 calls, 1 reunião = 3.3%)
    const bottlenecks = await behavioralEngineService.detectBottlenecks({
      organizationId: tenantA,
      sellerId: 'seller-lucas',
      sellerName: 'Lucas SDR',
      performanceMetrics: {
        callsCount: 30,
        meetingsCount: 1,
        qualifiedCount: 0,
        dealsClosed: 0,
        wonRevenue: 0,
        conversionRatePercent: 3.3,
      },
    });

    expect(bottlenecks.length).toBe(1);
    expect(bottlenecks[0].metric).toBe('cold_call_conversion');

    // 2. Behavioral Engine gera missão adaptativa personalizada
    const mission = await behavioralEngineService.generateAdaptiveMission({
      organizationId: tenantA,
      bottleneck: bottlenecks[0],
    });

    expect(mission.title).toBe('Mestre do Gancho Comercial');
    expect(mission.status).toBe('SUGGESTED');
    expect(mission.reward.xp).toBe(150);

    // 3. Vendedor aceita a missão
    const accepted = await behavioralEngineService.acceptMission(tenantA, mission.id, 'seller-lucas');
    expect(accepted.status).toBe('IN_PROGRESS');

    // 4. Conclusão validada pelo backend com evidência
    const claimResult = await behavioralEngineService.claimMissionReward({
      organizationId: tenantA,
      missionId: mission.id,
      sellerId: 'seller-lucas',
      evidence: {
        completedCount: 10,
        averageScore: 84,
        evidenceHash: 'sha256-evidencia-roleplay-lucas-01',
        verifierSource: 'roleplay_engine',
      },
    });

    expect(claimResult.success).toBe(true);
    expect(claimResult.awardedXp).toBe(150);
    expect(claimResult.newTotalXp).toBe(150);
    expect(claimResult.badgeUnlocked).toBe('CALL_MASTER');
    expect(claimResult.mission.status).toBe('COMPLETED');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada B: Resgate Comercial
  // Lead Estagnado → RevOps → Self-Driving CRM → Revisão de Consentimento → Abordagem Sugerida → Aprovação → Cadência → Resultado
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada B: deve identificar lead estagnado, respeitar opt-out, propor abordagem e aplicar cadência adaptativa sob supervisão humana', async () => {
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

    // 1. Lead estagnado cadastrado no CRM
    selfDrivingCrmService.seedLead({
      leadId: 'lead-resgate-100',
      leadName: 'Logística Transbrasil',
      currentStage: 'Demonstração Técnica',
      lastActivityAt: twentyDaysAgo,
      hasActiveDeal: false,
      isWonOrLost: false,
    });

    // 2. Sinais de engajamento anteriores (não atende voz em 2 tentativas, mas respondeu WhatsApp)
    await selfDrivingCrmService.registerEngagementSignal({
      organizationId: tenantA,
      leadId: 'lead-resgate-100',
      channel: 'voice_call',
      signalType: 'CALL_UNANSWERED',
    });
    await selfDrivingCrmService.registerEngagementSignal({
      organizationId: tenantA,
      leadId: 'lead-resgate-100',
      channel: 'voice_call',
      signalType: 'CALL_UNANSWERED',
    });
    await selfDrivingCrmService.registerEngagementSignal({
      organizationId: tenantA,
      leadId: 'lead-resgate-100',
      channel: 'whatsapp',
      signalType: 'WHATSAPP_REPLIED',
    });

    // 3. Self-Driving CRM analisa estagnação e elegibilidade
    const stagnatedLeads = await selfDrivingCrmService.detectStagnatedLeads({
      organizationId: tenantA,
      inactivityThresholdDays: 15,
    });

    expect(stagnatedLeads.length).toBe(1);
    const target = stagnatedLeads[0];
    expect(target.eligibleForReactivation).toBe(true);
    expect(target.isOptedOut).toBe(false);
    expect(target.recommendedStrategy).toBe('diagnostic_refresh');

    // 4. Avaliação de otimização de cadência baseada no canal que respondeu (WhatsApp)
    const cadenceRec = await selfDrivingCrmService.evaluateCadenceOptimization({
      organizationId: tenantA,
      leadId: 'lead-resgate-100',
    });

    expect(cadenceRec).not.toBeNull();
    expect(cadenceRec?.recommendedAction).toBe('reduce_calls_shift_whatsapp');
    expect(cadenceRec?.prioritizedChannel).toBe('whatsapp');
    expect(cadenceRec?.status).toBe('PENDING_REVIEW');

    // 5. Aprovação humana mandatória do supervisor
    const approval = await selfDrivingCrmService.approveCadenceRecommendation({
      organizationId: tenantA,
      recommendationId: cadenceRec!.id,
      approvedBy: 'gestor-comercial-marcos',
    });

    expect(approval.success).toBe(true);
    expect(approval.recommendation.status).toBe('APPROVED');
    expect(approval.executionLog.toLowerCase()).toContain('whatsapp');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada C: Venda Consultiva por Valor
  // Conta → Diagnóstico → Simulador ROI → Business Case → Proposta → Compromissos → Onboarding → Realização de Valor
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada C: deve simular ROI econômico, gerar Business Case e acompanhar realização de valor pós-venda em ciclo contínuo', async () => {
    // 1. Simulação econômica no ROI Simulator
    const roiResult = await roiSimulatorService.calculateRoi({
      organizationId: tenantA,
      prospectName: 'Viação Ouro e Prata Frotas',
      segment: 'Transporte de Passageiros',
      companySize: 'enterprise',
      affectedEmployees: 20,
      averageHourlyCost: 50.0,
      hoursSpentPerActivityMonthly: 25,
      initialInvestment: 30000,
      monthlyRecurringCost: 2500,
      expectedEfficiencyGainPercent: 30,
    });

    expect(roiResult.baseScenario.monthlyNetBenefit).toBe(5000); // (20*25*0.3*50 = 7.500) - 2.500 = 5.000
    expect(roiResult.baseScenario.paybackMonths).toBe(6.0); // 30.000 / 5.000 = 6.0 meses

    // 2. Geração do Business Case formal
    const businessCase = await roiSimulatorService.generateBusinessCase({
      organizationId: tenantA,
      prospectName: 'Viação Ouro e Prata Frotas',
      segment: 'Transporte de Passageiros',
      companySize: 'enterprise',
      affectedEmployees: 20,
      averageHourlyCost: 50.0,
      hoursSpentPerActivityMonthly: 25,
      initialInvestment: 30000,
      monthlyRecurringCost: 2500,
      expectedEfficiencyGainPercent: 30,
    });

    expect(businessCase.executiveDiagnosis).toContain('Viação Ouro e Prata Frotas');
    expect(businessCase.dataSourcesAndLimitations.isEstimated).toBe(true);

    // 3. Conversão em compromisso de Value Realization pós-venda
    const tracker = await valueRealizationService.createTrackerFromPromise({
      organizationId: tenantA,
      commitmentId: 'prom-viação-01',
      customerCompanyName: 'Viação Ouro e Prata Frotas',
      metricType: 'operational_time_reduction',
      indicatorName: 'Redução do tempo de despacho operacional de frotas',
      baselineValue: 25, // 25 horas
      targetValue: 17.5, // 30% redução -> 17.5 horas
      unit: 'horas/mês',
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      responsibleOwnerName: 'Equipe de CS e Onboarding',
    });

    expect(tracker.status).toBe('ONBOARDING_ACTIVE');

    // 4. Medição real aos 60 dias pós-implantação
    const measured = await valueRealizationService.recordObservedValue({
      organizationId: tenantA,
      trackerId: tracker.id,
      observedValue: 17.0, // Superou a meta (17.0 <= 17.5)
      evidence: 'Auditoria de tempos do sistema de telemetria apontando 17.0h/mês gastas.',
      measuredBy: 'CS Lead',
    });

    expect(measured.status).toBe('ACHIEVED');
    expect(measured.history.length).toBe(1);

    // 5. Sumário consolidado do tenant
    const summary = await valueRealizationService.getRealizationSummary(tenantA);
    expect(summary.totalTrackers).toBe(1);
    expect(summary.achievedCount).toBe(1);
    expect(summary.averageAchievementRatePercent).toBeGreaterThanOrEqual(100);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada D: Gestão Executiva
  // CRM → Forecast → Revenue Oracle → What-If → Recomendação → Revisão Humana → Plano Comercial
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada D: deve prover Cockpit Executivo, simulação What-If e alocação supervisionada de contas', async () => {
    // REMED-03/04: Oracle lê histórico real (reader em memória por tenant) e a aprovação
    // de rebalanceamento é persistida/auditada pelo RebalanceApprovalService.
    const reader = new InMemoryOracleReader();
    seedRealHistory(reader, tenantA);
    const oracle = new PredictiveRevenueOracleService({ reader, now: () => ORACLE_FIXED_NOW });

    // 1. Cockpit Executivo de Receita com 3 horizontes derivados do histórico real
    const cockpit = await oracle.getCockpitData(tenantA);
    expect(cockpit.status).toBe('ok');
    expect(cockpit.projections.days30.expectedRevenue).toBe(20500);
    expect(cockpit.projections.days90.expectedRevenue).toBe(61500);
    expect(cockpit.projections.days180.expectedRevenue).toBe(123000);
    expect((await oracle.getCockpitData(tenantB)).status).toBe('insufficient_data');

    // 2. Simulação What-If de aceleração comercial sobre a linha de base real
    const whatIf = await oracle.runWhatIfSimulation({
      organizationId: tenantA,
      name: 'Simulação Aceleração 90 Dias',
      horizonDays: 90,
      prospectingVolumeDeltaPercent: 15,
      conversionRateDeltaPercent: 5,
    });
    expect(whatIf.simulatedRevenue).toBeGreaterThan(whatIf.baselineRevenue ?? Infinity);
    expect(whatIf.netRevenueDelta).toBeGreaterThan(0);
    expect(whatIf.impactBreakdown?.prospectingImpact).toBeGreaterThan(0);

    // 3. Sem motor real de recomendação: nada inventado
    expect(
      await oracle.generateAccountAllocationRecommendations({ organizationId: tenantA, limit: 1 }),
    ).toEqual([]);

    // 4. Aprovação formal do gestor (persistida + idempotente)
    const store = new InMemoryRebalanceApprovalStore();
    store.addLead(tenantA, 'lead-alpha-1', 'seller-a');
    store.addUser(tenantA, 'seller-b');
    const approvals = new RebalanceApprovalService({ store });
    const input = {
      recommendationId: rebalanceRecommendationId(tenantA, 'lead-alpha-1', 'seller-a', 'seller-b'),
      leadId: 'lead-alpha-1',
      fromOwner: 'seller-a',
      toOwner: 'seller-b',
      decision: 'APPROVED' as const,
    };
    const approved = await approvals.decide({ organizationId: tenantA, decidedBy: 'gestor-1', input });
    expect(approved.approval.decision).toBe('APPROVED');
    expect((await approvals.decide({ organizationId: tenantA, decidedBy: 'gestor-1', input })).alreadyRecorded).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Jornada E: Ciclo de Aprendizagem e Melhoria Contínua
  // Resultado Comercial → Win-Loss/Data Flywheel → Gargalo Identificado → Coaching/Gamificação → Melhoria Comercial
  // ──────────────────────────────────────────────────────────────────────────
  it('Jornada E: deve conectar motivo de perda e gargalos a planos de coaching adaptativo no Playbook e Roleplay', async () => {
    // 1. Gargalo recorrente identificado a partir de motivos de perda reais
    const bottlenecks = await behavioralEngineService.detectBottlenecks({
      organizationId: tenantA,
      sellerId: 'seller-rodrigo',
      sellerName: 'Rodrigo Closer',
      performanceMetrics: {
        callsCount: 20,
        meetingsCount: 15,
        qualifiedCount: 10,
        dealsClosed: 1,
        wonRevenue: 18000,
        conversionRatePercent: 10.0,
        topLossReason: 'Preço considerado elevado pelo CFO da conta',
      },
    });

    expect(bottlenecks.some((b) => b.metric === 'price_objection_handling')).toBe(true);

    // 2. Plano de Coaching adaptativo estruturado
    const coachingPlan = await behavioralEngineService.getAdaptiveCoachingPlan({
      organizationId: tenantA,
      sellerId: 'seller-rodrigo',
      sellerName: 'Rodrigo Closer',
      bottlenecks,
    });

    expect(coachingPlan.suggestedRoleplay.personaName).toContain('CFO');
    expect(coachingPlan.objectionMatrixTopic).toContain('TCO');
    expect(coachingPlan.microTrainingAction).toContain('ROI');
    expect(coachingPlan.playbookModule).toContain('Playbook Comercial');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Garantia de Isolamento Multi-Tenant
  // Tenant A e Tenant B são mutuamente herméticos em todos os 4 eixos
  // ──────────────────────────────────────────────────────────────────────────
  it('Garantia de Isolamento Multi-Tenant: Tenant A nunca vaza missões, sinais, trackers ou simulações para Tenant B', async () => {
    // 1. Criar missão no Tenant A
    const bA = (
      await behavioralEngineService.detectBottlenecks({
        organizationId: tenantA,
        sellerId: 'seller-a',
        sellerName: 'Vendedor A',
        performanceMetrics: {
          callsCount: 30,
          meetingsCount: 1,
          qualifiedCount: 0,
          dealsClosed: 0,
          wonRevenue: 0,
          conversionRatePercent: 3.3,
        },
      })
    )[0];
    const missionA = await behavioralEngineService.generateAdaptiveMission({
      organizationId: tenantA,
      bottleneck: bA,
    });

    // Tentativa de aceitar a missão do Tenant A a partir do Tenant B -> DEVE FALHAR
    await expect(
      behavioralEngineService.acceptMission(tenantB, missionA.id, 'seller-a'),
    ).rejects.toThrow(/não encontrada/);

    // 2. Criar tracker de valor no Tenant A
    const trackerA = await valueRealizationService.createTrackerFromPromise({
      organizationId: tenantA,
      commitmentId: 'prom-a',
      customerCompanyName: 'Empresa Alpha',
      metricType: 'productivity_gain',
      indicatorName: 'Produtividade Alpha',
      baselineValue: 10,
      targetValue: 20,
      unit: '%',
      deadline: new Date().toISOString(),
      responsibleOwnerName: 'Owner A',
    });

    // Listagem do Tenant B não deve enxergar o tracker do Tenant A
    const trackersB = await valueRealizationService.listTrackers(tenantB);
    expect(trackersB).toEqual([]);

    // Tentativa de gravar medição no tracker do Tenant A passando tenantB -> DEVE FALHAR
    await expect(
      valueRealizationService.recordObservedValue({
        organizationId: tenantB,
        trackerId: trackerA.id,
        observedValue: 18,
        evidence: 'Evidência B',
        measuredBy: 'User B',
      }),
    ).rejects.toThrow(/não encontrado no tenant/);

    // 3. Opt-Out no Tenant A não vaza e não bloqueia Tenant B
    await recordOptOut(selfDrivingCrmService.getOptOutRepository(), {
      organizationId: tenantA,
      scope: 'global',
      subject: { leadId: 'lead-compartilhado-id' },
      originChannel: 'email',
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    selfDrivingCrmService.seedLead({
      leadId: 'lead-compartilhado-id',
      leadName: 'Lead Compartilhado',
      currentStage: 'Prospecção',
      lastActivityAt: thirtyDaysAgo,
      hasActiveDeal: false,
      isWonOrLost: false,
    });

    // No Tenant A está bloqueado por opt-out
    const stagnatedA = await selfDrivingCrmService.detectStagnatedLeads({
      organizationId: tenantA,
      inactivityThresholdDays: 15,
    });
    expect(stagnatedA[0].isOptedOut).toBe(true);
    expect(stagnatedA[0].eligibleForReactivation).toBe(false);

    // No Tenant B NÃO está com opt-out (isolamento de consentimento por tenant)
    const stagnatedB = await selfDrivingCrmService.detectStagnatedLeads({
      organizationId: tenantB,
      inactivityThresholdDays: 15,
    });
    expect(stagnatedB[0].isOptedOut).toBe(false);
    expect(stagnatedB[0].eligibleForReactivation).toBe(true);
  });
});
