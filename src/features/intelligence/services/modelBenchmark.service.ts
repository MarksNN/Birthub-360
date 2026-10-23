import { prisma } from '../../../lib/prisma.js';
import { logger } from '../../../lib/logger.js';

/**
 * Benchmark de Modelos - Compara performance entre Groq, OpenAI e vLLM.
 * 
 * Analisa AILog e outros dados para comparar:
 * - Latência por modelo
 * - Custo por modelo
 * - Taxa de sucesso por modelo
 * - Qualidade de resposta (taxa de override humano)
 * - Throughput (execuções por minuto)
 * 
 * Permite identificar qual modelo é mais eficiente para cada papel do enxame.
 */

export interface ModelMetrics {
  modelName: string; // ex: 'gpt-4o', 'llama-3.1-70b', 'gpt-oss-20b'
  agentRole: 'SDR' | 'BDR' | 'CLOSER' | 'CRM' | 'OPS' | 'SUPERVISOR';
  organizationId: string;
  windowMinutes: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  totalCostUsd: number;
  avgCostUsd: number;
  totalTokens: number;
  avgTokensPerExecution: number;
  humanOverrideRate: number;
  throughputPerMinute: number;
}

export interface ModelComparison {
  organizationId: string;
  agentRole: ModelMetrics['agentRole'];
  windowMinutes: number;
  models: ModelMetrics[];
  bestByLatency: ModelMetrics;
  bestByCost: ModelMetrics;
  bestBySuccessRate: ModelMetrics;
  bestByOverrideRate: ModelMetrics;
  recommendation: string;
}

/**
 * Calcula métricas de benchmark para um modelo específico.
 */
export async function calculateModelMetrics(
  organizationId: string,
  modelName: string,
  agentRole: ModelMetrics['agentRole'],
  windowMinutes: number = 60,
): Promise<ModelMetrics> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const logs = await prisma.aILog.findMany({
    where: {
      organizationId,
      modelName,
      agentRole,
      createdAt: { gte: since },
    },
    select: {
      success: true,
      latencyMs: true,
      costUsd: true,
      promptTokens: true,
      completionTokens: true,
    },
  });

  const totalExecutions = logs.length;
  const successfulExecutions = logs.filter(l => l.success).length;
  const failedExecutions = totalExecutions - successfulExecutions;
  const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

  const latencies = logs.map(l => l.latencyMs || 0).filter(l => l > 0).sort((a, b) => a - b);
  const avgLatencyMs = latencies.length > 0 
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
    : 0;
  const p50LatencyMs = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p95LatencyMs = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const p99LatencyMs = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

  const totalCostUsd = logs.reduce((sum, l) => sum + (l.costUsd || 0), 0);
  const avgCostUsd = totalExecutions > 0 ? totalCostUsd / totalExecutions : 0;

  const totalTokens = logs.reduce((sum, l) => 
    sum + (l.promptTokens || 0) + (l.completionTokens || 0), 0
  );
  const avgTokensPerExecution = totalExecutions > 0 ? totalTokens / totalExecutions : 0;

  // Buscar taxa de override humano
  const pendingActions = await prisma.aIPendingAction.findMany({
    where: {
      organizationId,
      agentRole,
      modelName,
      createdAt: { gte: since },
    },
    select: {
      status: true,
    },
  });

  const humanOverrides = pendingActions.filter(a => 
    a.status === 'REJECTED' || a.status === 'MODIFIED'
  ).length;
  const humanOverrideRate = pendingActions.length > 0 
    ? humanOverrides / pendingActions.length 
    : 0;

  const throughputPerMinute = windowMinutes > 0 ? totalExecutions / windowMinutes : 0;

  return {
    modelName,
    agentRole,
    organizationId,
    windowMinutes,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate,
    avgLatencyMs,
    p50LatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    totalCostUsd,
    avgCostUsd,
    totalTokens,
    avgTokensPerExecution,
    humanOverrideRate,
    throughputPerMinute,
  };
}

