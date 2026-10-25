/**
 * Dynamic Model Routing: Seleção de provider/model baseada em custo, latência,
 * disponibilidade e tenant tier. Substitui a cadeia de fallback estática por
 * uma decisão dinâmica que otimiza automaticamente para custo/latência.
 *
 * Handoff: .agents/handoffs/evolution-plano-2026-10-23/para-07-p2-1-dynamic-routing.md
 * Responsável: Agente 07 — IA e Automações
 */

import { logger } from '../../logger.js';
import { PRICING_PER_MILLION_TOKENS } from './pricing.js';
import { isCircuitOpen } from './circuit-breaker.js';
import type { ProviderAdapter } from './providers/types.js';
import type { OrganizationTier } from '../../finops/tokenQuota.service.js';

/** Métricas de latência recentes por provider/model (em memória, janela deslizante). */
interface LatencyMetrics {
  avgLatencyMs: number;
  sampleCount: number;
  lastUpdated: number;
}

const LATENCY_WINDOW_MS = 300_000; // 5 minutos
const MAX_LATENCY_SAMPLES = 50;
const latencyCache = new Map<string, LatencyMetrics>();

/** Configuração de pesos para o score de routing (soma = 1.0). */
const ROUTING_WEIGHTS = {
  cost: 0.4, // 40% peso para custo
  latency: 0.4, // 40% peso para latência
  availability: 0.2, // 20% peso para disponibilidade
};

/** Opções de routing dinâmico. */
export interface DynamicRoutingOptions {
  /** Tier do tenant (influencia prioridade de custo vs latência). */
  tenantTier?: OrganizationTier;
  /** Model lógico solicitado (ex: 'local-llama3'). */
  requestedModel: string;
  /** Lista de providers disponíveis para seleção. */
  availableProviders: readonly ProviderAdapter[];
}

/** Resultado da seleção dinâmica. */
export interface DynamicRoutingResult {
  /** Provider selecionado. */
  selectedProvider: ProviderAdapter;
  /** Model a ser usado (pode ser diferente do solicitado se houver fallback de quota). */
  effectiveModel: string;
  /** Score calculado (0-1, maior = melhor). */
  score: number;
  /** Justificativa da seleção (para debugging/telemetria). */
  reason: string;
}

/**
 * Registra uma latência observada para um provider/model.
 * Chamado após cada conclusão bem-sucedida de chamada.
 */
export function recordLatency(provider: string, model: string, latencyMs: number): void {
  const key = `${provider}:${model}`;
  const now = Date.now();
  const existing = latencyCache.get(key);

  if (existing && now - existing.lastUpdated > LATENCY_WINDOW_MS) {
    // Janela expirou, reinicia
    latencyCache.delete(key);
  }

  const current = latencyCache.get(key) || {
    avgLatencyMs: latencyMs,
    sampleCount: 0,
    lastUpdated: now,
  };

  // Média móvel simples
  current.sampleCount++;
  current.avgLatencyMs =
    (current.avgLatencyMs * (current.sampleCount - 1) + latencyMs) / current.sampleCount;
  current.lastUpdated = now;

  if (current.sampleCount > MAX_LATENCY_SAMPLES) {
    current.sampleCount = Math.floor(current.sampleCount / 2);
  }

  latencyCache.set(key, current);
}

/**
 * Obtém a latência média recente para um provider/model.
 * Retorna null se não houver dados suficientes.
 */
function getRecentLatency(provider: string, model: string): number | null {
  const key = `${provider}:${model}`;
  const metrics = latencyCache.get(key);
  if (!metrics || metrics.sampleCount < 3) {
    return null; // Precisa de pelo menos 3 amostras para ser confiável
  }
  return metrics.avgLatencyMs;
}

/**
 * Calcula o custo normalizado (0-1) para um model.
 * Menor custo = score maior (inverso).
 */
function calculateCostScore(model: string): number {
  const pricing = PRICING_PER_MILLION_TOKENS[model];
  if (!pricing) {
    // Modelo sem preço cadastrado -> score neutro
    return 0.5;
  }

  // Custo total médio (assumindo proporção 70% input / 30% output)
  const avgCost = pricing.input * 0.7 + pricing.output * 0.3;

  // Normaliza: custo máximo observado nos modelos conhecidos ≈ 0.6 USD/1M tokens
  const maxCost = 0.6;
  const normalized = 1 - Math.min(avgCost / maxCost, 1);

  return normalized;
}

/**
 * Calcula o score de latência normalizado (0-1).
 * Menor latência = score maior (inverso).
 */
