import { describe, expect, it } from 'vitest';
import type { ProjectedRevenueHorizonV2 } from '../../../src/shared/contracts/predictiveRevenueOracle.contract.js';
import {
  type WhatIfClosedDeal,
  WhatIfInputError,
  WhatIfSimulationService,
} from '../../../src/features/commercial-intelligence/services/whatIfSimulation.service.js';
import { ORACLE_FIXED_NOW } from './oracleTestDoubles.js';

const okHorizon = (rev: number): ProjectedRevenueHorizonV2 => ({
  horizonDays: 90,
  status: 'ok',
  insufficientDataReason: null,
  sampleWindows: 10,
  expectedRevenue: rev,
  confidenceInterval: { p10: rev * 0.8, p50: rev, p90: rev * 1.2 },
  pipelineWeightedAmount: 0,
  projectedWonDealsCount: 6,
  keyDrivers: [],
  uncertaintyDegree: 'LOW',
});
// 20 encerrados: 8 ganhos de 10k, 12 perdidos → winRate 0,4, ticket 10k
const closedDeals: WhatIfClosedDeal[] = Array.from({ length: 20 }, (_, i) => ({
  won: i < 8,
  amount: i < 8 ? 10_000 : 0,
  closedAt: new Date(ORACLE_FIXED_NOW.getTime() - (i + 1) * 86_400_000 * 10),
}));

function svc(horizon: ProjectedRevenueHorizonV2, deals = closedDeals) {
  return new WhatIfSimulationService({
    oracle: { getRevenueBaseline: async () => horizon },
    reader: { listClosedDeals: async () => deals },
    now: () => ORACLE_FIXED_NOW,
  });
}

describe('WhatIfSimulationService — identidade volume × winRate × ticket', () => {
  it('sem alavancas → resultado = baseline', async () => {
    const out = await svc(okHorizon(100_000)).simulate('org-a', { horizonDays: 90, levers: {} });
    expect(out.status).toBe('ok');
    expect(out.result?.simulatedRevenue).toBe(100_000);
    expect(out.result?.netRevenueDelta).toBe(0);
  });

  it('aplica a fórmula declarada e a decomposição soma o delta', async () => {
    const out = await svc(okHorizon(100_000)).simulate('org-a', {
      horizonDays: 90,
      levers: { pipelineVolumeDeltaPercent: 10, winRateDeltaPp: 5, avgTicketDeltaPercent: -10 },
    });
    // 100k × 1,1 × (0,45/0,4) × 0,9 = 111.375
    expect(out.baseline).toMatchObject({ revenue: 100_000, winRate: 0.4, avgTicket: 10_000, closedDeals: 20, wonDeals: 8 });
    expect(out.result?.simulatedRevenue).toBe(111_375);
    expect(out.result?.factors).toEqual({ volume: 1.1, winRate: 1.125, ticket: 0.9 });
    const b = out.result!.breakdown;
    expect(b.volumeImpact + b.winRateImpact + b.ticketImpact).toBeCloseTo(out.result!.netRevenueDelta, 2);
    expect(out.formula).toMatch(/winRate/);
    expect(out.assumptions.length).toBeGreaterThan(0);
  });

  it('sem baseline do Oracle → insufficient_data com nulls', async () => {
    const out = await svc({ ...okHorizon(0), status: 'insufficient_data', expectedRevenue: null, insufficientDataReason: 'pouco histórico' }).simulate('org-a', { horizonDays: 30, levers: { winRateDeltaPp: 5 } });
    expect(out.status).toBe('insufficient_data');
    expect(out.baseline).toBeNull();
    expect(out.result).toBeNull();
    expect(out.insufficientDataReason).toBe('pouco histórico');
  });

  it('poucos encerrados → insufficient_data', async () => {
    const out = await svc(okHorizon(100_000), closedDeals.slice(0, 5)).simulate('org-a', { horizonDays: 90, levers: {} });
    expect(out.status).toBe('insufficient_data');
  });

  it('winRate fora de 0..100% → WhatIfInputError', async () => {
    await expect(
      svc(okHorizon(100_000)).simulate('org-a', { horizonDays: 90, levers: { winRateDeltaPp: 70 } }),
    ).rejects.toBeInstanceOf(WhatIfInputError);
  });
});
