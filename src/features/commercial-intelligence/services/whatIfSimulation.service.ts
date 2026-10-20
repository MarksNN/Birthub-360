import { z } from 'zod';
import type {
  ProjectedRevenueHorizonV2,
  RevenueHorizonDays,
  WhatIfBaselineV2,
  WhatIfLeversV2,
  WhatIfRequestV2,
  WhatIfResultV2,
} from '../../../shared/contracts/predictiveRevenueOracle.contract.js';
import {
  ORACLE_LOOKBACK_MONTHS,
  ORACLE_MIN_CLOSED_WON_DEALS,
  predictiveRevenueOracleService,
} from './predictiveRevenueOracle.service.js';

/**
 * What-If V2 — simulação determinística sobre a linha de base REAL do tenant.
 *
 * Identidade usada (sem elasticidade nem multiplicador oculto):
 *   receita = volumeEncerrado × winRate × ticketMédio
 *   simulada = baseline.revenue × fVolume × fWinRate × fTicket
 *   fVolume = 1 + pipelineVolumeDeltaPercent/100
 *   fWinRate = (winRate + winRateDeltaPp/100) / winRate
 *   fTicket = 1 + avgTicketDeltaPercent/100
 * baseline.revenue = P50 do Oracle para o horizonte; winRate e ticket = lookback do Oracle.
 */
export const WHATIF_MIN_CLOSED_DEALS = ORACLE_MIN_CLOSED_WON_DEALS;

export const whatIfRequestSchema = z
  .object({
    horizonDays: z.union([z.literal(30), z.literal(90), z.literal(180)]),
    name: z.string().trim().min(1).max(120).optional(),
    levers: z
      .object({
        pipelineVolumeDeltaPercent: z.number().finite().min(-100).max(500).optional(),
        winRateDeltaPp: z.number().finite().min(-100).max(100).optional(),
        avgTicketDeltaPercent: z.number().finite().min(-100).max(500).optional(),
      })
      .strict(),
  })
  .strict();

export interface WhatIfClosedDeal {
  won: boolean;
  amount: number;
  closedAt: Date;
}
/** Porta de leitura — implementação Prisma em infra/PrismaWhatIfBaselineReader.ts. */
export interface WhatIfBaselineReader {
  /** Negócios encerrados (ganhos e perdidos) do funil Negócio com closedAt ≥ since. */
  listClosedDeals(organizationId: string, since: Date): Promise<WhatIfClosedDeal[]>;
}
export interface RevenueBaselinePort {
  getRevenueBaseline(org: string, h: RevenueHorizonDays): Promise<ProjectedRevenueHorizonV2>;
}

export class WhatIfInputError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
  }
}

const FORMULA =
  'simulada = baseline.revenue × (1 + pipelineVolumeDeltaPercent/100) × ((winRate + winRateDeltaPp/100) / winRate) × (1 + avgTicketDeltaPercent/100)';
const ASSUMPTIONS = [
  'receita = volume de negócios encerrados × taxa de ganho × ticket médio (identidade, não modelo).',
  'baseline.revenue = P50 do Revenue Oracle no horizonte (janelas móveis de receita ganha real).',
  `winRate e ticket médio = negócios encerrados do funil Negócio nos últimos ${ORACLE_LOOKBACK_MONTHS} meses.`,
  'Alavancas independentes e aplicadas integralmente no horizonte; sem elasticidade, defasagem ou efeito de ciclo.',
  'breakdown sequencial: volume → winRate → ticket (a ordem altera a atribuição, não o total).',
];
const round2 = (n: number) => Math.round(n * 100) / 100;

export class WhatIfSimulationService {
  private readonly readerFactory: () => Promise<WhatIfBaselineReader>;
  private readonly oracle: RevenueBaselinePort;
  private readonly now: () => Date;

  constructor(deps?: {
    reader?: WhatIfBaselineReader;
    oracle?: RevenueBaselinePort;
    now?: () => Date;
  }) {
    const injected = deps?.reader;
    this.readerFactory = injected
      ? async () => injected
      : async () => {
          const mod = await import('../infra/PrismaWhatIfBaselineReader.js');
          return new mod.PrismaWhatIfBaselineReader();
        };
    this.oracle = deps?.oracle ?? predictiveRevenueOracleService;
    this.now = deps?.now ?? (() => new Date());
  }

