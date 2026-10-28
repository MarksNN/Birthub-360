import { createHash } from 'node:crypto';
import type Redis from 'ioredis';
import type {
  ISemanticCachePort,
  SemanticCacheEntry,
  SemanticCacheKeyParams,
} from '../../../shared/contracts/semanticCache.contract.js';
import { logger } from '../../logger.js';
import { cacheConnection, redisConfigured } from '../../queue/redis.js';

export function computeDynamicTTL(purpose: string): number {
  const normalized = purpose.toLowerCase();
  if (
    normalized === 'firmographics' ||
    normalized.startsWith('firmographic') ||
    normalized.includes('firmographic') ||
    normalized === 'cnpj' ||
    normalized === 'company_profile'
  ) {
    return 7 * 86400; // 7 dias (604.800s) para pesquisas e dados firmográficos públicos
  }
  return 86400; // 24 horas (86.400s) default para enriquecimento de leads e queries contextuais
}

export class SemanticCacheService implements ISemanticCachePort {
  private cacheStore = new Map<string, SemanticCacheEntry>();
  private tenantKeys = new Map<string, Set<string>>();
  private redis: Redis | null = null;

  constructor(customRedis?: Redis | null) {
    if (customRedis !== undefined) {
      this.redis = customRedis;
    } else if (redisConfigured) {
      this.redis = cacheConnection;
    }
  }

  /**
   * Gera a chave de cache estritamente isolada por tenant e versões de modelo/prompt.
   */
  generateKey(params: SemanticCacheKeyParams): string {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: Cache semântico exige organizationId na chave');
    }

    const promptHash = createHash('sha256').update(params.promptText.trim()).digest('hex');
    const composite = [
      params.organizationId,
      params.model,
      params.promptVersion,
      params.knowledgeVersion ?? 1,
      params.purpose,
      promptHash,
    ].join(':');

    return createHash('sha256').update(composite).digest('hex');
  }

  private getRedisKey(organizationId: string, hashKey: string): string {
    return `birthhub:cache:${organizationId}:${hashKey}`;
  }

  private getTenantKeySet(organizationId: string): string {
    return `birthhub:cache:tenants:${organizationId}`;
  }

  /**
   * Recupera resposta do cache respeitando isolamento de tenant e validade de TTL.
   * Tenta Redis primariamente se configurado; recorre ao cache local em memória como fallback.
   */
  async get(params: SemanticCacheKeyParams): Promise<string | null> {
    const key = this.generateKey(params);
    const redisKey = this.getRedisKey(params.organizationId, key);

    // 1. Tentativa no Redis distribuído (se ativo)
    if (this.redis) {
      try {
        const raw = await this.redis.get(redisKey);
        if (raw) {
          const entry = JSON.parse(raw) as SemanticCacheEntry;
          logger.info(
            {
              organizationId: params.organizationId,
              model: params.model,
              purpose: params.purpose,
              tokensSaved: entry.tokensSaved,
              source: 'redis',
            },
            'SemanticCache: Cache hit distribuído válido! Economia de tokens e latência aplicada',
          );
          return entry.cachedResponse;
        }
      } catch (err: any) {
        logger.warn(
          { organizationId: params.organizationId, error: err?.message },
          'SemanticCache: Falha ao consultar Redis, recorrendo ao fallback em memória',
        );
      }
    }

    // 2. Fallback em memória
    const entry = this.cacheStore.get(key);
    if (!entry) {
      return null;
    }

    const ageSeconds = (Date.now() - new Date(entry.createdAt).getTime()) / 1000;
    if (ageSeconds > entry.ttlSeconds) {
      // Expirado
      this.cacheStore.delete(key);
      const tenantSet = this.tenantKeys.get(params.organizationId);
      tenantSet?.delete(key);
      return null;
    }

    logger.info(
      {
        organizationId: params.organizationId,
        model: params.model,
        purpose: params.purpose,
        tokensSaved: entry.tokensSaved,
        source: 'memory',
      },
      'SemanticCache: Cache hit em memória válido! Economia de tokens e latência aplicada',
    );

    return entry.cachedResponse;
  }

  /**
   * Armazena uma resposta no cache.
   * Não armazena se for classificado como CONFIDENTIAL para proteção rigorosa de dados.
   * Aplica TTL dinâmico inteligente (7 dias firmográfico, 24h geral).
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
    if (metadata.classification === 'CONFIDENTIAL') {
      logger.info(
        { organizationId: params.organizationId, purpose: params.purpose },
        'SemanticCache: Resposta confidencial detectada. Descarte intencional de cache para proteção de PII/segredos.',
      );
      return;
    }

    const key = this.generateKey(params);
    const ttlSeconds = metadata.ttlSeconds ?? computeDynamicTTL(params.purpose);

    const entry: SemanticCacheEntry = {
      cachedResponse: response,
      tokensSaved: metadata.tokens,
      costSavedUsd: metadata.costUsd,
      classification: metadata.classification,
      createdAt: new Date().toISOString(),
      ttlSeconds,
    };

    // 1. Armazena na memória local
    this.cacheStore.set(key, entry);
    if (!this.tenantKeys.has(params.organizationId)) {
      this.tenantKeys.set(params.organizationId, new Set());
    }
    this.tenantKeys.get(params.organizationId)?.add(key);

    // 2. Persiste no Redis se configurado
    if (this.redis) {
      try {
        const redisKey = this.getRedisKey(params.organizationId, key);
        const tenantKeySet = this.getTenantKeySet(params.organizationId);

        await this.redis.set(redisKey, JSON.stringify(entry), 'EX', ttlSeconds);
        await this.redis.sadd(tenantKeySet, redisKey);
        await this.redis.expire(tenantKeySet, Math.max(ttlSeconds, 7 * 86400));
      } catch (err: any) {
        logger.warn(
          { organizationId: params.organizationId, error: err?.message },
          'SemanticCache: Falha ao persistir no Redis; cache retido em memória local',
        );
      }
    }
  }

  /**
   * Invalida todas as chaves do tenant (ex.: ao atualizar Playbook, revogar consentimento ou alterar documentos).
   * Limpa tanto memória local quanto chaves registradas no Redis do tenant.
   */
  async invalidateTenant(organizationId: string): Promise<number> {
    const keys = this.tenantKeys.get(organizationId);
    let count = 0;

    if (keys && keys.size > 0) {
      for (const key of keys) {
        if (this.cacheStore.delete(key)) {
          count += 1;
        }
      }
      this.tenantKeys.delete(organizationId);
    }

    if (this.redis) {
      try {
        const tenantKeySet = this.getTenantKeySet(organizationId);
        const redisKeys = await this.redis.smembers(tenantKeySet);
        if (redisKeys.length > 0) {
          await this.redis.del(...redisKeys);
          count = Math.max(count, redisKeys.length);
        }
        await this.redis.del(tenantKeySet);
      } catch (err: any) {
        logger.warn(
          { organizationId, error: err?.message },
          'SemanticCache: Erro ao invalidar chaves do tenant no Redis',
        );
      }
    }

    logger.warn(
      { organizationId, invalidatedCount: count },
      'SemanticCache: Invalidação em massa de cache do tenant concluída',
    );

    return count;
  }

  clear(): void {
    this.cacheStore.clear();
    this.tenantKeys.clear();
  }
}

export const semanticCache = new SemanticCacheService();
