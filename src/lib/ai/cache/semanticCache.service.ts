/**
 * Semantic Cache Service — Re-export e compatibilidade retroativa
 * Canonical implementation: src/lib/ai/gateway/semanticCache.ts
 * Donos: Agente 16 (Runtime), Agente 10 (Infra) & Agente 23 (FinOps)
 */

export {
  CACHE_TTL,
  SEMANTIC_CACHE_KEY_PREFIX,
  SemanticCacheService,
  semanticCache,
} from '../gateway/semanticCache.js';
export type { SemanticCacheFinOpsMetrics } from '../gateway/semanticCache.js';
