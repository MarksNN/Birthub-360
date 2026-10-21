import { randomUUID } from 'node:crypto';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import type {
  AccountAllocationRecommendation,
  BacktestValidationMetricsV2 as BacktestValidationMetrics,
  ExecutiveRevenueCockpitV2 as ExecutiveRevenueCockpit,
  IPredictiveRevenueOraclePort,
  ProjectedRevenueHorizonV2 as ProjectedRevenueHorizon,
  RevenueHorizonDays,
  WhatIfSimulationInput,
  WhatIfSimulationResultV2 as WhatIfSimulationResult,
} from '../../../shared/contracts/predictiveRevenueOracle.contract.js';

/**
 * REMED-03 — Revenue Oracle calculado a partir do histórico REAL do tenant.
 *
 * Fonte: negócios `Fechado_Ganho` do funil Negócio (`Lead.closedAt`/`Lead.amount`), negócios
 * abertos (`amount × probability`) e `ForecastSnapshot` (backtest). Nada de constante de receita.
 *
 * Método (interpretável, sem modelo opaco):
 *  - Receita ganha agregada por mês (últimos ORACLE_LOOKBACK_MONTHS meses encerrados).
 *  - Para o horizonte H (30/90/180 → 1/3/6 meses), soma em janelas móveis de H meses; P10/P50/P90
 *    são os percentis empíricos (interpolação linear) dessas janelas. expectedRevenue = P50.
 *  - Incerteza: amplitude relativa (P90−P10)/P50 → <0,5 LOW, <1 MEDIUM, senão HIGH.
 *
 * Mínimos explícitos (abaixo deles → `status: 'insufficient_data'` + valores null + motivo):
 */
export const ORACLE_LOOKBACK_MONTHS = 24;
/** Meses encerrados (desde o primeiro ganho) necessários para qualquer projeção. */
export const ORACLE_MIN_HISTORY_MONTHS = 6;
/** Negócios ganhos (com valor) necessários no lookback. */
export const ORACLE_MIN_CLOSED_WON_DEALS = 10;
/** Janelas móveis mínimas por horizonte para estimar percentis. */
export const ORACLE_MIN_WINDOWS_PER_HORIZON = 3;
/** Períodos encerrados com snapshot + realizado necessários para o backtest. */
export const ORACLE_MIN_BACKTEST_PERIODS = 3;
/** MAPE máximo (%) para declarar o modelo calibrado. */
export const ORACLE_CALIBRATED_MAX_MAPE = 15;

export interface OracleClosedWonDeal {
  amount: number;
  closedAt: Date;
}
export interface OracleOpenDeal {
  amount: number;
  probability: number | null;
  expectedCloseAt: Date | null;
}
export interface OracleForecastSnapshot {
  period: string; // YYYY-MM
  snapshotAt: Date;
  forecastAmount: number;
}

/** Porta de leitura — implementação Prisma em infra/PrismaOracleHistoryReader.ts. */
export interface OracleHistoryReader {
  listClosedWonDeals(organizationId: string, since: Date): Promise<OracleClosedWonDeal[]>;
  listOpenDeals(organizationId: string): Promise<OracleOpenDeal[]>;
  listForecastSnapshots(organizationId: string): Promise<OracleForecastSnapshot[]>;
}

const HORIZON_MONTHS: Record<RevenueHorizonDays, number> = { 30: 1, 90: 3, 180: 6 };

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function addMonthsUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

interface MonthlyHistory {
  /** Meses encerrados em ordem cronológica, do primeiro mês com ganho até o mês anterior a `now`. */
  months: Array<{ key: string; revenue: number; deals: number }>;
  dealsCount: number;
  insufficientReason: string | null;
}

export class PredictiveRevenueOracleService implements IPredictiveRevenueOraclePort {
  private readonly readerFactory: () => Promise<OracleHistoryReader>;
  private readonly now: () => Date;

