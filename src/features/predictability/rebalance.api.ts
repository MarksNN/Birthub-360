/**
 * REMED-04/REMED-03 — client tipado do Revenue Oracle (contrato do Agente 04, PR #15 @ c41fef50).
 *
 * - POST /api/commercial-intelligence/predictive/rebalance/approvals (ADMIN/GESTOR)
 * - GET  /api/commercial-intelligence/predictive/cockpit   → ExecutiveRevenueCockpitV2
 * - GET  /api/commercial-intelligence/predictive/backtest  → BacktestValidationMetricsV2
 *
 * Leituras usam `api.get` (apiFetch já desembrulha `{ success, data }`). O POST usa fetch próprio
 * porque a UI precisa do STATUS HTTP (200 replay, 409 `data.existing`, 422 `details`, 404, 401/403),
 * que o `apiFetch` descarta ao lançar `Error(message)`.
 */
import { api, resolveApiUrl } from '../../lib/api.js';
import type {
  BacktestValidationMetricsV2,
  ExecutiveRevenueCockpitV2,
  RebalanceApprovalRecord,
  RebalanceApprovalRequest,
  RebalanceApprovalResponse,
} from '../../shared/contracts/predictiveRevenueOracle.contract.js';

export const PREDICTIVE_BASE_PATH = '/api/commercial-intelligence/predictive';
export const REBALANCE_APPROVALS_PATH = `${PREDICTIVE_BASE_PATH}/rebalance/approvals`;
export const PREDICTIVE_COCKPIT_PATH = `${PREDICTIVE_BASE_PATH}/cockpit`;
export const PREDICTIVE_BACKTEST_PATH = `${PREDICTIVE_BASE_PATH}/backtest`;

/** Espelha `COMMERCIAL_INTELLIGENCE_ROLES` do servidor (mount de /predictive). */
export const REBALANCE_APPROVER_ROLES = ['ADMIN', 'GESTOR'] as const;
export function canApproveRebalance(role: string | null | undefined): boolean {
  return !!role && (REBALANCE_APPROVER_ROLES as readonly string[]).includes(role);
}

export type RebalanceErrorKind =
  | 'conflict'
  | 'not_found'
  | 'validation'
  | 'forbidden'
  | 'network'
  | 'unknown';

export class RebalanceApprovalApiError extends Error {
  constructor(
    message: string,
    readonly kind: RebalanceErrorKind,
    readonly status: number | null,
    readonly fieldErrors: Record<string, string[]> = {},
    readonly existing: RebalanceApprovalRecord | null = null,
  ) {
    super(message);
    this.name = 'RebalanceApprovalApiError';
  }
}

export function getPredictiveCockpit(): Promise<ExecutiveRevenueCockpitV2> {
  return api.get<ExecutiveRevenueCockpitV2>(PREDICTIVE_COCKPIT_PATH);
}

export function getPredictiveBacktest(): Promise<BacktestValidationMetricsV2> {
  return api.get<BacktestValidationMetricsV2>(PREDICTIVE_BACKTEST_PATH);
}

/** 201 (novo) e 200 (replay idempotente, `alreadyRecorded: true`) são ambos sucesso. */
export async function submitRebalanceApproval(
  req: RebalanceApprovalRequest,
): Promise<RebalanceApprovalResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(REBALANCE_APPROVALS_PATH), {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(req),
    });
  } catch {
    throw new RebalanceApprovalApiError('Não foi possível conectar ao servidor.', 'network', null);
  }

  // biome-ignore lint/suspicious/noExplicitAny: envelope heterogêneo por status
  const body: any = await response.json().catch(() => null);
  const message: string = body?.error || `Falha ao registrar a decisão (HTTP ${response.status}).`;

  if (response.ok && body?.success !== false) {
    const data = (body && 'success' in body ? body.data : body) as RebalanceApprovalResponse;
    if (!data?.approval || data.approval.recommendationId !== req.recommendationId) {
      throw new RebalanceApprovalApiError(
        'Resposta inválida do servidor ao registrar a decisão.',
        'unknown',
        response.status,
      );
    }
    return data;
  }

  switch (response.status) {
    case 409:
      throw new RebalanceApprovalApiError(
        message,
        'conflict',
        409,
        {},
        (body?.data?.existing as RebalanceApprovalRecord | undefined) ?? null,
      );
    case 404:
      throw new RebalanceApprovalApiError(
        'Lead não encontrado nesta organização.',
        'not_found',
        404,
      );
    case 422:
      throw new RebalanceApprovalApiError(message, 'validation', 422, body?.details ?? {});
    case 401:
    case 403:
      throw new RebalanceApprovalApiError(
        'Você não tem permissão para decidir rebalanceamentos (apenas Admin e Gestor).',
        'forbidden',
        response.status,
      );
    default:
      throw new RebalanceApprovalApiError(message, 'unknown', response.status);
  }
}
