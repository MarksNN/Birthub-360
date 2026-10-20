import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type {
  RebalanceApprovalRecord,
  RebalanceApprovalRequest,
  RebalanceApprovalResponse,
} from '../../../shared/contracts/predictiveRevenueOracle.contract.js';
import {
  REBALANCE_APPROVAL_ACTION,
  REBALANCE_APPROVAL_ENTITY,
  type RebalanceApprovalStore,
} from '../../../shared/contracts/predictiveRevenueOraclePorts.contract.js';

export type { RebalanceApprovalStore };
/**
 * REMED-04 — aprovação humana de rebalanceamento de carteira.
 *
 * Persistência: `AuditLog` existente (entity `REBALANCE_APPROVAL_ENTITY`, entityId =
 * recommendationId, tenantId = organizationId, details = JSON do registro). Não exige migration.
 * Idempotência: (tenant, recommendationId). Mesma decisão/payload → replay 200 sem nova escrita;
 * payload/decisão divergente → 409. Limite conhecido: sem UNIQUE no banco, duas requisições
 * simultâneas podem gravar 2 linhas — ver handoff 04→01 (model dedicado com @@unique).
 */
export { REBALANCE_APPROVAL_ACTION, REBALANCE_APPROVAL_ENTITY };

export const rebalanceApprovalRequestSchema = z
  .object({
    recommendationId: z.string().trim().min(1).max(128),
    leadId: z.string().trim().min(1).max(64),
    fromOwner: z.string().trim().min(1).max(200).nullable(),
    toOwner: z.string().trim().min(1).max(200),
    decision: z.enum(['APPROVED', 'REJECTED']),
    note: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((v) => v.fromOwner !== v.toOwner, {
    message: 'toOwner deve ser diferente de fromOwner',
    path: ['toOwner'],
  });

export class RebalanceApprovalError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'CONFLICT' | 'INVALID_OWNER',
    message: string,
    public readonly existing?: RebalanceApprovalRecord,
  ) {
    super(message);
  }
}

function samePayload(a: RebalanceApprovalRequest, b: RebalanceApprovalRequest): boolean {
  return (
    a.leadId === b.leadId &&
    a.fromOwner === b.fromOwner &&
    a.toOwner === b.toOwner &&
    a.decision === b.decision
  );
}

export class RebalanceApprovalService {
  private readonly storeFactory: () => Promise<RebalanceApprovalStore>;
  constructor(deps?: { store?: RebalanceApprovalStore; now?: () => Date }) {
    const injected = deps?.store;
    this.storeFactory = injected
      ? async () => injected
      : async () => {
          const mod = await import('../infra/PrismaRebalanceApprovalStore.js');
          return new mod.PrismaRebalanceApprovalStore();
        };
    this.now = deps?.now ?? (() => new Date());
  }
  private readonly now: () => Date;

  async decide(params: {
    organizationId: string;
    decidedBy: string;
    input: RebalanceApprovalRequest;
    ipAddress?: string;
  }): Promise<RebalanceApprovalResponse> {
    const { organizationId, decidedBy, input } = params;
    if (!organizationId) throw new Error('Tenancy violation: organizationId obrigatório');
    const store = await this.storeFactory();

    const existing = await store.findByRecommendation(organizationId, input.recommendationId);
    if (existing) {
      if (samePayload(existing, input)) return { approval: existing, alreadyRecorded: true };
      throw new RebalanceApprovalError(
        'CONFLICT',
        `Recomendação ${input.recommendationId} já tem decisão ${existing.decision} registrada com outro conteúdo.`,
        existing,
      );
    }
    if (!(await store.leadExists(organizationId, input.leadId))) {
      throw new RebalanceApprovalError('NOT_FOUND', 'Negócio não encontrado nesta organização.');
    }
    if (!(await store.ownerIsOrgUser(organizationId, input.toOwner))) {
      throw new RebalanceApprovalError(
        'INVALID_OWNER',
        'toOwner deve ser o id de um usuário desta organização (mesmo id devolvido em GET /rebalance/recommendations).',
      );
    }
    const record: RebalanceApprovalRecord = {
      approvalId: randomUUID(),
      organizationId,
      recommendationId: input.recommendationId,
      leadId: input.leadId,
      fromOwner: input.fromOwner,
      toOwner: input.toOwner,
      decision: input.decision,
      ...(input.note ? { note: input.note } : {}),
      decidedBy,
      decidedAt: this.now().toISOString(),
      appliedToCrm: false,
    };
    await store.save(record, params.ipAddress);
    return { approval: record, alreadyRecorded: false };
  }
}

export const rebalanceApprovalService = new RebalanceApprovalService();