  async simulate(organizationId: string, input: WhatIfRequestV2): Promise<WhatIfResultV2> {
    if (!organizationId) throw new Error('Tenancy violation: organizationId obrigatório');
    const now = this.now();
    const levers: WhatIfLeversV2 = {
      pipelineVolumeDeltaPercent: input.levers.pipelineVolumeDeltaPercent ?? 0,
      winRateDeltaPp: input.levers.winRateDeltaPp ?? 0,
      avgTicketDeltaPercent: input.levers.avgTicketDeltaPercent ?? 0,
    };
    const shell = {
      name: input.name ?? null,
      horizonDays: input.horizonDays,
      levers,
      formula: FORMULA,
      assumptions: ASSUMPTIONS,
      simulatedAt: now.toISOString(),
    };
    const insufficient = (reason: string): WhatIfResultV2 => ({
      ...shell,
      status: 'insufficient_data',
      insufficientDataReason: reason,
      baseline: null,
      result: null,
    });

    const horizon = await this.oracle.getRevenueBaseline(organizationId, input.horizonDays);
    if (
      horizon.status !== 'ok' ||
      horizon.expectedRevenue === null ||
      horizon.expectedRevenue <= 0
    ) {
      return insufficient(
        horizon.insufficientDataReason ?? 'Linha de base de receita real igual a zero.',
      );
    }
    const since = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - ORACLE_LOOKBACK_MONTHS, 1),
    );
    const closed = (
      await (await this.readerFactory()).listClosedDeals(organizationId, since)
    ).filter((d) => d.closedAt >= since && d.closedAt <= now);
    const won = closed.filter((d) => d.won && d.amount > 0);
    if (closed.length < WHATIF_MIN_CLOSED_DEALS || won.length === 0) {
      return insufficient(
        `What-If exige ${WHATIF_MIN_CLOSED_DEALS} negócios encerrados (ganhos+perdidos) nos últimos ${ORACLE_LOOKBACK_MONTHS} meses, com ao menos 1 ganho; há ${closed.length} encerrados e ${won.length} ganhos.`,
      );
    }
    const winRate = won.length / closed.length;
    const avgTicket = won.reduce((s, d) => s + d.amount, 0) / won.length;
    const simulatedWinRate = winRate + levers.winRateDeltaPp / 100;
    if (simulatedWinRate < 0 || simulatedWinRate > 1) {
      throw new WhatIfInputError(
        `winRateDeltaPp leva a taxa de ganho para ${round2(simulatedWinRate * 100)}% (base ${round2(winRate * 100)}%); deve ficar entre 0 e 100%.`,
        'levers.winRateDeltaPp',
      );
    }
    const baseline: WhatIfBaselineV2 = {
      revenue: horizon.expectedRevenue,
      closedDeals: closed.length,
      wonDeals: won.length,
      winRate: round2(winRate * 100) / 100,
      avgTicket: round2(avgTicket),
      lookbackMonths: ORACLE_LOOKBACK_MONTHS,
      sampleWindows: horizon.sampleWindows,
    };
    const fV = 1 + levers.pipelineVolumeDeltaPercent / 100;
    const fW = simulatedWinRate / winRate;
    const fT = 1 + levers.avgTicketDeltaPercent / 100;
    const b = baseline.revenue;
    const afterV = b * fV;
    const afterW = afterV * fW;
    const simulated = afterW * fT;
    const volumeImpact = round2(afterV - b);
    const winRateImpact = round2(afterW - afterV);
    const net = round2(simulated - b);
    return {
      ...shell,
      status: 'ok',
      insufficientDataReason: null,
      baseline,
      result: {
        simulatedRevenue: round2(simulated),
        netRevenueDelta: net,
        deltaPercent: round2((net / b) * 100),
        factors: {
          volume: round2(fV * 1e4) / 1e4,
          winRate: round2(fW * 1e4) / 1e4,
          ticket: round2(fT * 1e4) / 1e4,
        },
        simulatedWinRate: round2(simulatedWinRate * 1e4) / 1e4,
        simulatedAvgTicket: round2(avgTicket * fT),
        breakdown: {
          volumeImpact,
          winRateImpact,
          ticketImpact: round2(net - volumeImpact - winRateImpact),
        },
      },
    };
  }
}

export const whatIfSimulationService = new WhatIfSimulationService();