function calculateLatencyScore(provider: string, model: string): number {
  const latency = getRecentLatency(provider, model);
  if (latency === null) {
    // Sem dados de latência -> score neutro
    return 0.5;
  }

  // Normaliza: latência máxima observada ≈ 2000ms
  const maxLatency = 2000;
  const normalized = 1 - Math.min(latency / maxLatency, 1);

  return normalized;
}

/**
 * Calcula o score de disponibilidade (0-1).
 * Provider com circuit fechado = 1.0, aberto = 0.0.
 */
async function calculateAvailabilityScore(provider: string): Promise<number> {
  const isOpen = await isCircuitOpen(provider);
  return isOpen ? 0.0 : 1.0;
}

/**
 * Ajusta pesos de routing baseado no tenant tier.
 * Tiers mais altos priorizam latência sobre custo.
 */
function adjustWeightsForTier(tier?: OrganizationTier): typeof ROUTING_WEIGHTS {
  if (!tier || tier === 'free' || tier === 'starter') {
    // Tiers baixos: custo mais importante
    return { cost: 0.5, latency: 0.3, availability: 0.2 };
  }

  if (tier === 'pro') {
    // Tier médio: balanceado
    return { cost: 0.4, latency: 0.4, availability: 0.2 };
  }

  // Enterprise: latência mais importante
  return { cost: 0.3, latency: 0.5, availability: 0.2 };
}

/**
 * Seleciona dinamicamente o melhor provider/model baseado em custo, latência,
 * disponibilidade e tenant tier.
 *
 * Estratégia:
 * 1. Filtra providers configurados e com circuit fechado
 * 2. Calcula score ponderado para cada combinação provider/model
 * 3. Retorna a opção com maior score
 * 4. Se todos tiverem score 0 (ex: todos com circuit aberto), retorna o primeiro configurado
 */
export async function selectDynamicRouting(
  options: DynamicRoutingOptions,
): Promise<DynamicRoutingResult> {
  const { tenantTier, requestedModel, availableProviders } = options;
  const weights = adjustWeightsForTier(tenantTier);

  // Filtra providers configurados
  const configuredProviders = availableProviders.filter((p) => p.isConfigured());

  if (configuredProviders.length === 0) {
    throw new Error('Nenhum provider de IA configurado para routing dinâmico.');
  }

  // Calcula score para cada provider
  const scoredProviders: Array<{
    provider: ProviderAdapter;
    score: number;
    reason: string;
  }> = [];

  for (const provider of configuredProviders) {
    const costScore = calculateCostScore(requestedModel);
    const latencyScore = calculateLatencyScore(provider.name, requestedModel);
    const availabilityScore = await calculateAvailabilityScore(provider.name);

    // Se circuit estiver aberto, score total = 0 (não selecionar)
    if (availabilityScore === 0) {
      scoredProviders.push({
        provider,
        score: 0,
        reason: `Circuit breaker aberto para ${provider.name}`,
      });
      continue;
    }

    // Score ponderado
    const totalScore =
      costScore * weights.cost +
      latencyScore * weights.latency +
      availabilityScore * weights.availability;

    scoredProviders.push({
      provider,
      score: totalScore,
      reason: `Custo: ${(costScore * 100).toFixed(0)}%, Latência: ${(latencyScore * 100).toFixed(0)}%, Disponibilidade: ${(availabilityScore * 100).toFixed(0)}%`,
    });
  }

  // Ordena por score (maior primeiro)
  scoredProviders.sort((a, b) => b.score - a.score);

  // Seleciona o melhor
  const best = scoredProviders[0];

  // Se o melhor tiver score 0 (todos com circuit aberto), usa o primeiro configurado anyway
  if (best.score === 0) {
    const fallback = configuredProviders[0];
    logger.warn(
      { tier: tenantTier, model: requestedModel },
      '[DynamicRouting] Todos os providers têm circuit aberto, usando fallback para primeiro configurado',
    );
    return {
      selectedProvider: fallback,
      effectiveModel: requestedModel,
      score: 0,
      reason: 'Fallback: todos os providers com circuit aberto',
    };
  }

  logger.info(
    {
      tier: tenantTier,
      model: requestedModel,
      selectedProvider: best.provider.name,
      score: best.score.toFixed(3),
      reason: best.reason,
    },
    '[DynamicRouting] Provider selecionado via routing dinâmico',
  );

  return {
    selectedProvider: best.provider,
    effectiveModel: requestedModel,
    score: best.score,
    reason: best.reason,
  };
}

/**
 * Limpa o cache de latência (usado apenas em testes).
 */
export function __resetLatencyCacheForTests(): void {
  latencyCache.clear();
}