/**
 * Compara múltiplos modelos para um agente específico.
 */
export async function compareModelsForAgent(
  organizationId: string,
  agentRole: ModelMetrics['agentRole'],
  modelNames: string[],
  windowMinutes: number = 60,
): Promise<ModelComparison> {
  const metrics = await Promise.all(
    modelNames.map(name => calculateModelMetrics(organizationId, name, agentRole, windowMinutes))
  );

  const validMetrics = metrics.filter(m => m.totalExecutions > 0);

  if (validMetrics.length === 0) {
    return {
      organizationId,
      agentRole,
      windowMinutes,
      models: [],
      bestByLatency: null as any,
      bestByCost: null as any,
      bestBySuccessRate: null as any,
      bestByOverrideRate: null as any,
      recommendation: 'Dados insuficientes para comparação',
    };
  }

  const bestByLatency = validMetrics.reduce((best, current) => 
    current.avgLatencyMs < best.avgLatencyMs ? current : best
  );

  const bestByCost = validMetrics.reduce((best, current) => 
    current.avgCostUsd < best.avgCostUsd ? current : best
  );

  const bestBySuccessRate = validMetrics.reduce((best, current) => 
    current.successRate > best.successRate ? current : best
  );

  const bestByOverrideRate = validMetrics.reduce((best, current) => 
    current.humanOverrideRate < best.humanOverrideRate ? current : best
  );

  // Recomendação simples
  let recommendation = '';
  if (bestBySuccessRate.modelName === bestByCost.modelName && 
      bestBySuccessRate.modelName === bestByLatency.modelName) {
    recommendation = `${bestBySuccessRate.modelName} é o melhor em todas as métricas (sucesso, custo e latência)`;
  } else if (bestBySuccessRate.successRate > 0.9 && bestByCost.avgCostUsd < bestByLatency.avgCostUsd / 1000) {
    recommendation = `${bestBySuccessRate.modelName} tem a melhor taxa de sucesso com custo aceitável`;
  } else {
    recommendation = `Trade-off: ${bestByLatency.modelName} é mais rápido, ${bestByCost.modelName} é mais barato, ${bestBySuccessRate.modelName} é mais confiável`;
  }

  return {
    organizationId,
    agentRole,
    windowMinutes,
    models: validMetrics,
    bestByLatency,
    bestByCost,
    bestBySuccessRate,
    bestByOverrideRate,
    recommendation,
  };
}

/**
 * Retorna comparação completa para todos os agentes do enxame.
 */
export async function getFullSwarmModelBenchmark(
  organizationId: string,
  windowMinutes: number = 60,
): Promise<ModelComparison[]> {
  const agentRoles: ModelMetrics['agentRole'][] = ['SDR', 'BDR', 'CLOSER', 'CRM', 'OPS', 'SUPERVISOR'];
  const modelNames = ['gpt-4o', 'llama-3.1-70b', 'gpt-oss-20b']; // Modelos comuns no gateway

  return Promise.all(
    agentRoles.map(role => compareModelsForAgent(organizationId, role, modelNames, windowMinutes))
  );
}

/**
 * Identifica qual modelo é mais eficiente para cada papel baseado em histórico.
 */
export async function recommendOptimalModelPerAgent(
  organizationId: string,
): Promise<Record<ModelMetrics['agentRole'], string>> {
  const comparisons = await getFullSwarmModelBenchmark(organizationId, 24 * 60); // 24 horas

  const recommendations: Record<ModelMetrics['agentRole'], string> = {} as any;

  for (const comparison of comparisons) {
    if (comparison.models.length > 0) {
      // Estratégia: maximizar taxa de sucesso, minimizar custo
      const scored = comparison.models.map(m => ({
        modelName: m.modelName,
        score: m.successRate * 100 - (m.avgCostUsd * 1000) - (m.humanOverrideRate * 50),
      }));
      
      scored.sort((a, b) => b.score - a.score);
      recommendations[comparison.agentRole] = scored[0].modelName;
    }
  }

  return recommendations;
}
