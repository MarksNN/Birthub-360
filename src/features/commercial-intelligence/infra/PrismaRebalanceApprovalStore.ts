import { LeadFunnel } from '@prisma/client';
import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';
import type { RebalanceApprovalRecord } from '../../../shared/contracts/predictiveRevenueOracle.contract.js';
import {
  REBALANCE_APPROVAL_ACTION,
  REBALANCE_APPROVAL_ENTITY,
  type RebalanceApprovalStore,
} from '../../../shared/contracts/predictiveRevenueOraclePorts.contract.js';

import { parseApprovalRecord } from './PrismaRebalanceRecommendationReader.js';

/** Persistência via `AuditLog` (sem migration) — sempre filtrado por tenantId = organizationId. */
export class PrismaRebalanceApprovalStore implements RebalanceApprovalStore {
  async findLead(organizationId: string, leadId: string): Promise<{ owner: string | null } | null> {
    return prisma.lead.findFirst({
      where: { id: leadId, organizationId, funnel: LeadFunnel.Negocio },
      select: { owner: true },
    });
  }

  async ownerIsOrgUser(organizationId: string, userId: string): Promise<boolean> {
    const n = await prisma.user.count({ where: { id: userId, organizationId } });
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
      orderBy: { timestamp: 'desc' },
    });
    if (!row) return null;
    const rec = parseApprovalRecord(row.details);
    if (!rec) {
      logger.warn(
        { auditLogId: row.id, entityId: recommendationId, organizationId },
        'Rebalance: registro de decisão corrompido no AuditLog — tratado como inexistente',
      );
    }
    return rec;
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
