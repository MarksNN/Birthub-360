import { logger } from '../../../lib/logger.js';
import { prisma } from '../../../lib/prisma.js';

/**
 * Predição de Sucesso - Modelo que prevê probabilidade de sucesso antes de executar.
 *
 * Analisa contexto da missão e histórico para prever:
 * - Probabilidade de conversão
 * - Probabilidade de erro
 * - Probabilidade de override humano
 * - Custo estimado
 * - Latência estimada
 *
 * Permite decidir se vale a pena executar uma missão antes de gastar recursos.
 */

export interface MissionContext {
  organizationId: string;
  tenantId: string;
  agentRole: 'SDR' | 'BDR' | 'CLOSER' | 'CRM' | 'OPS' | 'SUPERVISOR';
  leadId?: string;
  missionType: string; // ex: 'qualification', 'outreach', 'negotiation', 'pipeline_update'
  leadScore?: number;
  leadStage?: string;
  timeSinceLastContact?: number; // em horas
  previousAttempts?: number;
}

export interface SuccessPrediction {
  missionId: string;
  organizationId: string;
  agentRole: MissionContext['agentRole'];
  missionType: string;
  conversionProbability: number; // 0-1
  errorProbability: number; // 0-1
  humanOverrideProbability: number; // 0-1
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
  confidence: number; // 0-1, confiança na predição
  factors: PredictionFactor[];
  recommendation: 'EXECUTE' | 'DEFER' | 'SKIP' | 'REQUIRE_APPROVAL';
  reasoning: string;
  createdAt: string;
}

export interface PredictionFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1, quanto influencia na decisão
  value: string;
}

/**
 * Prediz a probabilidade de sucesso de uma missão antes de executar.
 */
