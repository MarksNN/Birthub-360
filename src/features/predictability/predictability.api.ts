/**
 * Contrato de leitura honesto de Previsibilidade (P0 #693, PR B) — ForecastHub, MetasHub e
 * PipelinePonderadoHub.
 *
 * Não existe rota nova nem RBAC paralelo: este cliente só COMPÕE endpoints já existentes de
 * `/api/commercial-intelligence/*` (mesmo `requireRole(COMMERCIAL_INTELLIGENCE_ROLES)` +
 * `authenticateToken`/`requireTenant` do mount em `server.ts`). Composição entre features é via
 * HTTP, nunca import de internals (regra `no-cross-feature-imports` do dependency-cruiser), por
 * isso as formas de resposta abaixo redeclaram SÓ os campos consumidos — mesma duplicação
 * intencional documentada em `commercialIntelligence.api.ts` (ADR-003, seção D).
 *
 * Regras do contrato:
 * - Nenhum R$ é inventado. Sem dado real → `null` (escalares) ou `[]` (listas), e o campo entra em
 *   `meta.unavailable` com o motivo.
 * - `meta.source === 'none'` quando a organização não tem negócio/meta nenhum no período.
 * - Falha parcial (um endpoint caiu/403) → campos daquela fonte viram `null` e a fonte entra em
 *   `meta.failedSources`. Falha TOTAL → `PredictabilityApiError` (sem fallback silencioso).
 *
 * `/api/crm/overview` (crm360) não é consumido: tudo que os hubs exibem já vem do motor de forecast
 * de commercial-intelligence (mesmo cálculo de tiers/probabilidade do Cockpit), então ler o crm360
 * só duplicaria uma segunda verdade para os mesmos números.
 */
import { api } from '../../lib/api.js';
import { brazilMonthKey } from '../../shared/time/brazilCalendar.js';

// ─── Formas de resposta consumidas de /api/commercial-intelligence (subconjunto) ─────────────

export type CiForecastTier = 'Commit' | 'BestCase' | 'Pipeline' | 'Upside';

export interface CiExecutiveOverviewSlice {
  period: string;
  goal: { amount: number; currency: string; updatedAt: string } | null;
  closedAmount: number;
  closedCount: number;
  pctOfGoal: number | null;
  commitAmount: number;
  bestCaseAmount: number;
  upsideAmount: number;
  forecastAmount: number;
  gapForecast: number | null;
  gapCommit: number | null;
  pipelineTotal: number;
  pipelineTotalCount: number;
  pipelineEligible: number;
  pipelineEligibleCount: number;
  forecastConfidence: {
    score: number | null;
    classification: 'saudavel' | 'atencao' | 'critico' | null;
    sampleSize: number;
  };
  isEmpty: boolean;
  dataAsOf: string;
}

export interface CiPerformanceSlice {
  period: string;
  winRate: number | null;
  funnel: {
    stageId: string;
    label: string;
    sortOrder: number;
    count: number;
    amount: number;
    conversionFromPrevious: number | null;
    historicalConversionFromPrevious: number | null;
  }[];
}

export interface CiDealRowSlice {
  id: string;
  title: string | null;
  companyName: string | null;
  amount: number;
  owner: string | null;
  stageName: string | null;
  /** Probabilidade explicável do motor de forecast (0–100). */
  weightedProbability: number | null;
  tier: CiForecastTier | null;
  expectedCloseAt: string | null;
}

export interface CiDealsSlice {
  total: number;
  rows: CiDealRowSlice[];
}

export interface CiSellerBenchmarkSlice {
  period: string;
  sellers: {
    owner: string;
    winRate: number | null;
    wonCount: number;
    lostCount: number;
    openCount: number;
    openAmount: number;
  }[];
}

// ─── Contrato público para os hubs (Agente 02) ──────────────────────────────────────────────

export type PredictabilitySource = 'real' | 'none';
export type PredictabilitySourceKey = 'overview' | 'performance' | 'deals' | 'sellerBenchmark';

export type PredictabilityUnavailableReason =
  | 'sem_dados' // organização sem negócio/meta no período
  | 'sem_meta' // meta NEW_MRR do mês não cadastrada (PUT /api/commercial-intelligence/goals)
  | 'fonte_indisponivel' // endpoint de origem falhou (rede/403/5xx)
  | 'nao_suportado' // dado não existe no modelo atual (ex.: meta por vendedor)
  | 'amostra_parcial'; // mais negócios abertos do que o limite de leitura (200)

export interface PredictabilityUnavailableField {
  /** Caminho do campo no Overview, ex.: `goals.goalAmount`, `pipeline.weightedAmount`. */
  field: string;
  reason: PredictabilityUnavailableReason;
}

