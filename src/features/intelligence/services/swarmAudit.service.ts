import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

interface SwarmAuditLogRow {
  id: string;
  organizationId: string;
  agentType: string;
  action: string;
  parameters: Record<string, unknown>;
  result: 'success' | 'error';
  errorMessage?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  correlationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

interface SwarmAuditLogDelegate {
  create(args: { data: Record<string, unknown> }): Promise<SwarmAuditLogRow>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy: { createdAt: 'desc' };
    take: number;
    skip: number;
  }): Promise<SwarmAuditLogRow[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
  groupBy(args: {
    by: Array<'agentType' | 'action'>;
    where: { organizationId: string };
    _count: true;
  }): Promise<Array<{ agentType: string; action: string; _count: number }>>;
}

const swarmAuditLogDelegate = (prisma as unknown as { swarmAuditLog: SwarmAuditLogDelegate })
  .swarmAuditLog;

/**
 * Serviço de Auditoria Completa do Swarm
 *
 * Registra todas as ações do swarm com:
 * - Quem executou (agente, usuário)
 * - O que foi executado (ação, parâmetros)
 * - Quando (timestamp)
 * - Resultado (sucesso, erro)
 * - Contexto (organização, tenant)
 */

export interface SwarmAuditLog {
  id: string;
  organizationId: string;
  agentType: string;
  action: string;
  parameters: Record<string, unknown>;
  result: 'success' | 'error';
  errorMessage?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

/**
 * Registra ação do swarm no log de auditoria
 */
export async function logSwarmAction(params: {
  organizationId: string;
  agentType: string;
  action: string;
  parameters: Record<string, unknown>;
  result: 'success' | 'error';
  errorMessage?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await swarmAuditLogDelegate.create({
      data: {
        organizationId: params.organizationId,
        agentType: params.agentType,
        action: params.action,
        parameters: params.parameters,
        result: params.result,
        errorMessage: params.errorMessage,
        userId: params.userId,
        sessionId: params.sessionId,
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    logger.info(
      { organizationId: params.organizationId, agentType: params.agentType, action: params.action },
      '[SwarmAudit] Ação registrada',
    );
  } catch (error: any) {
    logger.error({ err: error }, '[SwarmAudit] Erro ao registrar ação');
    // Não falhar a execução se auditoria falhar
  }
}

/**
 * Busca logs de auditoria de uma organização
 */
export async function getSwarmAuditLogs(params: {
  organizationId: string;
  agentType?: string;
  action?: string;
  result?: 'success' | 'error';
  limit?: number;
  offset?: number;
}): Promise<{ logs: SwarmAuditLog[]; total: number }> {
  const where: Record<string, unknown> = { organizationId: params.organizationId };

  if (params.agentType) where.agentType = params.agentType;
  if (params.action) where.action = params.action;
  if (params.result) where.result = params.result;

  const [logs, total] = await Promise.all([
    swarmAuditLogDelegate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    swarmAuditLogDelegate.count({ where }),
  ]);

  return {
    logs: logs.map((l: any) => ({
      id: l.id,
      organizationId: l.organizationId,
      agentType: l.agentType,
      action: l.action,
      parameters: l.parameters,
      result: l.result,
      errorMessage: l.errorMessage || undefined,
      userId: l.userId || undefined,
      sessionId: l.sessionId || undefined,
      correlationId: l.correlationId || undefined,
      ipAddress: l.ipAddress || undefined,
      userAgent: l.userAgent || undefined,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
  };
}

/**
 * Busca estatísticas de auditoria
 */
export async function getSwarmAuditStats(organizationId: string): Promise<{
  totalActions: number;
  successRate: number;
  byAgent: Record<string, number>;
  byAction: Record<string, number>;
  errorsLast24h: number;
}> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [total, successCount, byAgent, byAction, errorsLast24h] = await Promise.all([
    swarmAuditLogDelegate.count({ where: { organizationId } }),
    swarmAuditLogDelegate.count({ where: { organizationId, result: 'success' } }),
    swarmAuditLogDelegate.groupBy({
      by: ['agentType'],
      where: { organizationId },
      _count: true,
    }),
    swarmAuditLogDelegate.groupBy({
      by: ['action'],
      where: { organizationId },
      _count: true,
    }),
    swarmAuditLogDelegate.count({
      where: { organizationId, result: 'error', createdAt: { gte: last24h } },
    }),
  ]);

  const byAgentMap: Record<string, number> = {};
  for (const group of byAgent) {
    byAgentMap[group.agentType] = group._count;
  }

  const byActionMap: Record<string, number> = {};
  for (const group of byAction) {
    byActionMap[group.action] = group._count;
  }

  return {
    totalActions: total,
    successRate: total > 0 ? successCount / total : 0,
    byAgent: byAgentMap,
    byAction: byActionMap,
    errorsLast24h,
  };
}
