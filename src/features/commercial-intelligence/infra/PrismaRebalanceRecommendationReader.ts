import { LeadFunnel } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import type { RebalanceApprovalRecord } from '../../../shared/contracts/predictiveRevenueOracle.contract.js';
import {
  REBALANCE_APPROVAL_ACTION,
  REBALANCE_APPROVAL_ENTITY,
} from '../services/rebalanceApproval.service.js';
import type {
  RebalanceClosedDeal,
  RebalanceOpenDeal,
  RebalanceOrgUser,
  RebalanceRecommendationReader,
} from '../services/rebalanceRecommendation.service.js';
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
      orderBy: { timestamp: 'asc' },
    });
    const first = new Map<string, RebalanceApprovalRecord>();
    for (const r of rows) {
      if (!r.details || !r.entityId || first.has(r.entityId)) continue;
      first.set(r.entityId, JSON.parse(r.details) as RebalanceApprovalRecord);
    }
    return [...first.values()];
  }
}
