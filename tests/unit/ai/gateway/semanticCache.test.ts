/**
 * Testes Unitários de Cache Semântico em Redis com Isolamento Multi-Tenant
 * Agentes: 16 (Runtime e Escala), 10 (Infraestrutura/SRE) & 23 (FinOps de IA)
 * Handoff: 00-para-16-10-semantic-cache-redis.md
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  CACHE_TTL,
  SemanticCacheService,
} from '../../../../src/lib/ai/gateway/semanticCache.js';
import {
  setRedisClientForTesting,
  resetRedisClientForTesting,
  type IRedisClient,
} from '../../../../src/lib/redis/client.js';

describe('SemanticCacheService — Redis & Multi-Tenant Isolation', () => {
  let cache: SemanticCacheService;
  let mockRedisData: Map<string, { value: string; ttl?: number }>;
  let mockRedisClient: IRedisClient;

  beforeEach(async () => {
    mockRedisData = new Map();

    mockRedisClient = {
      status: 'ready',
      async get(key: string): Promise<string | null> {
        const item = mockRedisData.get(key);
        return item ? item.value : null;
      },
      async set(key: string, value: string, ...args: (string | number)[]): Promise<string | null> {
        let ttl: number | undefined;
        if (args[0] === 'EX' && typeof args[1] === 'number') {
          ttl = args[1];
        }
        mockRedisData.set(key, { value, ttl });
        return 'OK';
      },
      async del(...keys: string[]): Promise<number> {
        let count = 0;
        for (const k of keys) {
          if (mockRedisData.delete(k)) count++;
        }
        return count;
      },
      async scan(cursor: string | number, ...args: (string | number)[]): Promise<[string, string[]]> {
        const patternIndex = args.indexOf('MATCH');
        const pattern = patternIndex >= 0 ? (args[patternIndex + 1] as string) : '*';
        const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
        const matchingKeys = Array.from(mockRedisData.keys()).filter((k) => regex.test(k));
        return ['0', matchingKeys];
      },
      async exists(...keys: string[]): Promise<number> {
        let count = 0;
        for (const k of keys) {
          if (mockRedisData.has(k)) count++;
        }
        return count;
      },
      async expire(key: string, seconds: number): Promise<number> {
        const item = mockRedisData.get(key);
        if (item) {
          item.ttl = seconds;
          return 1;
        }
        return 0;
      },
      async ttl(key: string): Promise<number> {
        const item = mockRedisData.get(key);
        return item?.ttl ?? -1;
      },
      async ping(): Promise<string> {
        return 'PONG';
      },
    };

    setRedisClientForTesting(mockRedisClient);
    cache = new SemanticCacheService();
    await cache.clear();
  });

  // CRITÉRIO DE SUCESSO 1: Hit em < 100ms
  it('deve armazenar e recuperar resposta em cache com latência comprovada < 100ms', async () => {
    const params = {
      organizationId: 'tenant-clinica-alfa',
      model: 'local-llama3',
      promptVersion: 'v1.0',
      purpose: 'firmographic-enrichment',
      promptText: 'Pesquisa cadastral da empresa Alpha Saúde Ltda',
    };

    await cache.set(params, JSON.stringify({ cnae: '8610-1/01', capitalSocial: 500000 }), {
      tokens: 450,
      costUsd: 0.0003,
      classification: 'INTERNAL',
    });

    const start = performance.now();
    const cached = await cache.get(params);
    const durationMs = performance.now() - start;

    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!)).toEqual({ cnae: '8610-1/01', capitalSocial: 500000 });
    expect(durationMs).toBeLessThan(100); // Critério estrito de performance (< 100ms)
  });

  // CRITÉRIO DE SUCESSO 2: Isolamento Multi-Tenant estrito
  it('garante isolamento rigoroso entre organizações (Tenant B nunca lê dados de Tenant A)', async () => {
    const promptText = 'Diagnóstico comercial e faturamento presumido de concorrente';

    const paramsTenantA = {
      organizationId: 'org-hospital-santa-casa',
      model: 'claude-3-haiku',
      promptVersion: 'v2.1',
      purpose: 'account-diagnostic',
      promptText,
    };

    const paramsTenantB = {
      organizationId: 'org-laboratorio-fleury',
      model: 'claude-3-haiku',
      promptVersion: 'v2.1',
      purpose: 'account-diagnostic',
      promptText, // Mesmo prompt e parâmetros, porém tenant diferente!
    };

    // Tenant A grava
    await cache.set(paramsTenantA, 'Análise Confidencial Santa Casa: Margem 18%', {
      tokens: 600,
      costUsd: 0.0006,
      classification: 'INTERNAL',
    });

    // Tenant B tenta consultar
    const resultTenantB = await cache.get(paramsTenantB);
    expect(resultTenantB).toBeNull(); // Isolamento confirmado!

    // Tenant A consulta com sucesso
    const resultTenantA = await cache.get(paramsTenantA);
    expect(resultTenantA).toBe('Análise Confidencial Santa Casa: Margem 18%');

    // Chaves no Redis devem ter namespace estrito por organizationId
    const keys = Array.from(mockRedisData.keys());
    expect(keys.length).toBe(1);
    expect(keys[0].startsWith('semcache:org-hospital-santa-casa:')).toBe(true);
    expect(keys[0].includes('org-laboratorio-fleury')).toBe(false);
  });

  // CRITÉRIO DE SUCESSO 3: Requisições firmográficas repetidas com normalização
  it('deve normalizar requisições firmográficas repetidas (espaços, domínios e pontuação de CNPJ)', async () => {
    const rawInput1 = {
      domain: 'https://WWW.HospitalSaoLuiz.com.br/',
      cnpj: '12.345.678/0001-90',
      companyName: 'Hospital São Luiz S.A.',
    };

    const rawInput2 = {
      companyName: 'Hospital São Luiz S.A.', // ordem invertida
      cnpj: '12345678000190', // sem pontuação
      domain: 'hospitalsaoluiz.com.br', // sem protocolo nem www
    };

    const normalized1 = cache.normalizeFirmographicInput(rawInput1);
    const normalized2 = cache.normalizeFirmographicInput(rawInput2);

    expect(normalized1).toBe(normalized2);

    const params1 = {
      organizationId: 'org-tenant-corp',
      model: 'local-llama3',
      promptVersion: 'v1.0',
      purpose: 'firmographic-query',
      promptText: normalized1,
    };

    const params2 = {
      organizationId: 'org-tenant-corp',
      model: 'local-llama3',
      promptVersion: 'v1.0',
      purpose: 'firmographic-query',
      promptText: normalized2,
    };

    // Cacheia usando params1
    await cache.set(params1, '{"status": "ATIVO", "porte": "DEMAIS"}', {
      tokens: 300,
      costUsd: 0.0002,
      classification: 'PUBLIC',
    });

    // Recupera usando params2 (mesma requisição normalizada)
    const cachedHit = await cache.get(params2);
    expect(cachedHit).toBe('{"status": "ATIVO", "porte": "DEMAIS"}');
  });

  // CRITÉRIO DE SUCESSO 4: TTL dinâmico e configurável
  it('aplica TTL dinâmico conforme a categoria da requisição (7 dias para dados firmográficos públicos, 24h para enriquecimento)', async () => {
    // 1. Dados firmográficos públicos -> 7 dias (604.800s)
    const paramsFirmographic = {
      organizationId: 'org-1',
      model: 'local-llama3',
      promptVersion: 'v1',
      purpose: 'firmographic-public-data',
      promptText: 'Dados de CNPJ 00.000.000/0001-91 na Receita',
    };

    await cache.set(paramsFirmographic, 'Dados RFB Públicos', {
      tokens: 200,
      costUsd: 0.0001,
      classification: 'PUBLIC',
    });

    const keyFirmographic = cache.generateKey(paramsFirmographic);
    const redisItemFirmographic = mockRedisData.get(keyFirmographic);
    expect(redisItemFirmographic?.ttl).toBe(CACHE_TTL.FIRMOGRAPHIC_PUBLIC); // 604800 segundos = 7 dias

    // 2. Enriquecimento padrão -> 24h (86.400s)
    const paramsEnrichment = {
      organizationId: 'org-1',
      model: 'local-llama3',
      promptVersion: 'v1',
      purpose: 'enrichment-service',
      promptText: 'Enriquecimento de lead comercial',
    };

    await cache.set(paramsEnrichment, 'Dados de Enriquecimento', {
      tokens: 250,
      costUsd: 0.0002,
      classification: 'INTERNAL',
    });

    const keyEnrichment = cache.generateKey(paramsEnrichment);
    const redisItemEnrichment = mockRedisData.get(keyEnrichment);
    expect(redisItemEnrichment?.ttl).toBe(CACHE_TTL.ENRICHMENT); // 86400 segundos = 24h

    // 3. TTL customizado explícito
    const paramsCustom = {
      organizationId: 'org-1',
      model: 'local-llama3',
      promptVersion: 'v1',
      purpose: 'custom-ttl',
      promptText: 'Consulta com TTL específico',
    };

    await cache.set(paramsCustom, 'Resposta Custom', {
      tokens: 100,
      costUsd: 0.0001,
      classification: 'INTERNAL',
      ttlSeconds: 1800, // 30 minutos
    });

    const keyCustom = cache.generateKey(paramsCustom);
    const redisItemCustom = mockRedisData.get(keyCustom);
    expect(redisItemCustom?.ttl).toBe(1800);
  });

  // CRITÉRIO DE SUCESSO 5: Segurança e LGPD — Rejeição de CONFIDENTIAL e Erro sem organizationId
  it('não deve armazenar respostas CONFIDENTIAL no cache e deve exigir organizationId', async () => {
    // 1. Respostas CONFIDENTIAL descartadas
    const paramsConfidential = {
      organizationId: 'org-segura',
      model: 'local-llama3',
      promptVersion: 'v1',
      purpose: 'secret-audit',
      promptText: 'Chave privada e token de acesso bancário',
    };

    await cache.set(paramsConfidential, 'segredo-12345', {
      tokens: 1000,
      costUsd: 0.001,
      classification: 'CONFIDENTIAL',
    });

    expect(await cache.get(paramsConfidential)).toBeNull();
    expect(mockRedisData.size).toBe(0);

    // 2. Tenancy violation se organizationId for vazio ou ausente
    expect(() =>
      cache.generateKey({
        organizationId: '',
        model: 'm',
        promptVersion: 'v',
        purpose: 'p',
        promptText: 'txt',
      }),
    ).toThrowError(/Tenancy violation/i);
  });

  // CRITÉRIO DE SUCESSO 6: Invalidação de tenant limpa apenas o tenant alvo
  it('invalidação de tenant remove apenas as chaves do tenant especificado no Redis e na memória local', async () => {
    const paramsOrg1A = {
      organizationId: 'org-tenant-1',
      model: 'm',
      promptVersion: 'v',
      purpose: 'p1',
      promptText: 'prompt 1',
    };
    const paramsOrg1B = {
      organizationId: 'org-tenant-1',
      model: 'm',
      promptVersion: 'v',
      purpose: 'p2',
      promptText: 'prompt 2',
    };
    const paramsOrg2 = {
      organizationId: 'org-tenant-2',
      model: 'm',
      promptVersion: 'v',
      purpose: 'p1',
      promptText: 'prompt 1',
    };

    await cache.set(paramsOrg1A, 'R1A', { tokens: 10, costUsd: 0.0001, classification: 'PUBLIC' });
    await cache.set(paramsOrg1B, 'R1B', { tokens: 20, costUsd: 0.0001, classification: 'PUBLIC' });
    await cache.set(paramsOrg2, 'R2', { tokens: 30, costUsd: 0.0001, classification: 'PUBLIC' });

    expect(mockRedisData.size).toBe(3);

    const deleted = await cache.invalidateTenant('org-tenant-1');
    expect(deleted).toBe(2);

    expect(await cache.get(paramsOrg1A)).toBeNull();
    expect(await cache.get(paramsOrg1B)).toBeNull();
    // Tenant 2 permanece 100% intacto!
    expect(await cache.get(paramsOrg2)).toBe('R2');
  });

  // CRITÉRIO DE SUCESSO 7: FinOps & Economia de Tokens (Agente 23)
  it('contabiliza métricas de FinOps (tokens economizados, USD poupado e latência média)', async () => {
    const params = {
      organizationId: 'org-finops',
      model: 'local-llama3',
      promptVersion: 'v1',
      purpose: 'finops-test',
      promptText: 'Cálculo de margem e ROI de pipeline comercial',
    };

    await cache.set(params, 'Resultado de Margem: 24.5%', {
      tokens: 800,
      costUsd: 0.0016,
      classification: 'INTERNAL',
    });

    // 2 hits consecutivos
    await cache.get(params);
    await cache.get(params);

    const metrics = cache.getFinOpsMetrics();
    expect(metrics.totalHits).toBe(2);
    expect(metrics.totalTokensSaved).toBe(1600); // 800 * 2
    expect(metrics.totalCostSavedUsd).toBeCloseTo(0.0032, 4); // 0.0016 * 2
    expect(metrics.avgHitLatencyMs).toBeGreaterThanOrEqual(0);
  });

  // CRITÉRIO DE SUCESSO 8: Resiliência e Fail-Safe (Agente 16 & 10)
  it('deve degradar graciosamente para o fallback em memória quando o Redis estiver indisponível', async () => {
    // Simula falha total de conexão do Redis
    const faultyRedisClient: IRedisClient = {
      status: 'ready',
      async get(): Promise<string | null> {
        throw new Error('ECONNREFUSED: Redis cluster unreachable');
      },
      async set(): Promise<string | null> {
        throw new Error('ETIMEDOUT: Redis timeout');
      },
      async del(): Promise<number> {
        throw new Error('ECONNRESET');
      },
      async scan(): Promise<[string, string[]]> {
        throw new Error('ECONNREFUSED');
      },
      async exists(): Promise<number> {
        return 0;
      },
      async expire(): Promise<number> {
        return 0;
      },
      async ttl(): Promise<number> {
        return -1;
      },
      async ping(): Promise<string> {
        throw new Error('DOWN');
      },
    };

    setRedisClientForTesting(faultyRedisClient);

    const params = {
      organizationId: 'org-resilient',
      model: 'local-llama3',
      promptVersion: 'v1',
      purpose: 'failover-test',
      promptText: 'Teste de alta disponibilidade sem Redis',
    };

    // set() não deve estourar erro
    await expect(
      cache.set(params, 'Resposta salva no fallback local', {
        tokens: 300,
        costUsd: 0.0003,
        classification: 'INTERNAL',
      }),
    ).resolves.not.toThrow();

    // get() deve recuperar do fallback local
    const cached = await cache.get(params);
    expect(cached).toBe('Resposta salva no fallback local');
  });
});
