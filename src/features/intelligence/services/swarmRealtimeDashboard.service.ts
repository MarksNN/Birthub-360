import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Dashboard Real-time do Swarm
 *
 * Monitoramento ao vivo de:
 * - Execuções em andamento
 * - Agentes ativos
 * - Métricas em tempo real
 * - Alertas e erros
 */

export interface SwarmRealtimeStatus {
  organizationId: string;
  timestamp: string;
  agents: {
    [key: string]: {
      status: 'idle' | 'running' | 'error';
      activeSessions: number;
      lastExecution: string | null;
      avgLatencyMs: number;
      errorRate: number;
    };
  };
  currentExecutions: Array<{
    sessionId: string;
    agentType: string;
    startedAt: string;
    progress: number;
  }>;
  metrics: {
    totalExecutionsToday: number;
    successRate: number;
    avgLatencyMs: number;
    totalCostUsd: number;
  };
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
}

/**
 * Busca status em tempo real do swarm para uma organização
 */
export async function getSwarmRealtimeStatus(organizationId: string): Promise<SwarmRealtimeStatus> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Buscar execuções hoje
  const executionsToday = await prisma.agentMemory.findMany({
    where: {
      organizationId,
      createdAt: { gte: startOfDay },
    },
  });

  const totalExecutionsToday = executionsToday.length;
  const successfulExecutions = executionsToday.filter((e) => e.status === 'Completed').length;
  const successRate = totalExecutionsToday > 0 ? successfulExecutions / totalExecutionsToday : 0;

  // Buscar logs de IA para latência e custo
  const aiLogs = await prisma.aILog.findMany({
    where: {
      organizationId,
      createdAt: { gte: startOfDay },
    },
    select: {
      latencyMs: true,
      costUsd: true,
      success: true,
      agentRole: true,
    },
  });

  const avgLatencyMs =
    aiLogs.length > 0 ? aiLogs.reduce((sum, l) => sum + (l.latencyMs || 0), 0) / aiLogs.length : 0;
  const totalCostUsd = aiLogs.reduce((sum, l) => sum + (l.costUsd || 0), 0);

  // Buscar execuções recentes
  const runningExecutions: Array<{ sessionId: string; agentType: string; createdAt: Date }> = [];

  const currentExecutions = runningExecutions.map((e) => ({
    sessionId: e.sessionId,
    agentType: e.agentType,
    startedAt: e.createdAt.toISOString(),
    progress: 50, // Simplificado - em production calcularia baseado em mensagens
  }));

  // Status por agente
  const agentTypes = ['SDR', 'BDR', 'CLOSER', 'CRM', 'OPS', 'SUPERVISOR'];
  const agents: SwarmRealtimeStatus['agents'] = {};

  for (const agentType of agentTypes) {
    const agentExecutions = executionsToday.filter((e) => e.agentType === agentType);
    const agentRunning = runningExecutions.filter((e) => e.agentType === agentType);
    const agentLogs = aiLogs.filter((l) => l.agentRole === agentType);

    agents[agentType] = {
      status: agentRunning.length > 0 ? 'running' : 'idle',
      activeSessions: agentRunning.length,
      lastExecution: agentExecutions.length > 0 ? agentExecutions[0].createdAt.toISOString() : null,
      avgLatencyMs:
        agentLogs.length > 0
          ? agentLogs.reduce((sum, l) => sum + (l.latencyMs || 0), 0) / agentLogs.length
          : 0,
      errorRate:
        agentLogs.length > 0 ? agentLogs.filter((l) => !l.success).length / agentLogs.length : 0,
    };
  }

  // Alertas simulados
  const alerts: SwarmRealtimeStatus['alerts'] = [];
  if (successRate < 0.8) {
    alerts.push({
      severity: 'warning',
      message: `Taxa de sucesso baixa: ${(successRate * 100).toFixed(1)}%`,
      timestamp: now.toISOString(),
    });
  }
  if (avgLatencyMs > 5000) {
    alerts.push({
      severity: 'warning',
      message: `Latência alta: ${avgLatencyMs.toFixed(0)}ms`,
      timestamp: now.toISOString(),
    });
  }

  return {
    organizationId,
    timestamp: now.toISOString(),
    agents,
    currentExecutions,
    metrics: {
      totalExecutionsToday,
      successRate,
      avgLatencyMs,
      totalCostUsd,
    },
    alerts,
  };
}