export interface PredictabilityMeta {
  source: PredictabilitySource;
  /** Mês `YYYY-MM` (fuso de Brasília) consultado. */
  period: string;
  /** `dataAsOf` do overview de commercial-intelligence; `null` se o overview falhou. */
  dataAsOf: string | null;
  currency: string;
  unavailable: PredictabilityUnavailableField[];
  failedSources: PredictabilitySourceKey[];
}

export interface PredictabilityForecastDeal {
  id: string;
  companyName: string | null;
  title: string | null;
  amount: number;
  /** 0–100, probabilidade do motor de forecast; `null` se o motor não calculou. */
  probability: number | null;
  expectedCloseAt: string | null;
  tier: CiForecastTier | null;
  owner: string | null;
}

export interface PredictabilityStageConversion {
  stageId: string;
  label: string;
  /** % de conversão da etapa anterior (período). */
  conversionFromPrevious: number | null;
  /** % de conversão histórica (stage history) — melhor proxy de "win rate por etapa". */
  historicalConversionFromPrevious: number | null;
}

export interface PredictabilityForecast {
  /** Fechado + Commit + Best Case + Pipeline ponderado (motor de commercial-intelligence). */
  forecastAmount: number | null;
  closedAmount: number | null;
  commitAmount: number | null;
  bestCaseAmount: number | null;
  upsideAmount: number | null;
  /** meta − forecast; `null` sem meta. */
  gapToGoal: number | null;
  /** gap / meta em %; `null` sem meta. */
  gapToGoalPct: number | null;
  goalAmount: number | null;
  confidenceScore: number | null;
  confidenceClassification: 'saudavel' | 'atencao' | 'critico' | null;
  winRate: number | null;
  stageConversion: PredictabilityStageConversion[];
  /** Top negócios abertos por valor (máx. 10). */
  topDeals: PredictabilityForecastDeal[];
}

export interface PredictabilitySellerRow {
  owner: string;
  /** Sempre `null` hoje: metas são só por organização (NEW_MRR), não por vendedor. */
  goalAmount: null;
  wonCount: number;
  lostCount: number;
  winRate: number | null;
  openCount: number;
  openAmount: number;
}

export interface PredictabilityGoals {
  goalAmount: number | null;
  closedAmount: number | null;
  /** meta − fechado (mínimo 0); `null` sem meta. */
  remainingAmount: number | null;
  /** fechado / meta em %; `null` sem meta. */
  pctOfGoal: number | null;
  /** Projeção de fechamento do mês = forecastAmount. */
  projectedAmount: number | null;
  /** projeção / meta em %; `null` sem meta. */
  projectedPctOfGoal: number | null;
  sellers: PredictabilitySellerRow[];
}

export interface PredictabilityPipelineStage {
  stageName: string;
  count: number;
  grossAmount: number;
  /** Σ valor × probabilidade; `null` se a amostra de negócios estiver parcial. */
  weightedAmount: number | null;
  /** weighted / gross em %; `null` quando weighted é `null` ou gross = 0. */
  avgProbability: number | null;
}

export interface PredictabilityPipeline {
  grossAmount: number | null;
  grossCount: number | null;
  eligibleAmount: number | null;
  eligibleCount: number | null;
  /** Σ valor × probabilidade de todos os negócios abertos; `null` se amostra parcial/fonte caiu. */
  weightedAmount: number | null;
  /** gross − weighted ("em risco"); `null` quando weighted é `null`. */
  atRiskAmount: number | null;
  stages: PredictabilityPipelineStage[];
}

export interface PredictabilityOverview {
  forecast: PredictabilityForecast;
  goals: PredictabilityGoals;
  pipeline: PredictabilityPipeline;
  meta: PredictabilityMeta;
}

export class PredictabilityApiError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PredictabilityApiError';
  }
}

// ─── Montagem pura (testável sem rede) ──────────────────────────────────────────────────────

export type SourceResult<T> = { ok: true; data: T } | { ok: false; error: unknown };

export interface PredictabilitySources {
  period: string;
  overview: SourceResult<CiExecutiveOverviewSlice>;
  performance: SourceResult<CiPerformanceSlice>;
  deals: SourceResult<CiDealsSlice>;
  sellerBenchmark: SourceResult<CiSellerBenchmarkSlice>;
}

/** Limite máximo do `/deals` (drillDownReport: `Math.min(limit, 200)`). */
export const PREDICTABILITY_DEALS_LIMIT = 200;
const TOP_DEALS = 10;

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (num: number, den: number) => round2((num / den) * 100);

