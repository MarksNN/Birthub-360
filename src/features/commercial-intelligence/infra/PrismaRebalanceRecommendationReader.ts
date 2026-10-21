import { LeadFunnel } from '@prisma/client';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import type { RebalanceApprovalRecord } from '../../../shared/contracts/predictiveRevenueOracle.contract.js';
import {
  REBALANCE_APPROVAL_ACTION,
  REBALANCE_APPROVAL_ENTITY,
  type RebalanceClosedDeal,
  type RebalanceOpenDeal,
  type RebalanceOrgUser,
  type RebalanceRecommendationReader,
} from '../../../shared/contracts/predictiveRevenueOraclePorts.contract.js';
import { isLost, isWon } from './PrismaOracleHistoryReader.js';

/** Leitura tenant-scoped (sempre `organizationId`/`tenantId`) para o rebalanceamento. */
export class PrismaRebalanceRecommendationReader implements RebalanceRecommendationReader {
  async listOpenDeals(organizationId: string): Promise<RebalanceOpenDeal[]> {
    const rows = await prisma.lead.findMany({
      where: { organizationId, funnel: LeadFunnel.Negocio, closedAt: null },
      select: {
        id: true,
        title: true,
        owner: true,
        amount: true,
        createdAt: true,
        status: true,
        companyId: true,
        company: { select: { tradeName: true, legalName: true } },
        pipelineStage: { select: { isWon: true, isLost: true } },
      },
    });
    return rows
      .filter((r) => !isWon(r) && !isLost(r))
      .map((r) => ({
        leadId: r.id,
        title: r.title,
        owner: r.owner,
        companyId: r.companyId,
        companyName: r.company ? r.company.tradeName || r.company.legalName : null,
        amount: r.amount,
        createdAt: r.createdAt,
      }));
  }

  async listClosedDeals(organizationId: string, since: Date): Promise<RebalanceClosedDeal[]> {
    const rows = await prisma.lead.findMany({
      where: { organizationId, funnel: LeadFunnel.Negocio, closedAt: { gte: since } },
      select: {
        owner: true,
        closedAt: true,
        status: true,
        pipelineStage: { select: { isWon: true, isLost: true } },
      },
    });
    return rows
      .filter((r) => r.closedAt !== null && (isWon(r) || isLost(r)))
      .map((r) => ({ owner: r.owner, closedAt: r.closedAt as Date }));
  }

  async listOrgUsers(organizationId: string): Promise<RebalanceOrgUser[]> {
    return prisma.user.findMany({ where: { organizationId }, select: { id: true, name: true } });
  }

  async listDecisions(
    organizationId: string,
    recommendationIds: string[],
  ): Promise<RebalanceApprovalRecord[]> {
    const rows = await prisma.auditLog.findMany({
      where: {
        tenantId: organizationId,
        entity: REBALANCE_APPROVAL_ENTITY,
        action: REBALANCE_APPROVAL_ACTION,
        entityId: { in: recommendationIds },
      },
      orderBy: { timestamp: 'desc' },
    });
    const latest = new Map<string, RebalanceApprovalRecord>();
    for (const r of rows) {
      if (!r.entityId || latest.has(r.entityId)) continue;
      const rec = parseApprovalRecord(r.details);
      if (!rec) {
        logger.warn(
          { auditLogId: r.id, entityId: r.entityId, organizationId },
          'Rebalance: registro de decisão corrompido no AuditLog — ignorado',
        );
        continue;
      }
      latest.set(r.entityId, rec);
    }
    return [...latest.values()];
  }
}

/** JSON.parse defensivo: null se vazio, inválido ou sem os campos mínimos. */
export function parseApprovalRecord(details: string | null): RebalanceApprovalRecord | null {
  if (!details) return null;
  try {
    const v = JSON.parse(details) as Partial<RebalanceApprovalRecord> | null;
    if (!v || typeof v !== 'object' || typeof v.recommendationId !== 'string') return null;
    if (v.decision !== 'APPROVED' && v.decision !== 'REJECTED') return null;
    if (typeof v.decidedAt !== 'string') return null;
    return v as RebalanceApprovalRecord;
  } catch {
    return null;
  }
}
