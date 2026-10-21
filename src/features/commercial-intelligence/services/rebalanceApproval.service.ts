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
import { isDecisionActive, rebalanceRecommendationId } from './rebalanceRecommendation.service.js';

export type { RebalanceApprovalStore };
/**
 * REMED-04 — aprovação humana de rebalanceamento de carteira.
 *
 * Persistência: `AuditLog` existente (entity `REBALANCE_APPROVAL_ENTITY`, entityId =
 * recommendationId, tenantId = organizationId, details = JSON do registro). Não exige migration.
 * Idempotência: (tenant, recommendationId). Mesma decisão/payload → replay 200 sem nova escrita;
 * payload/decisão divergente → 409. Antes disso: recommendationId precisa bater com o hash de
 * (org|leadId|fromOwner|toOwner) → 422; fromOwner precisa ser o owner atual → 409 STALE_OWNER;
 * toOwner precisa ser User do tenant → 422. Decisões expiram após REBALANCE_DECISION_TTL_DAYS.
 * Limite conhecido: sem UNIQUE no banco, duas requisições
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
    public readonly code:
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'INVALID_OWNER'
      | 'RECOMMENDATION_MISMATCH'
      | 'STALE_OWNER',
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

    // 1) Anti-forja: o id precisa ser o hash de (org|leadId|fromOwner|toOwner) do GET.
    const expectedId = rebalanceRecommendationId(
      organizationId,
      input.leadId,
      input.fromOwner,
      input.toOwner,
    );
    if (input.recommendationId !== expectedId) {
      throw new RebalanceApprovalError(
        'RECOMMENDATION_MISMATCH',
        'recommendationId não corresponde a (leadId, fromOwner, toOwner) — use exatamente os ids devolvidos por GET /rebalance/recommendations.',
      );
    }
    // 2) Idempotência (só decisões ainda válidas — TTL REBALANCE_DECISION_TTL_DAYS).
    const now = this.now();
    const found = await store.findByRecommendation(organizationId, input.recommendationId);
    const existing = found && isDecisionActive(found, now) ? found : null;
    if (existing) {
      if (samePayload(existing, input)) return { approval: existing, alreadyRecorded: true };
      throw new RebalanceApprovalError(
        'CONFLICT',
        `Recomendação ${input.recommendationId} já tem decisão ${existing.decision} registrada com outro conteúdo.`,
        existing,
      );
    }
    // 3) Estado atual do lead: existe no tenant e o owner ainda é fromOwner.
    const lead = await store.findLead(organizationId, input.leadId);
    if (!lead) {
      throw new RebalanceApprovalError('NOT_FOUND', 'Negócio não encontrado nesta organização.');
    }
    if ((lead.owner ?? null) !== input.fromOwner) {
      throw new RebalanceApprovalError(
        'STALE_OWNER',
        'fromOwner não é mais o responsável atual do negócio — recarregue GET /rebalance/recommendations.',
      );
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
      decidedAt: now.toISOString(),
      appliedToCrm: false,
    };
    await store.save(record, params.ipAddress);
    return { approval: record, alreadyRecorded: false };
  }
}

export const rebalanceApprovalService = new RebalanceApprovalService();
