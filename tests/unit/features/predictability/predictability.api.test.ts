import { describe, expect, it, vi } from 'vitest';
import {
  buildPredictabilityOverview,
  getPredictabilityOverview,
  PredictabilityApiError,
  type CiDealsSlice,
  type CiExecutiveOverviewSlice,
  type CiPerformanceSlice,
  type CiSellerBenchmarkSlice,
  type PredictabilitySources,
} from '../../../../src/features/predictability/predictability.api.js';

const emptyOverview: CiExecutiveOverviewSlice = {
  period: '2026-10',
  goal: null,
  closedAmount: 0,
  closedCount: 0,
  pctOfGoal: null,
  commitAmount: 0,
  bestCaseAmount: 0,
  upsideAmount: 0,
  forecastAmount: 0,
  gapForecast: null,
  gapCommit: null,
  pipelineTotal: 0,
  pipelineTotalCount: 0,
  pipelineEligible: 0,
  pipelineEligibleCount: 0,
  forecastConfidence: { score: null, classification: null, sampleSize: 0 },
  isEmpty: true,
  dataAsOf: '2026-10-10T12:00:00.000Z',
};

const realOverview: CiExecutiveOverviewSlice = {
  ...emptyOverview,
  goal: { amount: 200000, currency: 'BRL', updatedAt: '2026-10-01T00:00:00.000Z' },
  closedAmount: 80000,
  closedCount: 4,
  pctOfGoal: 40,
  commitAmount: 30000,
  bestCaseAmount: 10000,
  upsideAmount: 5000,
  forecastAmount: 130000,
  gapForecast: 70000,
  gapCommit: 90000,
  pipelineTotal: 100000,
  pipelineTotalCount: 3,
  pipelineEligible: 60000,
  pipelineEligibleCount: 2,
  forecastConfidence: { score: 72, classification: 'atencao', sampleSize: 12 },
  isEmpty: false,
};

const emptyPerf: CiPerformanceSlice = { period: '2026-10', winRate: null, funnel: [] };
const realPerf: CiPerformanceSlice = {
  period: '2026-10',
  winRate: 33.3,
  funnel: [
    { stageId: 's2', label: 'Proposta', sortOrder: 2, count: 1, amount: 50000, conversionFromPrevious: 50, historicalConversionFromPrevious: 40 },
    { stageId: 's1', label: 'Qualificação', sortOrder: 1, count: 2, amount: 50000, conversionFromPrevious: null, historicalConversionFromPrevious: null },
  ],
};

const emptyDeals: CiDealsSlice = { total: 0, rows: [] };
const realDeals: CiDealsSlice = {
  total: 3,
  rows: [
    { id: 'd1', title: 'Expansão', companyName: 'Acme', amount: 50000, owner: 'Ana', stageName: 'Proposta', weightedProbability: 60, tier: 'Commit', expectedCloseAt: '2026-10-20T00:00:00.000Z' },
    { id: 'd2', title: 'Novo', companyName: 'Beta', amount: 30000, owner: 'Bruno', stageName: 'Qualificação', weightedProbability: 20, tier: 'Pipeline', expectedCloseAt: null },
    { id: 'd3', title: 'Piloto', companyName: 'Gama', amount: 20000, owner: 'Ana', stageName: 'Qualificação', weightedProbability: 10, tier: 'Upside', expectedCloseAt: null },
  ],
};

const emptyBench: CiSellerBenchmarkSlice = { period: '2026-10', sellers: [] };
const realBench: CiSellerBenchmarkSlice = {
  period: '2026-10',
  sellers: [{ owner: 'Ana', winRate: 50, wonCount: 2, lostCount: 2, openCount: 2, openAmount: 70000 }],
};

const ok = <T>(data: T) => ({ ok: true as const, data });
const fail = { ok: false as const, error: new Error('403') };

function sources(over: Partial<PredictabilitySources> = {}): PredictabilitySources {
  return {
    period: '2026-10',
    overview: ok(emptyOverview),
    performance: ok(emptyPerf),
    deals: ok(emptyDeals),
    sellerBenchmark: ok(emptyBench),
    ...over,
  };
}

describe('buildPredictabilityOverview — sem dados', () => {
  it('devolve null/[] e meta.source none, sem nenhum R$ inventado', () => {
    const r = buildPredictabilityOverview(sources());
    expect(r.meta.source).toBe('none');
    expect(r.meta.failedSources).toEqual([]);
    expect(r.forecast.forecastAmount).toBeNull();
    expect(r.forecast.closedAmount).toBeNull();
    expect(r.forecast.gapToGoal).toBeNull();
    expect(r.forecast.goalAmount).toBeNull();
    expect(r.forecast.topDeals).toEqual([]);
    expect(r.goals.goalAmount).toBeNull();
    expect(r.goals.remainingAmount).toBeNull();
    expect(r.goals.projectedPctOfGoal).toBeNull();
    expect(r.goals.sellers).toEqual([]);
    expect(r.pipeline.grossAmount).toBeNull();
    expect(r.pipeline.weightedAmount).toBeNull();
    expect(r.pipeline.atRiskAmount).toBeNull();
    expect(r.pipeline.stages).toEqual([]);
    const fields = r.meta.unavailable.map((u) => u.field);
    expect(fields).toEqual(
      expect.arrayContaining(['forecast.forecastAmount', 'goals.goalAmount', 'pipeline.weightedAmount', 'goals.sellers.goalAmount']),
    );
  });

  it('meta cadastrada sem negócios: source real, fechado 0 contra a meta, forecast null', () => {
    const r = buildPredictabilityOverview(
      sources({ overview: ok({ ...emptyOverview, goal: realOverview.goal, pctOfGoal: 0 }) }),
    );
    expect(r.meta.source).toBe('real');
    expect(r.goals.goalAmount).toBe(200000);
    expect(r.goals.closedAmount).toBe(0);
    expect(r.goals.remainingAmount).toBe(200000);
    expect(r.forecast.forecastAmount).toBeNull();
  });
});

