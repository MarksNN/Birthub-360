/**
 * Semantic Cache em Redis com Isolamento Multi-Tenant e FinOps de IA
 * Agentes: 16 (Runtime e Escala), 10 (Infraestrutura/SRE) & 23 (FinOps de IA)
 * Origem: Handoff 00-para-16-10-semantic-cache-redis.md
 *
 * Implementa cache semântico de respostas de IA e requisições firmográficas repetidas,
 * com namespace estrito por organizationId, TTL dinâmico configurável,
 * expiração nativa no Redis, fallback em memória resiliente e métricas FinOps.
 */

import { createHash } from 'node:crypto';
import { logger } from '../../logger.js';
import { getRedisClient, isRedisConfigured } from '../../redis/client.js';
import type {
  ISemanticCachePort,
  SemanticCacheEntry,
  SemanticCacheKeyParams,
} from '../../../shared/contracts/semanticCache.contract.js';

/** TTLs Padrão por Categoria */
export const CACHE_TTL = {
  /** 24 horas para enriquecimento de leads e empresas padrão */
  ENRICHMENT: 86_400,
  /** 7 dias para dados firmográficos públicos (ex.: Receita Federal, CNPJ, dados cadastrais estáveis) */
  FIRMOGRAPHIC_PUBLIC: 604_800,
  /** 12 horas para diagnósticos de conta e análises de maturidade */
  ACCOUNT_DIAGNOSTIC: 43_200,
  /** 1 hora para pesquisas rápidas e consultas altamente dinâmicas */
  QUICK_SEARCH: 3_600,
  /** Default geral: 24 horas */
  DEFAULT: 86_400,
} as const;

export const SEMANTIC_CACHE_KEY_PREFIX = 'semcache';

export interface SemanticCacheFinOpsMetrics {
  totalHits: number;
  totalMisses: number;
  totalTokensSaved: number;
  totalCostSavedUsd: number;
  avgHitLatencyMs: number;
}

function isClientReady(client: any): boolean {
  if (client && typeof client === 'object' && 'status' in client && typeof client.status === 'string') {
    return client.status === 'ready';
  }
  return true;
}

export class SemanticCacheService implements ISemanticCachePort {
  private localFallbackStore = new Map<string, { entry: SemanticCacheEntry; expiresAt: number }>();
  private localTenantKeys = new Map<string, Set<string>>();

  private finopsMetrics: SemanticCacheFinOpsMetrics = {
    totalHits: 0,
    totalMisses: 0,
    totalTokensSaved: 0,
    totalCostSavedUsd: 0,
    avgHitLatencyMs: 0,
  };
  private totalHitLatencyMs = 0;

  /**
   * Normaliza strings de entrada para evitar redundâncias de cache por whitespace,
   * capitalização ou quebras de linha em consultas de IA.
   */
  normalizePrompt(promptText: string): string {
    if (!promptText) return '';
    return promptText
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }

  /**
   * Normaliza inputs firmográficos estruturados (ex.: CNPJ, domínio, nome de empresa)
   * garantindo determinismo canônico das propriedades.
   */
  normalizeFirmographicInput(input: Record<string, unknown> | string): string {
    if (typeof input === 'string') {
      return this.normalizePrompt(input).toLowerCase();
    }
    if (!input || typeof input !== 'object') {
      return '';
    }

    const sortedKeys = Object.keys(input).sort();
    const normalizedEntries = sortedKeys.map((key) => {
      let val = input[key];
      if (typeof val === 'string') {
        const trimmed = val.trim();
        // Normalização especial para domínios e CNPJs comuns
        if (key.toLowerCase().includes('domain') || key.toLowerCase().includes('site')) {
          val = trimmed.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
        } else if (key.toLowerCase().includes('cnpj')) {
          val = trimmed.replace(/\D/g, '');
        } else {
          val = trimmed;
        }
      }
      return `${key}:${JSON.stringify(val)}`;
    });

    return normalizedEntries.join('|');
  }

  /**
   * Resolve o TTL adequado baseado na finalidade (purpose) ou classificação.
   */
  resolveTtlSeconds(params: {
    purpose?: string;
    classification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
    ttlSeconds?: number;
  }): number {
    if (params.ttlSeconds && params.ttlSeconds > 0) {
      return params.ttlSeconds;
    }

    const purposeLower = (params.purpose || '').toLowerCase();

    if (
      params.classification === 'PUBLIC' ||
      purposeLower.includes('firmographic') ||
      purposeLower.includes('firmografico') ||
      purposeLower.includes('cnpj') ||
      purposeLower.includes('receita')
    ) {
      return CACHE_TTL.FIRMOGRAPHIC_PUBLIC;
    }

    if (
      purposeLower.includes('diagnostic') ||
      purposeLower.includes('diagnostico') ||
      purposeLower.includes('account-maturity')
    ) {
      return CACHE_TTL.ACCOUNT_DIAGNOSTIC;
    }

    if (purposeLower.includes('quick') || purposeLower.includes('volatile')) {
      return CACHE_TTL.QUICK_SEARCH;
    }

    if (purposeLower.includes('enrich') || purposeLower.includes('enriquecimento')) {
      return CACHE_TTL.ENRICHMENT;
    }

    return CACHE_TTL.DEFAULT;
  }

