import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/queue/domainEventMesh.service.js', () => ({
  domainEventMesh: { publish: vi.fn(async () => undefined) },
}));

import {
  ORACLE_MIN_CLOSED_WON_DEALS,
  PredictiveRevenueOracleService,
  percentile,
} from '../../../src/features/commercial-intelligence/services/predictiveRevenueOracle.service.js';
import { InMemoryOracleReader, ORACLE_FIXED_NOW, seedRealHistory } from './oracleTestDoubles.js';

const orgA = 'org-oracle-alpha';
const orgB = 'org-oracle-beta';

function build() {
  const reader = new InMemoryOracleReader();
  const service = new PredictiveRevenueOracleService({ reader, now: () => ORACLE_FIXED_NOW });
  return { reader, service };
}

describe('PredictiveRevenueOracleService — REMED-03 (histórico real, sem constantes)', () => {
  it('percentile: interpolação linear', () => {
    expect(percentile([10, 20, 30, 40, 50], 0.5)).toBe(30);
    expect(percentile([10, 20], 0.1)).toBeCloseTo(11);
  });

  it('com histórico suficiente: P10/P50/P90 vêm das janelas reais (não 145k/485k/980k)', async () => {
    const { reader, service } = build();
    seedRealHistory(reader, orgA);
    const c = await service.getCockpitData(orgA);

    expect(c.status).toBe('ok');
    const d30 = c.projections.days30;
    // Receita mensal real: 15k..26k (12 meses) → percentis empíricos
    expect(d30.sampleWindows).toBe(12);
    expect(d30.confidenceInterval).toEqual({ p10: 16100, p50: 20500, p90: 24900 });
    expect(d30.expectedRevenue).toBe(20500);
    expect(d30.projectedWonDealsCount).toBe(2);
    expect(d30.uncertaintyDegree).toBe('LOW'); // (24900−16100)/20500 ≈ 0,43
    expect(d30.pipelineWeightedAmount).toBe(10000); // só o negócio que fecha em 30d (20k × 50%)

    const d90 = c.projections.days90;
    expect(d90.sampleWindows).toBe(10);
    expect(d90.expectedRevenue).toBe(61500);
    const d180 = c.projections.days180;
    expect(d180.sampleWindows).toBe(7);
    expect(d180.expectedRevenue).toBe(123000);

    for (const v of [145000, 485000, 980000]) {
      expect([d30.expectedRevenue, d90.expectedRevenue, d180.expectedRevenue]).not.toContain(v);
    }
    expect(c.closedWonRevenue).toBe(7000);
    expect(c.weightedPipelineRevenue).toBe(20000);
    expect(c.currentQuota).toBeNull();
    expect(c.dealsAtRisk).toEqual([]);
    expect(c.currentPeriod).toBe('2026-10');
    expect(c.modelConfidence).toBe('CALIBRATED_PROJECTION');
  });

  it('backtest real: snapshot mais antigo por mês vs realizado (não MAPE 8.4 / 142 amostras)', async () => {
    const { reader, service } = build();
    seedRealHistory(reader, orgA);
    const b = await service.getBacktestMetrics(orgA);
    expect(b.status).toBe('CALIBRATED');
    expect(b.samplesEvaluated).toBe(3);
    // |26-24|/24, |24-25|/25, |27-26|/26
    expect(b.meanAbsolutePercentageError).toBeCloseTo(((2 / 24 + 1 / 25 + 1 / 26) / 3) * 100, 1);
    expect(b.meanAbsoluteError).toBeCloseTo(4000 / 3, 1);
    expect(b.predictionIntervalCoveragePercent).toBeNull();
  });

  it('histórico insuficiente: status insufficient_data, valores null e motivo', async () => {
    const { reader, service } = build();
    reader.won.set(orgA, [{ amount: 5000, closedAt: new Date('2026-09-02T00:00:00Z') }]);
    const c = await service.getCockpitData(orgA);
    expect(c.status).toBe('insufficient_data');
    expect(c.modelConfidence).toBe('INSUFFICIENT_DATA');
    expect(c.insufficientDataReason).toContain(`mínimo ${ORACLE_MIN_CLOSED_WON_DEALS}`);
    for (const h of [c.projections.days30, c.projections.days90, c.projections.days180]) {
      expect(h.status).toBe('insufficient_data');
      expect(h.expectedRevenue).toBeNull();
      expect(h.confidenceInterval).toBeNull();
      expect(h.uncertaintyDegree).toBeNull();
    }
    const b = await service.getBacktestMetrics(orgA);
    expect(b.status).toBe('INSUFFICIENT_DATA');
    expect(b.meanAbsolutePercentageError).toBeNull();
    expect(b.isModelCalibrated).toBe(false);

    const w = await service.runWhatIfSimulation({ organizationId: orgA, name: 'x', horizonDays: 90 });
    expect(w.status).toBe('insufficient_data');
    expect(w.baselineRevenue).toBeNull();
    expect(w.impactBreakdown).toBeNull();
  });

  it('isolamento de tenant: histórico de A não vaza para B', async () => {
    const { reader, service } = build();
    seedRealHistory(reader, orgA);
    const b = await service.getCockpitData(orgB);
    expect(b.status).toBe('insufficient_data');
    expect(b.closedWonRevenue).toBe(0);
  });

  it('What-If usa a linha de base real (P50)', async () => {
    const { reader, service } = build();
    seedRealHistory(reader, orgA);
    const w = await service.runWhatIfSimulation({
      organizationId: orgA,
      name: 'Aceleração',
      horizonDays: 90,
      prospectingVolumeDeltaPercent: 10,
    });
    expect(w.status).toBe('ok');
    expect(w.baselineRevenue).toBe(61500);
    expect(w.simulatedRevenue).toBeGreaterThan(61500);
  });

  it('sem motor real de recomendação: lista vazia, nunca contas inventadas', async () => {
    const { service } = build();
    expect(await service.generateAccountAllocationRecommendations({ organizationId: orgA })).toEqual([]);
  });

  it('exige organizationId', async () => {
    const { service } = build();
    await expect(service.getCockpitData('')).rejects.toThrow(/Tenancy violation/);
  });
});
