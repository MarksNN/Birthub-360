import type { RebalanceApprovalRecord } from './predictiveRevenueOracle.contract.js';

/**
 * Portas (interfaces) do Revenue Oracle e da aprovação de rebalanceamento (REMED-03/04).
 * Ficam em contrato para que a infra (Prisma*) não importe os services — evita ciclos
 * `no-circular` (services → infra via import dinâmico; infra → contrato).
 */

export const REBALANCE_APPROVAL_ENTITY = 'RebalanceApproval';
export const REBALANCE_APPROVAL_ACTION = 'REBALANCE_DECISION';

export interface RebalanceApprovalStore {
  /** Lead do funil Negócio DESTE tenant (owner atual) ou null se não existe. */
  findLead(organizationId: string, leadId: string): Promise<{ owner: string | null } | null>;
  /** true se `userId` é um `User.id` DESTE tenant (owner válido para receber a carteira). */
  ownerIsOrgUser(organizationId: string, userId: string): Promise<boolean>;
  /** Decisão MAIS RECENTE para o recommendationId neste tenant (ou null). */
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

// --- Recomendações de rebalanceamento (rebalanceRecommendation.service.ts) ---------------------

/**
 * Validade de uma decisão: só conta enquanto (a) o recommendationId é o mesmo — o hash cobre
 * tenant|leadId|fromOwner|toOwner, então qualquer troca de owner do lead gera outro id — e
 * (b) foi tomada há no máximo REBALANCE_DECISION_TTL_DAYS dias. Depois disso a recomendação volta
 * a PENDING_HUMAN_REVIEW e um novo POST grava nova decisão (não conflita com a expirada).
 */
export const REBALANCE_DECISION_TTL_DAYS = 30;

export interface RebalanceOpenDeal {
  leadId: string;
  title: string | null;
  owner: string | null;
  companyId: string | null;
  companyName: string | null;
  amount: number | null;
  createdAt: Date;
}
export interface RebalanceClosedDeal {
  owner: string | null;
  closedAt: Date;
}
export interface RebalanceOrgUser {
  id: string;
  name: string;
}

/** Porta de leitura tenant-scoped — implementação em infra/PrismaRebalanceRecommendationReader.ts. */
export interface RebalanceRecommendationReader {
  listOpenDeals(organizationId: string): Promise<RebalanceOpenDeal[]>;
  /** Ganhos + perdidos com closedAt ≥ since. */
  listClosedDeals(organizationId: string, since: Date): Promise<RebalanceClosedDeal[]>;
  listOrgUsers(organizationId: string): Promise<RebalanceOrgUser[]>;
  /** Decisão MAIS RECENTE por recommendationId (registros corrompidos são ignorados). */
  listDecisions(
    organizationId: string,
    recommendationIds: string[],
  ): Promise<RebalanceApprovalRecord[]>;
}

// --- What-If V2 (whatIfSimulation.service.ts) --------------------------------------------------

export interface WhatIfClosedDeal {
  won: boolean;
  amount: number;
  closedAt: Date;
}
/** Porta de leitura — implementação em infra/PrismaWhatIfBaselineReader.ts. */
export interface WhatIfBaselineReader {
  /** Negócios encerrados (ganhos e perdidos) do funil Negócio com closedAt ≥ since. */
  listClosedDeals(organizationId: string, since: Date): Promise<WhatIfClosedDeal[]>;
}