  /**
   * Gera a chave de cache estritamente isolada por tenant (organizationId).
   * Formato padronizado: semcache:{organizationId}:{hash}
   * Conforme modelo de ameaças TH-03 (PII e isolamento).
   */
  generateKey(params: SemanticCacheKeyParams): string {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: Cache semântico exige organizationId na chave');
    }

    const normalizedPrompt = this.normalizePrompt(params.promptText);
    const promptHash = createHash('sha256').update(normalizedPrompt).digest('hex');

    const composite = [
      params.organizationId.trim(),
      params.model?.trim() || 'default',
      params.promptVersion?.trim() || 'v1',
      params.knowledgeVersion ?? 1,
      params.purpose?.trim() || 'general',
      promptHash,
    ].join(':');

    const compositeHash = createHash('sha256').update(composite).digest('hex');
    return `${SEMANTIC_CACHE_KEY_PREFIX}:${params.organizationId.trim()}:${compositeHash}`;
  }

  /**
   * Recupera resposta do cache com medição de latência e garantia de isolamento.
   * Hit garantido em < 100ms.
   */
  async get(params: SemanticCacheKeyParams): Promise<string | null> {
    const startTime = performance.now();

    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: Cache semântico exige organizationId na chave');
    }

    const key = this.generateKey(params);

    // 1. Tentar leitura do Redis
    try {
      const redis = getRedisClient();
      if (isClientReady(redis)) {
        const rawData = await redis.get(key);

        if (rawData) {
          const entry = JSON.parse(rawData) as SemanticCacheEntry;
          const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
          this.recordHit(entry, latencyMs);

          logger.info(
            {
              organizationId: params.organizationId,
              model: params.model,
              purpose: params.purpose,
              tokensSaved: entry.tokensSaved,
              latencyMs,
              source: 'redis',
            },
            'SemanticCache: Cache hit válido no Redis! Economia de tokens e latência aplicada',
          );

          return entry.cachedResponse;
        }
      }
    } catch (err) {
      logger.warn(
        { err, organizationId: params.organizationId, key },
        'SemanticCache: Falha ao ler do Redis; consultando fallback local',
      );
    }

    // 2. Fallback de cache local em memória caso Redis esteja offline ou em miss
    const localItem = this.localFallbackStore.get(key);
    if (localItem) {
      if (Date.now() <= localItem.expiresAt) {
        const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
        this.recordHit(localItem.entry, latencyMs);

        logger.info(
          {
            organizationId: params.organizationId,
            model: params.model,
            purpose: params.purpose,
            tokensSaved: localItem.entry.tokensSaved,
            latencyMs,
            source: 'memory-fallback',
          },
          'SemanticCache: Cache hit válido no fallback local!',
        );

        return localItem.entry.cachedResponse;
      }
      // Expirado localmente
      this.localFallbackStore.delete(key);
      this.localTenantKeys.get(params.organizationId)?.delete(key);
    }

    this.finopsMetrics.totalMisses += 1;
    return null;
  }

  /**
   * Armazena uma resposta no cache com TTL configurável no Redis.
   * Não armazena se classificado como CONFIDENTIAL (LGPD e segurança).
   */
  async set(
    params: SemanticCacheKeyParams,
    response: string,
    metadata: {
      tokens: number;
      costUsd: number;
      classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
      ttlSeconds?: number;
    },
  ): Promise<void> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: Cache semântico exige organizationId na chave');
    }

    // Proteção rigorosa de dados: CONFIDENTIAL é descartado de cache de inferência
    if (metadata.classification === 'CONFIDENTIAL') {
      logger.info(
        { organizationId: params.organizationId, purpose: params.purpose },
        'SemanticCache: Resposta confidencial detectada. Descarte intencional de cache para proteção de PII/segredos.',
      );
      return;
    }

    const key = this.generateKey(params);
    const ttlSeconds = this.resolveTtlSeconds({
      purpose: params.purpose,
      classification: metadata.classification,
      ttlSeconds: metadata.ttlSeconds,
    });

    const entry: SemanticCacheEntry = {
      cachedResponse: response,
      tokensSaved: metadata.tokens,
      costSavedUsd: metadata.costUsd,
      classification: metadata.classification,
      createdAt: new Date().toISOString(),
      ttlSeconds,
    };

    const serialized = JSON.stringify(entry);

    // 1. Armazenar no Redis com TTL nativo (EX seconds)
    try {
      const redis = getRedisClient();
      if (isClientReady(redis)) {
        await redis.set(key, serialized, 'EX', ttlSeconds);
      }
    } catch (err) {
      logger.warn(
        { err, organizationId: params.organizationId, key },
        'SemanticCache: Falha ao persistir no Redis; persistindo no fallback local',
      );
    }

    // 2. Sempre manter também no fallback local (para resiliência e rápida recuperação em falha transitória)
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.localFallbackStore.set(key, { entry, expiresAt });

    if (!this.localTenantKeys.has(params.organizationId)) {
      this.localTenantKeys.set(params.organizationId, new Set());
    }
    this.localTenantKeys.get(params.organizationId)?.add(key);
  }

  /**
   * Invalida todas as chaves de um tenant no Redis e na memória local.
   * Usa SCAN no Redis para evitar travar o cluster, e deleta via pipeline/batch.
   */
  async invalidateTenant(organizationId: string): Promise<number> {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId é obrigatório para invalidação');
    }

    const tenantId = organizationId.trim();
    let redisDeletedCount = 0;

    // 1. Invalidação no Redis
    try {
      const redis = getRedisClient();
      if (isClientReady(redis)) {
        const pattern = `${SEMANTIC_CACHE_KEY_PREFIX}:${tenantId}:*`;

        let cursor = '0';
        const keysToDelete: string[] = [];

        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys && keys.length > 0) {
            keysToDelete.push(...keys);
          }
        } while (cursor !== '0');

        if (keysToDelete.length > 0) {
          redisDeletedCount = await redis.del(...keysToDelete);
        }
      }
    } catch (err) {
      logger.warn(
        { err, organizationId: tenantId },
        'SemanticCache: Falha na invalidação do Redis; executando limpeza na memória local',
      );
    }

    // 2. Invalidação no fallback local
    let localDeletedCount = 0;
    const localKeys = this.localTenantKeys.get(tenantId);
    if (localKeys) {
      for (const k of localKeys) {
        if (this.localFallbackStore.delete(k)) {
          localDeletedCount += 1;
        }
      }
      this.localTenantKeys.delete(tenantId);
    }

    const deletedCount = Math.max(redisDeletedCount, localDeletedCount);

    logger.warn(
      { organizationId: tenantId, invalidatedCount: deletedCount },
      'SemanticCache: Invalidação em massa de cache do tenant concluída com sucesso',
    );

    return deletedCount;
  }

  /**
   * Limpa cache local e métricas (usado primariamente em testes).
   */
  async clear(): Promise<void> {
    this.localFallbackStore.clear();
    this.localTenantKeys.clear();
    this.finopsMetrics = {
      totalHits: 0,
      totalMisses: 0,
      totalTokensSaved: 0,
      totalCostSavedUsd: 0,
      avgHitLatencyMs: 0,
    };
    this.totalHitLatencyMs = 0;

    try {
      const redis = getRedisClient();
      if (isClientReady(redis)) {
        let cursor = '0';
        const keysToDelete: string[] = [];
        const pattern = `${SEMANTIC_CACHE_KEY_PREFIX}:*`;

        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = nextCursor;
          if (keys && keys.length > 0) {
            keysToDelete.push(...keys);
          }
        } while (cursor !== '0');

        if (keysToDelete.length > 0) {
          await redis.del(...keysToDelete);
        }
      }
    } catch {
      // Ignora falha de Redis em ambiente de teste limpo
    }
  }

  /**
   * Retorna métricas de FinOps acumuladas.
   */
  getFinOpsMetrics(): SemanticCacheFinOpsMetrics {
    return { ...this.finopsMetrics };
  }

  private recordHit(entry: SemanticCacheEntry, latencyMs: number): void {
    this.finopsMetrics.totalHits += 1;
    this.finopsMetrics.totalTokensSaved += entry.tokensSaved || 0;
    this.finopsMetrics.totalCostSavedUsd += entry.costSavedUsd || 0;
    this.totalHitLatencyMs += latencyMs;
    this.finopsMetrics.avgHitLatencyMs =
      Math.round((this.totalHitLatencyMs / this.finopsMetrics.totalHits) * 100) / 100;
  }
}

export const semanticCache = new SemanticCacheService();
