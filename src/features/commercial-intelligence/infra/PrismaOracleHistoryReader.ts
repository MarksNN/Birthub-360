import { LeadFunnel, LeadStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import type {
  OracleClosedWonDeal,
  OracleForecastSnapshot,
  OracleHistoryReader,
  OracleOpenDeal,
} from '../services/predictiveRevenueOracle.service.js';

// Mesma regra de ganho/perdido de PrismaCommercialIntelligenceRepository.findDeals:
// `CrmPipelineStage.isWon/isLost` quando há etapa; senão o fallback por status.
const FALLBACK_WON_STATUSES = new Set<LeadStatus>([LeadStatus.Negocios_Ganhos]);
const FALLBACK_LOST_STATUSES = new Set<LeadStatus>([
  LeadStatus.Negocios_Perdidos,
  LeadStatus.Piloto_Birthub360_Profile_Cancelado,
  LeadStatus.Piloto_Logistico_Cancelado,
]);

type Row = {
  amount: number | null;
  status: LeadStatus;
  closedAt: Date | null;
  probability: number | null;
  expectedCloseAt: Date | null;
  pipelineStage: { isWon: boolean; isLost: boolean } | null;
};

function isWon(r: Row): boolean {
  return r.pipelineStage ? r.pipelineStage.isWon : FALLBACK_WON_STATUSES.has(r.status);
}
function isLost(r: Row): boolean {
  return r.pipelineStage ? r.pipelineStage.isLost : FALLBACK_LOST_STATUSES.has(r.status);
}

const SELECT = {
  amount: true,
  status: true,
  closedAt: true,
  probability: true,
  expectedCloseAt: true,
  pipelineStage: { select: { isWon: true, isLost: true } },
} as const;

/** Leitura tenant-scoped (sempre `organizationId`) do funil Negócio para o Revenue Oracle. */
export class PrismaOracleHistoryReader implements OracleHistoryReader {
  async listClosedWonDeals(organizationId: string, since: Date): Promise<OracleClosedWonDeal[]> {
    const rows: Row[] = await prisma.lead.findMany({
      where: { organizationId, funnel: LeadFunnel.Negocio, closedAt: { gte: since } },
      select: SELECT,
    });
    return rows
      .filter((r) => r.closedAt !== null && isWon(r))
      .map((r) => ({ amount: r.amount ?? 0, closedAt: r.closedAt as Date }));
  }

  async listOpenDeals(organizationId: string): Promise<OracleOpenDeal[]> {
    const rows: Row[] = await prisma.lead.findMany({
      where: { organizationId, funnel: LeadFunnel.Negocio, closedAt: null },
      select: SELECT,
    });
    return rows
      .filter((r) => !isWon(r) && !isLost(r))
      .map((r) => ({
        amount: r.amount ?? 0,
        probability: r.probability,
        expectedCloseAt: r.expectedCloseAt,
      }));
  }

  async listForecastSnapshots(organizationId: string): Promise<OracleForecastSnapshot[]> {
    const rows = await prisma.forecastSnapshot.findMany({
      where: { organizationId },
      select: { period: true, snapshotAt: true, forecastAmount: true },
    });
    return rows.map((r) => ({
      period: r.period,
      snapshotAt: r.snapshotAt,
      forecastAmount: Number(r.forecastAmount),
    }));
  }
}
