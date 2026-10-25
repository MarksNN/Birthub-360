import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';

/**
 * Heatmap de Uso do Swarm
 * Visualiza quais agentes são mais usados
 */

export interface AgentUsageHeatmap {
  organizationId: string;
  period: string;
  agents: Array<{
    agentType: string;
    executions: number;
    percentage: number;
    avgLatencyMs: number;
    successRate: number;
    costUsd: number;
  }>;
  totalExecutions: number;
  topAgent: string;
}

/**
 * Gera heatmap de uso dos agentes
 */
export async function generateAgentUsageHeatmap(
  organizationId: string,
  days: number = 30,
): Promise<AgentUsageHeatmap> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const executions = await prisma.agentMemory.findMany({
    where: {
      organizationId,
      createdAt: { gte: since },
    },
    select: {
      agentType: true,
      status: true,
      createdAt: true,
    },
  });

  const agentStats = new Map<string, { count: number; totalLatency: number; success: number }>();

  for (const exec of executions) {
    const agent = exec.agentType;
    if (!agentStats.has(agent)) {
      agentStats.set(agent, { count: 0, totalLatency: 0, success: 0 });
    }
    const stats = agentStats.get(agent)!;
    stats.count++;
    stats.success += exec.status === 'Completed' ? 1 : 0;
  }

  const agents = Array.from(agentStats.entries()).map(([agentType, stats]) => ({
    agentType,
    executions: stats.count,
    percentage: 0, // Calculado depois
    avgLatencyMs: stats.totalLatency / stats.count,
    successRate: stats.success / stats.count,
    costUsd: stats.count * 0.01, // Estimado
  }));

  const totalExecutions = agents.reduce((sum, a) => sum + a.executions, 0);
  agents.forEach((a) => (a.percentage = (a.executions / totalExecutions) * 100));

  agents.sort((a, b) => b.executions - a.executions);

  return {
    organizationId,
    period: `Últimos ${days} dias`,
    agents,
    totalExecutions,
    topAgent: agents[0]?.agentType || 'Nenhum',
  };
}
