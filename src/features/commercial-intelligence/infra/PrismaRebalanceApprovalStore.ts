import { LeadFunnel } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import type { RebalanceApprovalRecord } from '../../../shared/contracts/predictiveRevenueOracle.contract.js';
import {
  REBALANCE_APPROVAL_ACTION,
  REBALANCE_APPROVAL_ENTITY,
  type RebalanceApprovalStore,
} from '../../../shared/contracts/predictiveRevenueOraclePorts.contract.js';

/** Persistência via `AuditLog` (sem migration) — sempre filtrado por tenantId = organizationId. */
export class PrismaRebalanceApprovalStore implements RebalanceApprovalStore {
  async leadExists(organizationId: string, leadId: string): Promise<boolean> {
    const n = await prisma.lead.count({
      where: { id: leadId, organizationId, funnel: LeadFunnel.Negocio },
    });
    return n > 0;
  }

  async findByRecommendation(
    organizationId: string,
    recommendationId: string,
  ): Promise<RebalanceApprovalRecord | null> {
    const row = await prisma.auditLog.findFirst({
      where: {
        tenantId: organizationId,
        entity: REBALANCE_APPROVAL_ENTITY,
        action: REBALANCE_APPROVAL_ACTION,
        entityId: recommendationId,
      },
      orderBy: { timestamp: 'asc' },
    });
    if (!row?.details) return null;
    return JSON.parse(row.details) as RebalanceApprovalRecord;
  }

  async save(record: RebalanceApprovalRecord, ipAddress?: string): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: REBALANCE_APPROVAL_ACTION,
        entity: REBALANCE_APPROVAL_ENTITY,
        entityId: record.recommendationId,
        actorId: record.decidedBy,
        tenantId: record.organizationId,
        ipAddress,
        details: JSON.stringify(record),
      },
    });
  }
}
