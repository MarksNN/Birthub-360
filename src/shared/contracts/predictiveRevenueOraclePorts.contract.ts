import type { RebalanceApprovalRecord } from './predictiveRevenueOracle.contract.js';

/**
 * Portas (interfaces) do Revenue Oracle e da aprovação de rebalanceamento (REMED-03/04).
 * Ficam em contrato para que a infra (Prisma*) não importe os services — evita ciclos
 * `no-circular` (services → infra via import dinâmico; infra → contrato).
 */

export const REBALANCE_APPROVAL_ENTITY = 'RebalanceApproval';
export const REBALANCE_APPROVAL_ACTION = 'REBALANCE_DECISION';

export interface RebalanceApprovalStore {
  /** true se o lead existe no funil Negócio DESTE tenant. */
  leadExists(organizationId: string, leadId: string): Promise<boolean>;
  findByRecommendation(
    organizationId: string,
    recommendationId: string,
  ): Promise<RebalanceApprovalRecord | null>;
  /** Grava o registro + trilha de auditoria (mesma linha de AuditLog). */
  save(record: RebalanceApprovalRecord, ipAddress?: string): Promise<void>;
}

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

/** Porta de leitura — implementação Prisma em features/commercial-intelligence/infra/PrismaOracleHistoryReader.ts. */
export interface OracleHistoryReader {
  listClosedWonDeals(organizationId: string, since: Date): Promise<OracleClosedWonDeal[]>;
  listOpenDeals(organizationId: string): Promise<OracleOpenDeal[]>;
  listForecastSnapshots(organizationId: string): Promise<OracleForecastSnapshot[]>;
}