export async function predictMissionSuccess(context: MissionContext): Promise<SuccessPrediction> {
  const missionId = `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Buscar histórico similar
  const historicalData = await getHistoricalMissionData(context);

  // Calcular predições baseadas em fatores
  const factors = analyzeFactors(context, historicalData);

  const conversionProbability = calculateConversionProbability(context, factors, historicalData);
  const errorProbability = calculateErrorProbability(context, factors, historicalData);
  const humanOverrideProbability = calculateOverrideProbability(context, factors, historicalData);
  const estimatedCostUsd = estimateCost(context, historicalData);
  const estimatedLatencyMs = estimateLatency(context, historicalData);
  const confidence = calculatePredictionConfidence(historicalData);

  const recommendation = makeRecommendation(
    conversionProbability,
    errorProbability,
    humanOverrideProbability,
    estimatedCostUsd,
    confidence,
  );

  const reasoning = generateReasoning(
    conversionProbability,
    errorProbability,
    humanOverrideProbability,
    recommendation,
    factors,
  );

  const prediction: SuccessPrediction = {
    missionId,
    organizationId: context.organizationId,
    agentRole: context.agentRole,
    missionType: context.missionType,
    conversionProbability,
    errorProbability,
    humanOverrideProbability,
    estimatedCostUsd,
    estimatedLatencyMs,
    confidence,
    factors,
    recommendation,
    reasoning,
    createdAt: new Date().toISOString(),
  };

  logger.info(
    { missionId, agentRole: context.agentRole, recommendation, conversionProbability },
    '[SuccessPrediction] Predição gerada',
  );

  return prediction;
}

/**
 * Busca dados históricos de missões similares.
 */
async function getHistoricalMissionData(
  context: MissionContext,
): Promise<{ total: number; successful: number; avgCost: number; avgLatency: number }> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias

  const logs = await prisma.aILog.findMany({
    where: {
      organizationId: context.organizationId,
      agentRole: context.agentRole,
      createdAt: { gte: since },
    },
    select: {
      success: true,
      costUsd: true,
      latencyMs: true,
    },
  });

  const total = logs.length;
  const successful = logs.filter((l) => l.success).length;
  const avgCost = total > 0 ? logs.reduce((sum, l) => sum + (l.costUsd || 0), 0) / total : 0;
  const avgLatency = total > 0 ? logs.reduce((sum, l) => sum + (l.latencyMs || 0), 0) / total : 0;

  return { total, successful, avgCost, avgLatency };
}

/**
 * Analisa fatores que influenciam o sucesso da missão.
 */
function analyzeFactors(
  context: MissionContext,
  historical: { total: number; successful: number; avgCost: number; avgLatency: number },
): PredictionFactor[] {
  const factors: PredictionFactor[] = [];

  // Lead score
  if (context.leadScore !== undefined) {
    if (context.leadScore >= 80) {
      factors.push({
        factor: 'lead_score',
        impact: 'positive',
        weight: 0.3,
        value: `Lead score alto (${context.leadScore})`,
      });
    } else if (context.leadScore >= 50) {
      factors.push({
        factor: 'lead_score',
        impact: 'neutral',
        weight: 0.2,
        value: `Lead score médio (${context.leadScore})`,
      });
    } else {
      factors.push({
        factor: 'lead_score',
        impact: 'negative',
        weight: 0.3,
        value: `Lead score baixo (${context.leadScore})`,
      });
    }
  }

  // Estágio do lead
  if (context.leadStage) {
    const positiveStages = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION'];
    const negativeStages = ['NEW', 'CONTACTED', 'LOST'];

    if (positiveStages.includes(context.leadStage)) {
      factors.push({
        factor: 'lead_stage',
        impact: 'positive',
        weight: 0.25,
        value: `Lead em estágio avançado (${context.leadStage})`,
      });
    } else if (negativeStages.includes(context.leadStage)) {
      factors.push({
        factor: 'lead_stage',
        impact: 'negative',
        weight: 0.2,
        value: `Lead em estágio inicial (${context.leadStage})`,
      });
    }
  }

  // Tempo desde último contato
  if (context.timeSinceLastContact !== undefined) {
    if (context.timeSinceLastContact < 24) {
      factors.push({
        factor: 'recency',
        impact: 'positive',
        weight: 0.15,
        value: `Contato recente (${context.timeSinceLastContact}h atrás)`,
      });
    } else if (context.timeSinceLastContact > 168) {
      // 7 dias
      factors.push({
        factor: 'recency',
        impact: 'negative',
        weight: 0.2,
        value: `Contato antigo (${context.timeSinceLastContact}h atrás)`,
      });
    }
  }

  // Tentativas anteriores
  if (context.previousAttempts !== undefined) {
    if (context.previousAttempts > 5) {
      factors.push({
        factor: 'fatigue',
        impact: 'negative',
        weight: 0.25,
        value: `Muitas tentativas anteriores (${context.previousAttempts})`,
      });
    } else if (context.previousAttempts === 0) {
      factors.push({
        factor: 'fatigue',
        impact: 'positive',
        weight: 0.1,
        value: 'Primeira tentativa',
      });
    }
  }

  // Histórico do agente
  if (historical.total > 10) {
    const successRate = historical.successful / historical.total;
    if (successRate > 0.8) {
      factors.push({
        factor: 'agent_history',
        impact: 'positive',
        weight: 0.2,
        value: `Agente com taxa de sucesso alta (${(successRate * 100).toFixed(1)}%)`,
      });
    } else if (successRate < 0.5) {
      factors.push({
        factor: 'agent_history',
        impact: 'negative',
        weight: 0.2,
        value: `Agente com taxa de sucesso baixa (${(successRate * 100).toFixed(1)}%)`,
      });
    }
  }

  return factors;
}

/**
 * Calcula probabilidade de conversão.
 */
function calculateConversionProbability(
  context: MissionContext,
  factors: PredictionFactor[],
  historical: { total: number; successful: number; avgCost: number; avgLatency: number },
): number {
  let probability = 0.5; // Base

  for (const factor of factors) {
    if (factor.impact === 'positive') {
      probability += factor.weight * 0.3;
    } else if (factor.impact === 'negative') {
      probability -= factor.weight * 0.3;
    }
  }

  // Ajustar com histórico se disponível
  if (historical.total > 10) {
    const historicalRate = historical.successful / historical.total;
    probability = (probability + historicalRate) / 2;
  }

  return Math.max(0, Math.min(1, probability));
}

/**
 * Calcula probabilidade de erro.
 */
function calculateErrorProbability(
  context: MissionContext,
  factors: PredictionFactor[],
  historical: { total: number; successful: number; avgCost: number; avgLatency: number },
): number {
  let probability = 0.1; // Base

  // Fatores negativos aumentam probabilidade de erro
  for (const factor of factors) {
    if (factor.impact === 'negative') {
      probability += factor.weight * 0.2;
    }
  }

  // Ajustar com histórico
  if (historical.total > 10) {
    const errorRate = 1 - historical.successful / historical.total;
    probability = (probability + errorRate) / 2;
  }

  return Math.max(0, Math.min(1, probability));
}

/**
 * Calcula probabilidade de override humano.
 */
function calculateOverrideProbability(
  context: MissionContext,
  factors: PredictionFactor[],
  historical: { total: number; successful: number; avgCost: number; avgLatency: number },
): number {
  let probability = 0.15; // Base

  // Fatores negativos aumentam probabilidade de override
  for (const factor of factors) {
    if (factor.impact === 'negative') {
      probability += factor.weight * 0.15;
    }
  }

  return Math.max(0, Math.min(1, probability));
}

/**
 * Estima custo da missão.
 */
function estimateCost(
  context: MissionContext,
  historical: { total: number; successful: number; avgCost: number; avgLatency: number },
): number {
  if (historical.total > 0) {
    return historical.avgCost;
  }

  // Fallback por agente
  const costsByAgent: Record<MissionContext['agentRole'], number> = {
    SDR: 0.02,
    BDR: 0.015,
    CLOSER: 0.025,
    CRM: 0.01,
    OPS: 0.005,
    SUPERVISOR: 0.005,
  };

  return costsByAgent[context.agentRole] || 0.01;
}

/**
 * Estima latência da missão.
 */
function estimateLatency(
  context: MissionContext,
  historical: { total: number; successful: number; avgCost: number; avgLatency: number },
): number {
  if (historical.total > 0) {
    return historical.avgLatency;
  }

  // Fallback por agente
  const latenciesByAgent: Record<MissionContext['agentRole'], number> = {
    SDR: 1500,
    BDR: 2000,
    CLOSER: 1800,
    CRM: 800,
    OPS: 500,
    SUPERVISOR: 300,
  };

  return latenciesByAgent[context.agentRole] || 1000;
}

/**
 * Calcula confiança na predição.
 */
function calculatePredictionConfidence(historical: {
  total: number;
  successful: number;
  avgCost: number;
  avgLatency: number;
}): number {
  if (historical.total < 5) return 0.3;
  if (historical.total < 20) return 0.5;
  if (historical.total < 50) return 0.7;
  return 0.9;
}

/**
 * Faz recomendação de execução.
 */
function makeRecommendation(
  conversionProbability: number,
  errorProbability: number,
  humanOverrideProbability: number,
  estimatedCostUsd: number,
  confidence: number,
): SuccessPrediction['recommendation'] {
  // Probabilidade muito baixa de sucesso
  if (conversionProbability < 0.2 && confidence > 0.5) {
    return 'SKIP';
  }

  // Alto risco de erro e override
  if (errorProbability > 0.4 && humanOverrideProbability > 0.5) {
    return 'REQUIRE_APPROVAL';
  }

  // Custo alto com baixa probabilidade
  if (estimatedCostUsd > 0.05 && conversionProbability < 0.4) {
    return 'DEFER';
  }

  // Caso contrário, executar
  return 'EXECUTE';
}

/**
 * Gera explicação da recomendação.
 */
function generateReasoning(
  conversionProbability: number,
  errorProbability: number,
  humanOverrideProbability: number,
  recommendation: SuccessPrediction['recommendation'],
  factors: PredictionFactor[],
): string {
  const positiveFactors = factors.filter((f) => f.impact === 'positive').map((f) => f.value);
  const negativeFactors = factors.filter((f) => f.impact === 'negative').map((f) => f.value);

  let reasoning = `Probabilidade de conversão: ${(conversionProbability * 100).toFixed(1)}%. `;

  if (positiveFactors.length > 0) {
    reasoning += `Fatores positivos: ${positiveFactors.join(', ')}. `;
  }

  if (negativeFactors.length > 0) {
    reasoning += `Fatores negativos: ${negativeFactors.join(', ')}. `;
  }

  reasoning += `Risco de erro: ${(errorProbability * 100).toFixed(1)}%, Risco de override: ${(humanOverrideProbability * 100).toFixed(1)}%. `;

  switch (recommendation) {
    case 'EXECUTE':
      reasoning += 'Recomendação: EXECUTAR - os benefícios superam os riscos.';
      break;
    case 'DEFER':
      reasoning += 'Recomendação: ADIAR - custo alto com baixa probabilidade de sucesso.';
      break;
    case 'SKIP':
      reasoning += 'Recomendação: PULAR - probabilidade de sucesso muito baixa.';
      break;
    case 'REQUIRE_APPROVAL':
      reasoning += 'Recomendação: REQUER APROVAÇÃO - riscos altos, validar com humano.';
      break;
  }

  return reasoning;
}
