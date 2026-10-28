import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeDynamicTTL,
  SemanticCacheService,
} from '../../../src/lib/ai/cache/semanticCache.service.js';

describe('SemanticCacheService Unit Tests', () => {
  let cache: SemanticCacheService;

  beforeEach(() => {
    cache = new SemanticCacheService(null); // Explicitamente sem Redis para testes locais de memória
    cache.clear();
  });

  describe('Dynamic TTL Computation', () => {
    it('should assign 7 days TTL for firmographic and company profile purposes', () => {
      expect(computeDynamicTTL('firmographics')).toBe(7 * 86400);
      expect(computeDynamicTTL('firmographic_enrichment')).toBe(7 * 86400);
      expect(computeDynamicTTL('cnpj')).toBe(7 * 86400);
      expect(computeDynamicTTL('company_profile')).toBe(7 * 86400);
    });

    it('should assign 24 hours TTL for standard approaches and recommendations', () => {
      expect(computeDynamicTTL('social-selling-approach')).toBe(86400);
      expect(computeDynamicTTL('lead_outreach')).toBe(86400);
      expect(computeDynamicTTL('deal_risk_analysis')).toBe(86400);
    });
  });

  describe('In-Memory Operation & Tenancy', () => {
    it('should store and retrieve cached response for matching key parameters', async () => {
      const params = {
        organizationId: 'org-tenant-1',
        model: 'local-llama3',
        promptVersion: 'v1.0',
        purpose: 'social-selling-approach',
        promptText: 'Elaborar abordagem para diretor de TI',
      };

      await cache.set(params, 'Olá Carlos, vimos seu projeto de nuvem...', {
        tokens: 350,
        costUsd: 0.0002,
        classification: 'INTERNAL',
      });

      const cached = await cache.get(params);
      expect(cached).toBe('Olá Carlos, vimos seu projeto de nuvem...');
    });

    it('should return null when retrieving with different tenant (multi-tenant isolation)', async () => {
      const paramsOrgA = {
        organizationId: 'org-tenant-A',
        model: 'local-llama3',
        promptVersion: 'v1.0',
        purpose: 'social-selling-approach',
        promptText: 'Elaborar abordagem para diretor de TI',
      };

      await cache.set(paramsOrgA, 'Resposta da Empresa A', {
        tokens: 300,
        costUsd: 0.0001,
        classification: 'INTERNAL',
      });

      const paramsOrgB = {
        ...paramsOrgA,
        organizationId: 'org-tenant-B',
      };

      const cachedOrgB = await cache.get(paramsOrgB);
      expect(cachedOrgB).toBeNull();
    });

    it('should throw an error if organizationId is missing in generateKey', () => {
      expect(() =>
        cache.generateKey({
          organizationId: '',
          model: 'gpt-4o',
          promptVersion: 'v1',
          purpose: 'test',
          promptText: 'hello',
        }),
      ).toThrow('Tenancy violation: Cache semântico exige organizationId na chave');
    });

    it('should not cache responses marked as CONFIDENTIAL', async () => {
      const params = {
        organizationId: 'org-tenant-1',
        model: 'local-llama3',
        promptVersion: 'v1.0',
        purpose: 'contract-analysis',
        promptText: 'Análise de cláusulas financeiras com CPF e senhas',
      };

      await cache.set(params, 'Valores confidenciais analisados', {
        tokens: 500,
        costUsd: 0.0005,
        classification: 'CONFIDENTIAL',
      });

      const cached = await cache.get(params);
      expect(cached).toBeNull();
    });

    it('should invalidate tenant cache completely upon request', async () => {
      const params1 = {
        organizationId: 'org-tenant-1',
        model: 'local-llama3',
        promptVersion: 'v1.0',
        purpose: 'summary-1',
        promptText: 'Texto 1',
      };
      const params2 = {
        organizationId: 'org-tenant-1',
        model: 'local-llama3',
        promptVersion: 'v1.0',
        purpose: 'summary-2',
        promptText: 'Texto 2',
      };

      await cache.set(params1, 'Resp 1', { tokens: 100, costUsd: 0.0001, classification: 'PUBLIC' });
      await cache.set(params2, 'Resp 2', { tokens: 120, costUsd: 0.0001, classification: 'PUBLIC' });

      expect(await cache.get(params1)).toBe('Resp 1');

      const count = await cache.invalidateTenant('org-tenant-1');
      expect(count).toBe(2);

      expect(await cache.get(params1)).toBeNull();
      expect(await cache.get(params2)).toBeNull();
    });
  });

  describe('Redis Distributed Integration & Fallback', () => {
    it('should interact with Redis client when available', async () => {
      const mockRedisStore = new Map<string, string>();
      const mockRedisSets = new Map<string, Set<string>>();

      const mockRedis: any = {
        get: vi.fn(async (key: string) => mockRedisStore.get(key) || null),
        set: vi.fn(async (key: string, val: string, _mode?: string, _ttl?: number) => {
          mockRedisStore.set(key, val);
          return 'OK';
        }),
        sadd: vi.fn(async (setName: string, key: string) => {
          if (!mockRedisSets.has(setName)) mockRedisSets.set(setName, new Set());
          mockRedisSets.get(setName)!.add(key);
          return 1;
        }),
        expire: vi.fn(async () => 1),
        smembers: vi.fn(async (setName: string) => Array.from(mockRedisSets.get(setName) || [])),
        del: vi.fn(async (...keys: string[]) => {
          for (const k of keys) {
            mockRedisStore.delete(k);
            mockRedisSets.delete(k);
          }
          return keys.length;
        }),
      };

      const redisCache = new SemanticCacheService(mockRedis);

      const params = {
        organizationId: 'org-redis-tenant',
        model: 'claude-3-5-sonnet',
        promptVersion: 'v2',
        purpose: 'firmographics',
        promptText: 'Pesquisa cadastral de hospital',
      };

      await redisCache.set(params, 'Dossiê do Hospital Santa Clara', {
        tokens: 450,
        costUsd: 0.001,
        classification: 'PUBLIC',
      });

      // Validar chamada ao Redis com TTL de 7 dias (604800s)
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('birthhub:cache:org-redis-tenant:'),
        expect.stringContaining('Dossiê do Hospital Santa Clara'),
        'EX',
        604800,
      );

      // Obter do Redis
      const result = await redisCache.get(params);
      expect(result).toBe('Dossiê do Hospital Santa Clara');
      expect(mockRedis.get).toHaveBeenCalled();

      // Invalidação por tenant
      const invalidatedCount = await redisCache.invalidateTenant('org-redis-tenant');
      expect(invalidatedCount).toBeGreaterThanOrEqual(1);
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should gracefully fallback to memory if Redis get fails', async () => {
      const mockFailingRedis: any = {
        get: vi.fn(async () => {
          throw new Error('Redis connection timeout');
        }),
        set: vi.fn(async () => {
          throw new Error('Redis connection error');
        }),
      };

      const resilientCache = new SemanticCacheService(mockFailingRedis);

      const params = {
        organizationId: 'org-resilient',
        model: 'gpt-4o-mini',
        promptVersion: 'v1',
        purpose: 'general',
        promptText: 'Consulta resiliente',
      };

      // Set should not crash despite Redis error
      await resilientCache.set(params, 'Resposta resiliente guardada em memória', {
        tokens: 150,
        costUsd: 0.0001,
        classification: 'INTERNAL',
      });

      // Get should fallback to memory without throwing
      const result = await resilientCache.get(params);
      expect(result).toBe('Resposta resiliente guardada em memória');
    });
  });
});
