import { beforeEach, describe, expect, it } from 'vitest';
import { predictiveRevenueOracleService } from '../../../src/features/commercial-intelligence/services/predictiveRevenueOracle.service.js';

describe('PredictiveRevenueOracleService — Eixo 20 (Predictive Revenue Oracle & What-If)', () => {
  const orgA = 'org-oracle-alpha';

  beforeEach(() => {
    predictiveRevenueOracleService.clear();
  });

  describe('Cockpit Executivo de Projeção de Receita', () => {
    it('deve fornecer projeções de receita para 30, 90 e 180 dias com intervalos de confiança auditáveis', async () => {
      const cockpit = await predictiveRevenueOracleService.getCockpitData(orgA);

      expect(cockpit.organizationId).toBe(orgA);
      expect(cockpit.currentQuota).toBe(150000);
      expect(cockpit.closedWonRevenue).toBe(112000);

      const { days30, days90, days180 } = cockpit.projections;

      // 30 dias
      expect(days30.horizonDays).toBe(30);
      expect(days30.expectedRevenue).toBe(145000);
      expect(days30.confidenceInterval.p10).toBeLessThan(days30.confidenceInterval.p50);
      expect(days30.confidenceInterval.p50).toBeLessThan(days30.confidenceInterval.p90);
      expect(days30.uncertaintyDegree).toBe('LOW');

      // 90 dias
      expect(days90.horizonDays).toBe(90);
      expect(days90.expectedRevenue).toBe(485000);
      expect(days90.uncertaintyDegree).toBe('MEDIUM');

      // 180 dias
      expect(days180.horizonDays).toBe(180);
      expect(days180.expectedRevenue).toBe(980000);
      expect(days180.uncertaintyDegree).toBe('HIGH');

      // Negócios em risco e gargalos
      expect(cockpit.dealsAtRisk.length).toBeGreaterThanOrEqual(1);
      expect(cockpit.mainFunnelBottlenecks.length).toBeGreaterThanOrEqual(1);
      expect(cockpit.modelConfidence).toBe('CALIBRATED_PROJECTION');
    });

    it('deve bloquear requisição de cockpit sem organizationId por garantia de Tenancy', async () => {
      await expect(predictiveRevenueOracleService.getCockpitData('')).rejects.toThrow(
        /Tenancy violation/,
      );
    });
  });

  describe('Motor What-If de Simulação Segura', () => {
    it('deve simular impacto de aumento de prospecção (+15%) e conversão (+5%) sem alterar dados reais', async () => {
      const sim = await predictiveRevenueOracleService.runWhatIfSimulation({
        organizationId: orgA,
        name: 'Aceleração de Prospecção Q4',
        horizonDays: 90,
        prospectingVolumeDeltaPercent: 15, // +15% prospecção
        conversionRateDeltaPercent: 5, // +5% conversão
      });

      expect(sim.simulationId).toBeDefined();
      expect(sim.baselineRevenue).toBe(485000);
      expect(sim.simulatedRevenue).toBeGreaterThan(sim.baselineRevenue);
      expect(sim.netRevenueDelta).toBeGreaterThan(0);
      expect(sim.deltaPercent).toBeGreaterThan(0);
      expect(sim.impactBreakdown.prospectingImpact).toBeGreaterThan(0);
      expect(sim.impactBreakdown.conversionImpact).toBeGreaterThan(0);
    });

    it('deve refletir impacto negativo de aumento no ciclo de vendas (+15 dias)', async () => {
      const sim = await predictiveRevenueOracleService.runWhatIfSimulation({
        organizationId: orgA,
        name: 'Cenário de Desaceleração de Ciclo',
        horizonDays: 90,
        salesCycleDeltaDays: 15,
      });

      expect(sim.baselineRevenue).toBe(485000);
      expect(sim.impactBreakdown.cycleImpact).toBeLessThan(0);
      expect(sim.simulatedRevenue).toBeLessThan(sim.baselineRevenue);
    });

    it('deve simular impacto de contratação de novos vendedores (+2 vendedores)', async () => {
      const sim = await predictiveRevenueOracleService.runWhatIfSimulation({
        organizationId: orgA,
        name: 'Expansão de Time Comercial',
        horizonDays: 90,
        additionalSellersCount: 2,
      });

      expect(sim.impactBreakdown.capacityImpact).toBeGreaterThan(0);
      expect(sim.simulatedRevenue).toBeGreaterThan(sim.baselineRevenue);
    });
  });

  describe('Backtesting e Calibração Estatística', () => {
    it('deve fornecer métricas auditáveis de acurácia, viés e calibração', async () => {
      const metrics = await predictiveRevenueOracleService.getBacktestMetrics(orgA);

      expect(metrics.status).toBe('CALIBRATED');
      expect(metrics.isModelCalibrated).toBe(true);
      expect(metrics.samplesEvaluated).toBeGreaterThanOrEqual(100);
      expect(metrics.meanAbsolutePercentageError).toBeLessThan(10.0); // MAPE < 10%
      expect(Math.abs(metrics.predictionBias)).toBeLessThan(3.0); // Viés < 3%
      expect(metrics.calibrationScore).toBeGreaterThanOrEqual(0.85); // Calibração > 0.85
      expect(metrics.predictionIntervalCoveragePercent).toBeGreaterThanOrEqual(90); // Cobertura P10-P90 > 90%
    });
  });

  describe('Alocação Inteligente e Supervisionada de Contas', () => {
    it('deve gerar propostas de redistribuição com MatchScore e status PENDING_HUMAN_REVIEW', async () => {
      const recommendations =
        await predictiveRevenueOracleService.generateAccountAllocationRecommendations({
          organizationId: orgA,
          limit: 3,
        });

      expect(recommendations.length).toBeGreaterThanOrEqual(1);
      const rec = recommendations[0];
      expect(rec.recommendationId).toBeDefined();
      expect(rec.matchScore).toBeGreaterThanOrEqual(80);
      expect(rec.approvalStatus).toBe('PENDING_HUMAN_REVIEW'); // NUNCA executa sem supervisão humana
      expect(rec.rationale.industrySpecialization).toBe(true);
      expect(rec.rationale.territoryCompliance).toBe(true);
      expect(rec.estimatedConversionUpliftPercent).toBeGreaterThan(0);
    });

    it('deve efetivar a alocação mediante aprovação explícita do gestor', async () => {
      const recommendations =
        await predictiveRevenueOracleService.generateAccountAllocationRecommendations({
          organizationId: orgA,
          limit: 1,
        });
      const target = recommendations[0];

      const approval = await predictiveRevenueOracleService.approveAccountAllocation({
        organizationId: orgA,
        recommendationId: target.recommendationId,
        approvedBy: 'diretor-comercial-cro',
      });

      expect(approval.success).toBe(true);
      expect(approval.executedAllocation.approvalStatus).toBe('APPROVED');
      expect(approval.executedAllocation.suggestedOwnerName).toBe(target.suggestedOwnerName);
    });
  });
});
