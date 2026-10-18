import { beforeEach, describe, expect, it } from 'vitest';
import { SemanticCacheService } from '../../../src/lib/ai/cache/semanticCache.service.js';

describe('SemanticCacheService Unit Tests', () => {
  let cache: SemanticCacheService;

  beforeEach(() => {
    cache = new SemanticCacheService();
    cache.clear();
  });

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