export function buildPredictabilityOverview(src: PredictabilitySources): PredictabilityOverview {
  const unavailable: PredictabilityUnavailableField[] = [];
  const failedSources: PredictabilitySourceKey[] = [];
  const mark = (field: string, reason: PredictabilityUnavailableReason) => {
    unavailable.push({ field, reason });
  };

  const ov = src.overview.ok ? src.overview.data : null;
  const perf = src.performance.ok ? src.performance.data : null;
  const deals = src.deals.ok ? src.deals.data : null;
  const bench = src.sellerBenchmark.ok ? src.sellerBenchmark.data : null;
  if (!ov) failedSources.push('overview');
  if (!perf) failedSources.push('performance');
  if (!deals) failedSources.push('deals');
  if (!bench) failedSources.push('sellerBenchmark');

  const hasDeals = !!deals && deals.total > 0;
  const hasSellers = !!bench && bench.sellers.length > 0;
  const hasOverviewData = !!ov && (!ov.isEmpty || ov.goal !== null);
  const source: PredictabilitySource = hasOverviewData || hasDeals || hasSellers ? 'real' : 'none';

  // Overview vazio (sem negócio no escopo) ≠ zero real: valores monetários viram null.
  const ovUsable = ov && !ov.isEmpty ? ov : null;
  const goalAmount = ov?.goal?.amount ?? null;

  if (!ov) {
    for (const f of ['forecast.forecastAmount', 'goals.goalAmount', 'pipeline.grossAmount']) {
      mark(f, 'fonte_indisponivel');
    }
  } else {
    if (ov.isEmpty) {
      for (const f of ['forecast.forecastAmount', 'pipeline.grossAmount']) mark(f, 'sem_dados');
      if (ov.goal === null) mark('goals.closedAmount', 'sem_dados');
    }
    if (goalAmount === null) mark('goals.goalAmount', 'sem_meta');
  }
  mark('goals.sellers.goalAmount', 'nao_suportado');

  // Forecast
  const forecastAmount = ovUsable?.forecastAmount ?? null;
  const gapToGoal = ovUsable && goalAmount !== null ? ovUsable.gapForecast : null;
  const forecast: PredictabilityForecast = {
    forecastAmount,
    closedAmount: ovUsable?.closedAmount ?? null,
    commitAmount: ovUsable?.commitAmount ?? null,
    bestCaseAmount: ovUsable?.bestCaseAmount ?? null,
    upsideAmount: ovUsable?.upsideAmount ?? null,
    gapToGoal,
    gapToGoalPct: gapToGoal !== null && goalAmount ? pct(gapToGoal, goalAmount) : null,
    goalAmount,
    confidenceScore: ovUsable?.forecastConfidence.score ?? null,
    confidenceClassification: ovUsable?.forecastConfidence.classification ?? null,
    winRate: perf?.winRate ?? null,
    stageConversion: perf
      ? [...perf.funnel]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => ({
            stageId: s.stageId,
            label: s.label,
            conversionFromPrevious: s.conversionFromPrevious,
            historicalConversionFromPrevious: s.historicalConversionFromPrevious,
          }))
      : [],
    topDeals: deals
      ? [...deals.rows]
          .sort((a, b) => b.amount - a.amount)
          .slice(0, TOP_DEALS)
          .map((d) => ({
            id: d.id,
            companyName: d.companyName,
            title: d.title,
            amount: d.amount,
            probability: d.weightedProbability,
            expectedCloseAt: d.expectedCloseAt,
            tier: d.tier,
            owner: d.owner,
          }))
      : [],
  };
  if (!perf) mark('forecast.stageConversion', 'fonte_indisponivel');

  // Metas
  const closedAmount = ovUsable?.closedAmount ?? (ov?.goal ? ov.closedAmount : null);
  const goals: PredictabilityGoals = {
    goalAmount,
    closedAmount,
    remainingAmount:
      goalAmount !== null && closedAmount !== null
        ? round2(Math.max(goalAmount - closedAmount, 0))
        : null,
    pctOfGoal: ov && goalAmount !== null ? ov.pctOfGoal : null,
    projectedAmount: forecastAmount,
    projectedPctOfGoal:
      forecastAmount !== null && goalAmount ? pct(forecastAmount, goalAmount) : null,
    sellers: bench
      ? bench.sellers.map((s) => ({
          owner: s.owner,
          goalAmount: null,
          wonCount: s.wonCount,
          lostCount: s.lostCount,
          winRate: s.winRate,
          openCount: s.openCount,
          openAmount: s.openAmount,
        }))
      : [],
  };
  if (!bench) mark('goals.sellers', 'fonte_indisponivel');

  // Pipeline ponderado
  const sampleComplete = !!deals && deals.rows.length >= deals.total;
  let weightedAmount: number | null = null;
  const stageMap = new Map<string, { count: number; gross: number; weighted: number | null }>();
  if (deals) {
    let total = 0;
    let anyMissingProb = false;
    for (const d of deals.rows) {
      const key = d.stageName ?? 'Sem etapa';
      const entry = stageMap.get(key) ?? { count: 0, gross: 0, weighted: 0 };
      entry.count += 1;
      entry.gross += d.amount;
      if (d.weightedProbability === null) {
        entry.weighted = null;
        anyMissingProb = true;
      } else if (entry.weighted !== null) {
        entry.weighted += (d.amount * d.weightedProbability) / 100;
      }
      if (d.weightedProbability !== null) total += (d.amount * d.weightedProbability) / 100;
      stageMap.set(key, entry);
    }
    if (!sampleComplete) mark('pipeline.weightedAmount', 'amostra_parcial');
    else if (anyMissingProb) mark('pipeline.weightedAmount', 'sem_dados');
    else if (deals.total > 0) weightedAmount = round2(total);
    else mark('pipeline.weightedAmount', 'sem_dados');
  } else {
    mark('pipeline.weightedAmount', 'fonte_indisponivel');
  }

  const stages: PredictabilityPipelineStage[] = sampleComplete
    ? [...stageMap.entries()].map(([stageName, e]) => {
        const weighted = e.weighted === null ? null : round2(e.weighted);
        return {
          stageName,
          count: e.count,
          grossAmount: round2(e.gross),
          weightedAmount: weighted,
          avgProbability: weighted !== null && e.gross > 0 ? pct(weighted, e.gross) : null,
        };
      })
    : [];

  const grossAmount = ovUsable?.pipelineTotal ?? null;
  const pipeline: PredictabilityPipeline = {
    grossAmount,
    grossCount: ovUsable?.pipelineTotalCount ?? null,
    eligibleAmount: ovUsable?.pipelineEligible ?? null,
    eligibleCount: ovUsable?.pipelineEligibleCount ?? null,
    weightedAmount,
    atRiskAmount:
      weightedAmount !== null && grossAmount !== null ? round2(grossAmount - weightedAmount) : null,
    stages,
  };

  return {
    forecast,
    goals,
    pipeline,
    meta: {
      source,
      period: src.period,
      dataAsOf: ov?.dataAsOf ?? null,
      currency: ov?.goal?.currency ?? 'BRL',
      unavailable,
      failedSources,
    },
  };
}