  constructor(deps?: { reader?: OracleHistoryReader; now?: () => Date }) {
    const injected = deps?.reader;
    this.readerFactory = injected
      ? async () => injected
      : async () => {
          const mod = await import('../infra/PrismaOracleHistoryReader.js');
          return new mod.PrismaOracleHistoryReader();
        };
    this.now = deps?.now ?? (() => new Date());
  }

  private assertTenant(organizationId: string): void {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para o Revenue Oracle');
    }
  }

  private async loadMonthlyHistory(organizationId: string): Promise<MonthlyHistory> {
    const reader = await this.readerFactory();
    const now = this.now();
    const currentMonthStart = addMonthsUTC(now, 0);
    const since = addMonthsUTC(now, -ORACLE_LOOKBACK_MONTHS);
    const deals = (await reader.listClosedWonDeals(organizationId, since)).filter(
      (d) => d.amount > 0 && d.closedAt >= since && d.closedAt < currentMonthStart,
    );
    const byMonth = new Map<string, { revenue: number; deals: number }>();
    for (const d of deals) {
      const k = monthKey(d.closedAt);
      const cur = byMonth.get(k) ?? { revenue: 0, deals: 0 };
      cur.revenue += d.amount;
      cur.deals += 1;
      byMonth.set(k, cur);
    }
    const months: MonthlyHistory['months'] = [];
    if (deals.length > 0) {
      const first = deals.reduce((a, b) => (a.closedAt < b.closedAt ? a : b)).closedAt;
      for (let m = addMonthsUTC(first, 0); m < currentMonthStart; m = addMonthsUTC(m, 1)) {
        const k = monthKey(m);
        const v = byMonth.get(k) ?? { revenue: 0, deals: 0 };
        months.push({ key: k, ...v });
      }
    }
    let insufficientReason: string | null = null;
    if (deals.length < ORACLE_MIN_CLOSED_WON_DEALS) {
      insufficientReason = `Histórico insuficiente: ${deals.length} negócio(s) ganho(s) com valor nos últimos ${ORACLE_LOOKBACK_MONTHS} meses (mínimo ${ORACLE_MIN_CLOSED_WON_DEALS}).`;
    } else if (months.length < ORACLE_MIN_HISTORY_MONTHS) {
      insufficientReason = `Histórico insuficiente: ${months.length} mês(es) encerrado(s) de histórico de ganhos (mínimo ${ORACLE_MIN_HISTORY_MONTHS}).`;
    }
    return { months, dealsCount: deals.length, insufficientReason };
  }

  private buildHorizon(
    horizonDays: RevenueHorizonDays,
    history: MonthlyHistory,
    openDeals: OracleOpenDeal[],
  ): ProjectedRevenueHorizon {
    const now = this.now();
    const horizonEnd = new Date(now.getTime() + horizonDays * 86_400_000);
    const pipelineWeightedAmount = round(
      openDeals
        .filter(
          (d) => d.expectedCloseAt && d.expectedCloseAt >= now && d.expectedCloseAt <= horizonEnd,
        )
        .reduce((s, d) => s + d.amount * ((d.probability ?? 0) / 100), 0),
    );
    const empty = (reason: string, windows: number): ProjectedRevenueHorizon => ({
      horizonDays,
      status: 'insufficient_data',
      insufficientDataReason: reason,
      sampleWindows: windows,
      expectedRevenue: null,
      confidenceInterval: null,
      pipelineWeightedAmount,
      projectedWonDealsCount: null,
      keyDrivers: [],
      uncertaintyDegree: null,
    });
    if (history.insufficientReason) return empty(history.insufficientReason, 0);

    const span = HORIZON_MONTHS[horizonDays];
    const revenues: number[] = [];
    const counts: number[] = [];
    for (let i = 0; i + span <= history.months.length; i++) {
      const slice = history.months.slice(i, i + span);
      revenues.push(slice.reduce((s, m) => s + m.revenue, 0));
      counts.push(slice.reduce((s, m) => s + m.deals, 0));
    }
    if (revenues.length < ORACLE_MIN_WINDOWS_PER_HORIZON) {
      return empty(
        `Histórico insuficiente para ${horizonDays} dias: ${revenues.length} janela(s) de ${span} mês(es) (mínimo ${ORACLE_MIN_WINDOWS_PER_HORIZON}).`,
        revenues.length,
      );
    }
    const sorted = [...revenues].sort((a, b) => a - b);
    const p10 = round(percentile(sorted, 0.1));
    const p50 = round(percentile(sorted, 0.5));
    const p90 = round(percentile(sorted, 0.9));
    const width = p50 > 0 ? (p90 - p10) / p50 : Number.POSITIVE_INFINITY;
    const sortedCounts = [...counts].sort((a, b) => a - b);
    return {
      horizonDays,
      status: 'ok',
      insufficientDataReason: null,
      sampleWindows: revenues.length,
      expectedRevenue: p50,
      confidenceInterval: { p10, p50, p90 },
      pipelineWeightedAmount,
      projectedWonDealsCount: Math.round(percentile(sortedCounts, 0.5)),
      keyDrivers: [
        `Percentis empíricos de ${revenues.length} janela(s) de ${span} mês(es) de receita ganha real`,
        `${history.dealsCount} negócio(s) ganho(s) nos últimos ${ORACLE_LOOKBACK_MONTHS} meses`,
      ],
      uncertaintyDegree: width < 0.5 ? 'LOW' : width < 1 ? 'MEDIUM' : 'HIGH',
    };
  }

  async getCockpitData(organizationId: string): Promise<ExecutiveRevenueCockpit> {
    this.assertTenant(organizationId);
    const reader = await this.readerFactory();
    const now = this.now();
    const history = await this.loadMonthlyHistory(organizationId);
    const openDeals = await reader.listOpenDeals(organizationId);
    const monthStart = addMonthsUTC(now, 0);
    const currentMonthWon = (await reader.listClosedWonDeals(organizationId, monthStart))
      .filter((d) => d.closedAt >= monthStart && d.closedAt <= now)
      .reduce((s, d) => s + (d.amount > 0 ? d.amount : 0), 0);

    const days30 = this.buildHorizon(30, history, openDeals);
    const days90 = this.buildHorizon(90, history, openDeals);
    const days180 = this.buildHorizon(180, history, openDeals);
    const weightedPipelineRevenue = round(
      openDeals.reduce((s, d) => s + d.amount * ((d.probability ?? 0) / 100), 0),
    );
    const backtest = await this.getBacktestMetrics(organizationId);
    const status = days30.status === 'ok' ? 'ok' : 'insufficient_data';

    if (status === 'ok') {
      await domainEventMesh.publish({
        eventType: 'REVENUE_FORECAST_PROJECTED',
        eventVersion: '1.0.0',
        organizationId,
        correlationId: `fc-exec-${Date.now()}`,
        producer: 'predictive-revenue-oracle-service',
        aggregateId: organizationId,
        payload: {
          horizon30DaysRevenue: days30.expectedRevenue,
          horizon90DaysRevenue: days90.expectedRevenue,
          modelConfidence: backtest.isModelCalibrated ? 'CALIBRATED_PROJECTION' : 'ESTIMATED_ONLY',
        },
      });
    }

    return {
      organizationId,
      currentPeriod: monthKey(now),
      status,
      insufficientDataReason: days30.insufficientDataReason,
      currentQuota: null,
      closedWonRevenue: round(currentMonthWon),
      quotaAttainmentPercent: null,
      weightedPipelineRevenue,
      projections: { days30, days90, days180 },
      // Risco e gargalos reais vivem em /deals e /funnel-bottlenecks — não duplicar aqui.
      dealsAtRisk: [],
      mainFunnelBottlenecks: [],
      activeRecommendationsCount: 0,
      modelConfidence:
        status !== 'ok'
          ? 'INSUFFICIENT_DATA'
          : backtest.isModelCalibrated
            ? 'CALIBRATED_PROJECTION'
            : 'ESTIMATED_ONLY',
      lastCalculatedAt: now.toISOString(),
    };
  }

  /**
   * What-If sobre a linha de base REAL (P50 do horizonte). As elasticidades abaixo são premissas
   * declaradas do simulador (não dados) e só são aplicadas quando há linha de base real.
   */
  async runWhatIfSimulation(input: WhatIfSimulationInput): Promise<WhatIfSimulationResult> {
    this.assertTenant(input.organizationId);
    const simulationId = `sim-whatif-${randomUUID().substring(0, 8)}`;
    const simulatedAt = this.now().toISOString();
    const history = await this.loadMonthlyHistory(input.organizationId);
    const horizon = this.buildHorizon(input.horizonDays, history, []);
    const baselineRevenue = horizon.expectedRevenue;

    if (horizon.status !== 'ok' || baselineRevenue === null || baselineRevenue <= 0) {
      return {
        simulationId,
        organizationId: input.organizationId,
        name: input.name,
        status: 'insufficient_data',
        insufficientDataReason:
          horizon.insufficientDataReason ?? 'Linha de base de receita real igual a zero.',
        baselineRevenue: null,
        simulatedRevenue: null,
        netRevenueDelta: null,
        deltaPercent: null,
        impactBreakdown: null,
        simulatedAt,
      };
    }

    const prosDelta = (input.prospectingVolumeDeltaPercent ?? 0) / 100;
    const convDelta = (input.conversionRateDeltaPercent ?? 0) / 100;
    const cycleDeltaDays = input.salesCycleDeltaDays ?? 0;
    const ticketDelta = (input.avgTicketDeltaPercent ?? 0) / 100;
    const extraSellers = input.additionalSellersCount ?? 0;

    const prospectingImpact = baselineRevenue * (prosDelta * 0.65);
    const conversionImpact = baselineRevenue * (convDelta * 1.1);
    const cyclePenaltyRate =
      cycleDeltaDays > 0 ? (cycleDeltaDays / (input.horizonDays * 1.5)) * -0.3 : 0;
    const cycleImpact = baselineRevenue * cyclePenaltyRate;
    const ticketImpact = baselineRevenue * ticketDelta;
    const capacityImpact = extraSellers * (baselineRevenue * 0.12);
    const netRevenueDelta =
      prospectingImpact + conversionImpact + cycleImpact + ticketImpact + capacityImpact;
    const simulatedRevenue = Math.max(0, Math.round(baselineRevenue + netRevenueDelta));
    const deltaPercent = Math.round((netRevenueDelta / baselineRevenue) * 1000) / 10;

    await domainEventMesh.publish({
      eventType: 'WHAT_IF_SCENARIO_SIMULATED',
      eventVersion: '1.0.0',
      organizationId: input.organizationId,
      correlationId: `sim-evt-${simulationId}`,
      producer: 'predictive-revenue-oracle-service',
      aggregateId: input.organizationId,
      payload: { simulationId, baselineRevenue, simulatedRevenue, deltaPercent },
    });

    return {
      simulationId,
      organizationId: input.organizationId,
      name: input.name,
      status: 'ok',
      insufficientDataReason: null,
      baselineRevenue,
      simulatedRevenue,
      netRevenueDelta: Math.round(netRevenueDelta),
      deltaPercent,
      impactBreakdown: {
        prospectingImpact: Math.round(prospectingImpact),
        conversionImpact: Math.round(conversionImpact),
        cycleImpact: Math.round(cycleImpact),
        ticketImpact: Math.round(ticketImpact),
        capacityImpact: Math.round(capacityImpact),
      },
      simulatedAt,
    };
  }

  /**
   * Backtest real: snapshot MAIS ANTIGO de cada mês encerrado (`ForecastSnapshot.forecastAmount`)
   * contra a receita ganha real daquele mês. Mesmo critério de `forecastAccuracyReport.ts`.
   */
  async getBacktestMetrics(organizationId: string): Promise<BacktestValidationMetrics> {
    this.assertTenant(organizationId);
    const reader = await this.readerFactory();
    const now = this.now();
    const currentKey = monthKey(now);
    const snapshots = await reader.listForecastSnapshots(organizationId);
    const earliest = new Map<string, OracleForecastSnapshot>();
    for (const s of snapshots) {
      if (s.period >= currentKey) continue;
      const cur = earliest.get(s.period);
      if (!cur || s.snapshotAt < cur.snapshotAt) earliest.set(s.period, s);
    }
    const periods = [...earliest.keys()].sort();
    const since = periods.length
      ? new Date(`${periods[0]}-01T00:00:00.000Z`)
      : addMonthsUTC(now, -ORACLE_LOOKBACK_MONTHS);
    const won = await reader.listClosedWonDeals(organizationId, since);
    const actualByMonth = new Map<string, number>();
    for (const d of won) {
      if (d.amount <= 0) continue;
      const k = monthKey(d.closedAt);
      actualByMonth.set(k, (actualByMonth.get(k) ?? 0) + d.amount);
    }
    const pairs = [...earliest.values()]
      .map((snap) => ({
        forecast: snap.forecastAmount,
        actual: actualByMonth.get(snap.period) ?? 0,
      }))
      .filter((x) => x.actual > 0);
    const evaluationPeriod = periods.length
      ? `${periods[0]} a ${periods[periods.length - 1]} (snapshots reais de forecast)`
      : 'Sem snapshots de forecast persistidos';

    if (pairs.length < ORACLE_MIN_BACKTEST_PERIODS) {
      return {
        evaluationPeriod,
        samplesEvaluated: pairs.length,
        meanAbsoluteError: null,
        meanAbsolutePercentageError: null,
        predictionBias: null,
        calibrationScore: null,
        predictionIntervalCoveragePercent: null,
        isModelCalibrated: false,
        status: 'INSUFFICIENT_DATA',
        insufficientDataReason: `Backtest exige ${ORACLE_MIN_BACKTEST_PERIODS} mês(es) encerrado(s) com snapshot de forecast e receita realizada; há ${pairs.length}.`,
      };
    }
    const n = pairs.length;
    const mae = pairs.reduce((s, x) => s + Math.abs(x.forecast - x.actual), 0) / n;
    const mape =
      (pairs.reduce((s, x) => s + Math.abs(x.forecast - x.actual) / x.actual, 0) / n) * 100;
    const bias = (pairs.reduce((s, x) => s + (x.forecast - x.actual) / x.actual, 0) / n) * 100;
    const isModelCalibrated = mape <= ORACLE_CALIBRATED_MAX_MAPE;
    return {
      evaluationPeriod,
      samplesEvaluated: n,
      meanAbsoluteError: round(mae),
      meanAbsolutePercentageError: round(mape),
      predictionBias: round(bias),
      calibrationScore: round(Math.max(0, 1 - mape / 100)),
      predictionIntervalCoveragePercent: null,
      isModelCalibrated,
      status: isModelCalibrated ? 'CALIBRATED' : 'UNCALIBRATED_ESTIMATE_ONLY',
      insufficientDataReason: null,
    };
  }

  /**
   * Não existe motor real de recomendação de redistribuição no backend: devolver lista vazia em
   * vez de contas/vendedores inventados. A aprovação humana de uma proposta (gerada pela UI/gestor)
   * é persistida por `RebalanceApprovalService` (REMED-04).
   */
  async generateAccountAllocationRecommendations(params: {
    organizationId: string;
    limit?: number;
  }): Promise<AccountAllocationRecommendation[]> {
    this.assertTenant(params.organizationId);
    return [];
  }

  /** Mantido por compatibilidade com testes antigos — não há estado em memória. */
  clear(): void {}
}

export const predictiveRevenueOracleService = new PredictiveRevenueOracleService();
