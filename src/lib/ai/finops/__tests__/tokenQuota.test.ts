import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const aggregateMock = vi.fn();
const findUniqueMock = vi.fn();
const groupByMock = vi.fn();

vi.mock('../../../prisma.js', () => ({
  prisma: {
    aILog: {
      aggregate: (...args: unknown[]) => aggregateMock(...args),
      groupBy: (...args: unknown[]) => groupByMock(...args),
    },
    organization: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

vi.mock('../../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Redis mock: simula indisponibilidade para testar resiliência e fallback em memória
vi.mock('../../../queue/redis.js', () => ({
  cacheConnection: {
    get: vi.fn().mockRejectedValue(new Error('Redis mock indisponível')),
    set: vi.fn().mockRejectedValue(new Error('Redis mock indisponível')),
    del: vi.fn().mockResolvedValue(1),
  },
}));

const mockLangfuseEvent = vi.fn();
vi.mock('../../../langfuse.js', () => ({
  getLangfuseClient: vi.fn(() => ({
    event: mockLangfuseEvent,
  })),
}));

import { requestContext } from '../../../async-context.js';
import { cacheConnection } from '../../../queue/redis.js';
import {
  aiTokenQuotaAlertTotal,
  aiTokenQuotaBlockedTotal,
  aiTokenQuotaFallbackTotal,
  aiTokenUsageTotal,
} from '../../metrics.js';
import {
  __resetTokenQuotaCacheForTests,
  AiTokenQuotaExceededError,
  normalizeTier,
  TIER_QUOTAS,
  tokenQuotaService,
} from '../tokenQuota.service.js';

describe('TokenQuotaService — Governança e FinOps de Tokens de IA (Onda 15)', () => {
  beforeEach(() => {
    __resetTokenQuotaCacheForTests();
    aggregateMock.mockReset();
    findUniqueMock.mockReset();
    groupByMock.mockReset();
    mockLangfuseEvent.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('normalizeTier', () => {
    it('normaliza planos conhecidos para seus respectivos tiers', () => {
      expect(normalizeTier('free-plan')).toBe('free');
      expect(normalizeTier('starter_monthly')).toBe('starter');
      expect(normalizeTier('pro_annual')).toBe('pro');
      expect(normalizeTier('enterprise_custom')).toBe('enterprise');
    });

    it('adota starter como padrão para valores indefinidos ou vazios', () => {
      expect(normalizeTier(null)).toBe('starter');
      expect(normalizeTier(undefined)).toBe('starter');
      expect(normalizeTier('')).toBe('starter');
      expect(normalizeTier('unknown_plan')).toBe('starter');
    });
  });

  describe('checkTokenQuota — Limiares e Alertas FinOps', () => {
    it('permite chamada com status "ok" quando o consumo está abaixo de 80%', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'org-1',
        wallet: { plan: { slug: 'starter' } },
      });
      // Quota Starter = 500.000 tokens. Consumo = 200.000 (40%)
      aggregateMock.mockResolvedValue({ _sum: { tokens: 200_000 } });

      const result = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-1',
        requestedModel: 'groq/llama-3.3-70b-versatile',
      });

      expect(result.allowed).toBe(true);
      expect(result.status).toBe('ok');
      expect(result.action).toBe('allow');
      expect(result.tier).toBe('starter');
      expect(result.consumedTokens).toBe(200_000);
      expect(result.quotaTokens).toBe(500_000);
      expect(result.percentageUsed).toBe(40);
      expect(result.effectiveModel).toBe('groq/llama-3.3-70b-versatile');
      expect(result.warningAlertTriggered).toBe(false);
      expect(result.exceededAlertTriggered).toBe(false);
      expect(mockLangfuseEvent).not.toHaveBeenCalled();
    });

    it('emite alerta FinOps 80% (warning) quando o consumo atinge 80% da quota, mantendo chamada permitida', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'org-warning',
        wallet: { plan: { slug: 'starter' } },
      });
      // Consumo = 420.000 de 500.000 (84%)
      aggregateMock.mockResolvedValue({ _sum: { tokens: 420_000 } });

      const alertSpy = vi.spyOn(aiTokenQuotaAlertTotal, 'inc');

      const result = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-warning',
        requestedModel: 'groq/llama-3.3-70b-versatile',
      });

      expect(result.allowed).toBe(true);
      expect(result.status).toBe('warning');
      expect(result.action).toBe('allow');
      expect(result.percentageUsed).toBe(84);
      expect(result.warningAlertTriggered).toBe(true);
      expect(result.exceededAlertTriggered).toBe(false);
      expect(result.effectiveModel).toBe('groq/llama-3.3-70b-versatile');

      // Valida métrica Prometheus emitida
      expect(alertSpy).toHaveBeenCalledWith({
        organization: 'org-warning',
        tier: 'starter',
        level: 'warning_80',
      });

      // Valida evento Langfuse emitido
      expect(mockLangfuseEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'finops:quota-warning-80',
          metadata: expect.objectContaining({
            organizationId: 'org-warning',
            percentageUsed: 84,
            tier: 'starter',
          }),
        }),
      );
    });

    it('aplica fallback seguro para modelo econômico quando quota é excedida (>= 100%) em política fallback', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'org-exceeded',
        wallet: { plan: { slug: 'starter' } },
      });
      // Consumo = 520.000 de 500.000 (104%)
      aggregateMock.mockResolvedValue({ _sum: { tokens: 520_000 } });

      const alertSpy = vi.spyOn(aiTokenQuotaAlertTotal, 'inc');
      const fallbackSpy = vi.spyOn(aiTokenQuotaFallbackTotal, 'inc');

      const result = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-exceeded',
        requestedModel: 'openai/gpt-4o',
        policy: 'fallback',
      });

      expect(result.allowed).toBe(true);
      expect(result.status).toBe('exceeded');
      expect(result.action).toBe('fallback');
      expect(result.percentageUsed).toBe(104);
      expect(result.exceededAlertTriggered).toBe(true);
      // Redirecionado para o modelo econômico configurado no tier starter
      expect(result.effectiveModel).toBe(TIER_QUOTAS.starter.economicalFallbackModel);

      // Métricas Prometheus emitidas
      expect(alertSpy).toHaveBeenCalledWith({
        organization: 'org-exceeded',
        tier: 'starter',
        level: 'exceeded_100',
      });
      expect(fallbackSpy).toHaveBeenCalledWith({
        organization: 'org-exceeded',
        from_model: 'openai/gpt-4o',
        to_model: TIER_QUOTAS.starter.economicalFallbackModel,
      });

      // Evento Langfuse emitido
      expect(mockLangfuseEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'finops:quota-exceeded-100',
          metadata: expect.objectContaining({
            organizationId: 'org-exceeded',
            percentageUsed: 104,
          }),
        }),
      );
    });

    it('bloqueia chamada com status "exceeded" quando já estiver no modelo econômico e quota estiver estourada', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'org-hard-blocked',
        wallet: { plan: { slug: 'starter' } },
      });
      aggregateMock.mockResolvedValue({ _sum: { tokens: 550_000 } });

      const blockedSpy = vi.spyOn(aiTokenQuotaBlockedTotal, 'inc');

      const economicalModel = TIER_QUOTAS.starter.economicalFallbackModel;
      const result = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-hard-blocked',
        requestedModel: economicalModel,
        policy: 'fallback',
      });

      expect(result.allowed).toBe(false);
      expect(result.status).toBe('exceeded');
      expect(result.action).toBe('block');
      expect(blockedSpy).toHaveBeenCalledWith({
        organization: 'org-hard-blocked',
        tier: 'starter',
      });
    });

    it('bloqueia chamada com política estrita "block" sem aplicar fallback econômico', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'org-strict',
        wallet: { plan: { slug: 'starter' } },
      });
      aggregateMock.mockResolvedValue({ _sum: { tokens: 600_000 } });

      const blockedSpy = vi.spyOn(aiTokenQuotaBlockedTotal, 'inc');

      const result = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-strict',
        requestedModel: 'openai/gpt-4o',
        policy: 'block',
      });

      expect(result.allowed).toBe(false);
      expect(result.status).toBe('exceeded');
      expect(result.action).toBe('block');
      expect(blockedSpy).toHaveBeenCalledWith({
        organization: 'org-strict',
        tier: 'starter',
      });
    });
  });

  describe('enforceTokenQuota — Lançamento de Erro Seguro (HTTP 429)', () => {
    it('lança AiTokenQuotaExceededError com código HTTP 429 quando bloqueado', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'org-throw',
        wallet: { plan: { slug: 'pro' } },
      });
      // Quota Pro = 3.000.000. Consumo = 3.100.000.
      aggregateMock.mockResolvedValue({ _sum: { tokens: 3_100_000 } });

      await expect(
        tokenQuotaService.enforceTokenQuota({
          organizationId: 'org-throw',
          requestedModel: TIER_QUOTAS.pro.economicalFallbackModel,
          policy: 'fallback',
        }),
      ).rejects.toThrowError(AiTokenQuotaExceededError);

      try {
        await tokenQuotaService.enforceTokenQuota({
          organizationId: 'org-throw',
          requestedModel: TIER_QUOTAS.pro.economicalFallbackModel,
          policy: 'fallback',
        });
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AiTokenQuotaExceededError);
        const quotaError = err as AiTokenQuotaExceededError;
        expect(quotaError.statusCode).toBe(429);
        expect(quotaError.consumedTokens).toBe(3_100_000);
        expect(quotaError.quotaTokens).toBe(3_000_000);
        expect(quotaError.tier).toBe('pro');
      }
    });

    it('retorna resultado com modelo econômico sem lançar erro quando fallback é viável', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'org-fallback-ok',
        wallet: { plan: { slug: 'pro' } },
      });
      aggregateMock.mockResolvedValue({ _sum: { tokens: 3_100_000 } });

      const result = await tokenQuotaService.enforceTokenQuota({
        organizationId: 'org-fallback-ok',
        requestedModel: 'openai/gpt-4o',
        policy: 'fallback',
      });

      expect(result.allowed).toBe(true);
      expect(result.action).toBe('fallback');
      expect(result.effectiveModel).toBe(TIER_QUOTAS.pro.economicalFallbackModel);
    });
  });

  describe('assertTenantTokenQuota — Integração com requestContext', () => {
    it('opera em modo fail-open (retorna null) quando não há tenantId no requestContext', async () => {
      const result = await tokenQuotaService.assertTenantTokenQuota();
      expect(result).toBeNull();
      expect(findUniqueMock).not.toHaveBeenCalled();
    });

    it('avalia quota do tenant autenticado quando presente no requestContext', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'tenant-ctx-1',
        wallet: { plan: { slug: 'enterprise' } },
      });
      // Enterprise: 20M tokens. Consumo: 5M
      aggregateMock.mockResolvedValue({ _sum: { tokens: 5_000_000 } });

      const result = await requestContext.run({ tenantId: 'tenant-ctx-1' }, () =>
        tokenQuotaService.assertTenantTokenQuota('openai/gpt-4o'),
      );

      expect(result).not.toBeNull();
      expect(result?.organizationId).toBe('tenant-ctx-1');
      expect(result?.tier).toBe('enterprise');
      expect(result?.percentageUsed).toBe(25);
    });
  });

  describe('recordUsage — Métricas de Consumo', () => {
    it('incrementa métricas Prometheus de tokens acumulados', async () => {
      const usageSpy = vi.spyOn(aiTokenUsageTotal, 'inc');

      await tokenQuotaService.recordUsage({
        organizationId: 'org-metric',
        model: 'groq/llama-3.1-8b-instant',
        tokens: 1500,
        tier: 'starter',
      });

      expect(usageSpy).toHaveBeenCalledWith(
        {
          organization: 'org-metric',
          tier: 'starter',
          model: 'groq/llama-3.1-8b-instant',
        },
        1500,
      );
    });

    it('soma a estimativa finita, ignora estimativa inválida e trata quota zero', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'org-est',
        wallet: { plan: { slug: 'starter' } },
      });
      aggregateMock.mockResolvedValue({ _sum: { tokens: 0 } });

      const exceeded = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-est',
        requestedModel: 'groq/llama-3.3-70b-versatile',
        estimatedTokens: 500_000,
      });
      expect(exceeded.status).toBe('exceeded');
      expect(exceeded.percentageUsed).toBe(100);

      __resetTokenQuotaCacheForTests();
      const negative = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-est',
        requestedModel: 'groq/llama-3.3-70b-versatile',
        estimatedTokens: -25,
      });
      expect(negative.percentageUsed).toBe(0);
      expect(negative.status).toBe('ok');

      __resetTokenQuotaCacheForTests();
      const notFinite = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-est',
        requestedModel: 'groq/llama-3.3-70b-versatile',
        estimatedTokens: Number.POSITIVE_INFINITY,
      });
      expect(notFinite.percentageUsed).toBe(0);

      __resetTokenQuotaCacheForTests();
      const notNumber = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-est',
        requestedModel: 'groq/llama-3.3-70b-versatile',
        estimatedTokens: '100' as unknown as number,
      });
      expect(notNumber.percentageUsed).toBe(0);

      __resetTokenQuotaCacheForTests();
      const zeroQuota = await tokenQuotaService.checkTokenQuota({
        organizationId: 'org-est',
        requestedModel: 'groq/llama-3.3-70b-versatile',
        customQuota: 0,
        estimatedTokens: 10,
      });
      expect(zeroQuota.quotaTokens).toBe(0);
      expect(zeroQuota.usageRatio).toBe(0);
    });

    it('atualiza o cache local do mês e o contador Redis quando a chave existe', async () => {
      aggregateMock.mockResolvedValue({ _sum: { tokens: 40 } });
      await tokenQuotaService.getMonthlyTokenUsage('org-local');
      await tokenQuotaService.recordUsage({
        organizationId: 'org-local',
        model: 'm',
        tokens: 15.6,
        tier: 'starter',
      });
      await expect(tokenQuotaService.getMonthlyTokenUsage('org-local')).resolves.toBe(56);

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
      try {
        __resetTokenQuotaCacheForTests();
        aggregateMock.mockResolvedValue({ _sum: { tokens: 8 } });
        await tokenQuotaService.getMonthlyTokenUsage('org-stale');
        vi.setSystemTime(new Date('2026-11-01T12:02:00Z'));
        await tokenQuotaService.recordUsage({
          organizationId: 'org-stale',
          model: 'm',
          tokens: 3,
          tier: 'starter',
        });
        aggregateMock.mockResolvedValue({ _sum: { tokens: 8 } });
        await expect(tokenQuotaService.getMonthlyTokenUsage('org-stale')).resolves.toBe(8);
      } finally {
        vi.useRealTimers();
      }

      const exists = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      const incrby = vi.fn().mockResolvedValue(16);
      Object.assign(cacheConnection, { exists, incrby });
      try {
        await tokenQuotaService.recordUsage({
          organizationId: 'org-redis',
          model: 'm',
          tokens: 16,
          tier: 'pro',
        });
        await tokenQuotaService.recordUsage({
          organizationId: 'org-redis',
          model: 'm',
          tokens: 16,
          tier: 'pro',
        });
        expect(incrby).toHaveBeenCalledTimes(1);
        expect(incrby).toHaveBeenCalledWith(expect.stringContaining('org-redis'), 16);
      } finally {
        (cacheConnection as { exists?: unknown }).exists = undefined;
        (cacheConnection as { incrby?: unknown }).incrby = undefined;
      }
    });
  });

  describe('generateFinOpsExecutiveReport — Relatório Executivo e Langfuse', () => {
    it('constrói relatório executivo com projeção de fim de mês e exporta para Langfuse', async () => {
      findUniqueMock.mockResolvedValue({
        id: 'org-report',
        wallet: { plan: { slug: 'pro', name: 'Plano Pro Anual' } },
      });
      aggregateMock.mockResolvedValue({
        _sum: { tokens: 2_500_000, cost: 42.5 },
      });
      groupByMock.mockResolvedValue([
        {
          model: 'groq/llama-3.3-70b-versatile',
          _sum: { tokens: 1_800_000, cost: 30.0 },
          _count: { id: 120 },
        },
        { model: 'openai/gpt-4o', _sum: { tokens: 700_000, cost: 12.5 }, _count: { id: 35 } },
      ]);

      const report = await tokenQuotaService.generateFinOpsExecutiveReport('org-report');

      expect(report.organizationId).toBe('org-report');
      expect(report.tier).toBe('pro');
      expect(report.planName).toBe('Plano Pro Anual');
      expect(report.monthlyTokenQuota).toBe(3_000_000);
      expect(report.consumedTokens).toBe(2_500_000);
      expect(report.monthCostUsd).toBe(42.5);
      expect(report.status).toBe('warning'); // > 80%
      expect(report.percentageUsed).toBeCloseTo(83.33, 1);
      expect(report.topModels).toHaveLength(2);
      expect(report.recommendation).toContain('Atenção: consumo acima de 80%');

      // Exportação para Langfuse executada
      expect(mockLangfuseEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'finops:executive-cost-report',
          metadata: expect.objectContaining({
            organizationId: 'org-report',
            consumedTokens: 2_500_000,
            monthCostUsd: 42.5,
            tier: 'pro',
          }),
        }),
      );
    });
  });
});