// ─── Cliente HTTP ───────────────────────────────────────────────────────────────────────────

const BASE = '/api/commercial-intelligence';

export interface PredictabilityFilter {
  /** `YYYY-MM`; default = mês corrente em America/Sao_Paulo. */
  month?: string;
  owner?: string;
}

export type PredictabilityGetter = <T>(url: string) => Promise<T>;

async function settle<T>(p: Promise<T>): Promise<SourceResult<T>> {
  try {
    return { ok: true, data: await p };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function getPredictabilityOverview(
  filter: PredictabilityFilter = {},
  get: PredictabilityGetter = (url) => api.get(url),
): Promise<PredictabilityOverview> {
  const period = filter.month ?? brazilMonthKey(new Date());
  const params = new URLSearchParams({ month: period });
  if (filter.owner) params.set('owner', filter.owner);
  const q = params.toString();
  const dealsQ = `${q}&limit=${PREDICTABILITY_DEALS_LIMIT}`;

  const [overview, performance, deals, sellerBenchmark] = await Promise.all([
    settle(get<CiExecutiveOverviewSlice>(`${BASE}/overview?${q}`)),
    settle(get<CiPerformanceSlice>(`${BASE}/performance?${q}`)),
    settle(get<CiDealsSlice>(`${BASE}/deals?${dealsQ}`)),
    settle(get<CiSellerBenchmarkSlice>(`${BASE}/seller-benchmark?${q}`)),
  ]);

  if (!overview.ok && !performance.ok && !deals.ok && !sellerBenchmark.ok) {
    throw new PredictabilityApiError(
      'Não foi possível carregar a previsibilidade comercial.',
      overview.error,
    );
  }

  return buildPredictabilityOverview({ period, overview, performance, deals, sellerBenchmark });
}

export const predictabilityApi = {
  /** Lança `PredictabilityApiError` só se TODAS as fontes falharem — nunca devolve dado de exemplo. */
  getOverview: getPredictabilityOverview,
};
