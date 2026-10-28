import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Análise de Custos por Agente
 * Custo detalhado por agente/missão
 */

export interface AgentCostAnalysis {
  organizationId: string;
  period: string;
  agents: Array<{
    agentType: string;
    totalExecutions: number;
    totalCostUsd: number;
    avgCostPerExecution: number;
    totalTokens: number;
    avgTokensPerExecution: number;
  }>;
  totalCostUsd: number;
  mostExpensiveAgent: string;
  mostEfficientAgent: string;
}

/**
 * Analisa custos por agente
 */
export async function analyzeAgentCosts(
  organizationId: string,
  days: number = 30,
): Promise<AgentCostAnalysis> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const aiLogs = await prisma.aILog.findMany({
    where: {
      organizationId,
      createdAt: { gte: since },
    },
    select: {
      agentRole: true,
      costUsd: true,
      promptTokens: true,
      completionTokens: true,
    },
  });

  const agentStats = new Map<
    string,
    {
      count: number;
      totalCost: number;
      totalTokens: number;
    }
  >();

  for (const log of aiLogs) {
    const agent = log.agentRole || 'UNKNOWN';
    if (!agentStats.has(agent)) {
      agentStats.set(agent, { count: 0, totalCost: 0, totalTokens: 0 });
    }
    const stats = agentStats.get(agent)!;
    stats.count++;
    stats.totalCost += log.costUsd || 0;
    stats.totalTokens += (log.promptTokens || 0) + (log.completionTokens || 0);
  }

  const agents = Array.from(agentStats.entries()).map(([agentType, stats]) => ({
    agentType,
    totalExecutions: stats.count,
    totalCostUsd: stats.totalCost,
    avgCostPerExecution: stats.totalCost / stats.count,
    totalTokens: stats.totalTokens,
    avgTokensPerExecution: stats.totalTokens / stats.count,
  }));

  const totalCostUsd = agents.reduce((sum, a) => sum + a.totalCostUsd, 0);

  agents.sort((a, b) => b.totalCostUsd - a.totalCostUsd);

  return {
    organizationId,
    period: `Últimos ${days} dias`,
    agents,
    totalCostUsd,
    mostExpensiveAgent: agents[0]?.agentType || 'Nenhum',
    mostEfficientAgent:
      agents.length > 0
        ? agents.reduce((min, curr) =>
            curr.avgCostPerExecution < min.avgCostPerExecution ? curr : min,
          ).agentType
        : 'Nenhum',
  };
}