describe('buildPredictabilityOverview — fixtures reais', () => {
  const r = buildPredictabilityOverview(
    sources({ overview: ok(realOverview), performance: ok(realPerf), deals: ok(realDeals), sellerBenchmark: ok(realBench) }),
  );

  it('forecast reflete o motor de commercial-intelligence', () => {
    expect(r.meta.source).toBe('real');
    expect(r.meta.dataAsOf).toBe('2026-10-10T12:00:00.000Z');
    expect(r.forecast.forecastAmount).toBe(130000);
    expect(r.forecast.gapToGoal).toBe(70000);
    expect(r.forecast.gapToGoalPct).toBe(35);
    expect(r.forecast.confidenceScore).toBe(72);
    expect(r.forecast.winRate).toBe(33.3);
    expect(r.forecast.stageConversion.map((s) => s.label)).toEqual(['Qualificação', 'Proposta']);
    expect(r.forecast.topDeals[0]).toMatchObject({ id: 'd1', amount: 50000, probability: 60 });
  });

  it('metas: realizado, restante e projeção contra a meta', () => {
    expect(r.goals.goalAmount).toBe(200000);
    expect(r.goals.closedAmount).toBe(80000);
    expect(r.goals.remainingAmount).toBe(120000);
    expect(r.goals.pctOfGoal).toBe(40);
    expect(r.goals.projectedAmount).toBe(130000);
    expect(r.goals.projectedPctOfGoal).toBe(65);
    expect(r.goals.sellers).toEqual([
      { owner: 'Ana', goalAmount: null, wonCount: 2, lostCount: 2, winRate: 50, openCount: 2, openAmount: 70000 },
    ]);
  });

  it('pipeline ponderado = Σ valor × probabilidade, agrupado por etapa', () => {
    // 50000×0.6 + 30000×0.2 + 20000×0.1 = 30000 + 6000 + 2000
    expect(r.pipeline.grossAmount).toBe(100000);
    expect(r.pipeline.weightedAmount).toBe(38000);
    expect(r.pipeline.atRiskAmount).toBe(62000);
    const qual = r.pipeline.stages.find((s) => s.stageName === 'Qualificação');
    expect(qual).toEqual({ stageName: 'Qualificação', count: 2, grossAmount: 50000, weightedAmount: 8000, avgProbability: 16 });
  });

  it('amostra de negócios parcial → weighted null + amostra_parcial', () => {
    const partial = buildPredictabilityOverview(
      sources({ overview: ok(realOverview), deals: ok({ ...realDeals, total: 500 }) }),
    );
    expect(partial.pipeline.weightedAmount).toBeNull();
    expect(partial.pipeline.stages).toEqual([]);
    expect(partial.meta.unavailable).toContainEqual({ field: 'pipeline.weightedAmount', reason: 'amostra_parcial' });
  });

  it('fonte que falhou → campos null + failedSources, sem zerar', () => {
    const partial = buildPredictabilityOverview(sources({ overview: fail, deals: ok(realDeals) }));
    expect(partial.meta.failedSources).toEqual(['overview']);
    expect(partial.forecast.forecastAmount).toBeNull();
    expect(partial.pipeline.grossAmount).toBeNull();
    expect(partial.pipeline.weightedAmount).toBe(38000);
    expect(partial.pipeline.atRiskAmount).toBeNull();
  });
});

describe('getPredictabilityOverview', () => {
  it('compõe só rotas de /api/commercial-intelligence com o mesmo mês/owner', async () => {
    const get = vi.fn(async (url: string) => {
      if (url.includes('/overview')) return realOverview;
      if (url.includes('/performance')) return realPerf;
      if (url.includes('/deals')) return realDeals;
      return realBench;
    }) as unknown as <T>(url: string) => Promise<T>;
    const r = await getPredictabilityOverview({ month: '2026-10', owner: 'Ana' }, get);
    const urls = (get as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string);
    expect(urls).toHaveLength(4);
    for (const u of urls) {
      expect(u.startsWith('/api/commercial-intelligence/')).toBe(true);
      expect(u).toContain('month=2026-10');
      expect(u).toContain('owner=Ana');
    }
    expect(urls.find((u) => u.includes('/deals'))).toContain('limit=200');
    expect(r.meta.period).toBe('2026-10');
    expect(r.pipeline.weightedAmount).toBe(38000);
  });

  it('todas as fontes falhando → PredictabilityApiError (sem fallback)', async () => {
    const get = (async () => {
      throw new Error('500');
    }) as <T>(url: string) => Promise<T>;
    await expect(getPredictabilityOverview({ month: '2026-10' }, get)).rejects.toBeInstanceOf(
      PredictabilityApiError,
    );
  });
});
