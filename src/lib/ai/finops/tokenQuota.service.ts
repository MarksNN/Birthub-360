/**
 * Serviço de Governança FinOps e Quota de Tokens de IA por Organização / Tenant.
 *
 * Handoff: .agents/handoffs/onda-15/10-para-23-metricas-tokens-otel.md
 * Responsável: Agente 23 (Custo, Performance e Limites de IA).
 *
 * Papel:
 * 1. Controlar consumo mensal de tokens por organização com base no tier contratado (Free, Starter, Pro, Enterprise).
 * 2. Monitorar limiares de quota:
 *    - 80%: emissão de alerta preventivo (Prometheus, OTel, Langfuse, Logger).
 *    - 100%: ativação de fail-safe/fallback para modelo econômico OU bloqueio seguro (HTTP 429).
 * 3. Integração direta com OpenTelemetry e Langfuse para relatórios executivos de custo e visibilidade FinOps.
 */

import { metrics, trace } from '@opentelemetry/api';
import { requestContext } from '../../async-context.js';
import { getLangfuseClient } from '../../langfuse.js';
import { logger } from '../../logger.js';
import { prisma } from '../../prisma.js';
import { cacheConnection } from '../../queue/redis.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import {
  recordTokenQuotaAlert,
  recordTokenQuotaBlocked,
  recordTokenQuotaFallback,
  recordTokenUsage,
  setTokenQuotaLimitGauge,
} from '../metrics.js';

export type OrganizationTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface TierQuotaConfig {
  monthlyTokenQuota: number;
  warningThresholdRatio: number; // default: 0.8 (80%)
  hardLimitRatio: number; // default: 1.0 (100%)
  economicalFallbackModel: string;
  allowEconomicalFallback: boolean;
}

export const TIER_QUOTAS: Record<OrganizationTier, TierQuotaConfig> = {
  free: {
    monthlyTokenQuota: 100_000, // 100k tokens
    warningThresholdRatio: 0.8,
    hardLimitRatio: 1.0,
    economicalFallbackModel: 'local-llama3',
    allowEconomicalFallback: true,
  },
  starter: {
    monthlyTokenQuota: 500_000, // 500k tokens
    warningThresholdRatio: 0.8,
    hardLimitRatio: 1.0,
    economicalFallbackModel: 'groq/llama-3.1-8b-instant',
    allowEconomicalFallback: true,
  },
  pro: {
    monthlyTokenQuota: 3_000_000, // 3M tokens
    warningThresholdRatio: 0.8,
    hardLimitRatio: 1.0,
    economicalFallbackModel: 'groq/llama-3.1-8b-instant',
    allowEconomicalFallback: true,
  },
  enterprise: {
    monthlyTokenQuota: 20_000_000, // 20M tokens
    warningThresholdRatio: 0.8,
    hardLimitRatio: 1.0,
    economicalFallbackModel: 'groq/llama-3.1-8b-instant',
    allowEconomicalFallback: true,
  },
};

export class AiTokenQuotaExceededError extends AppError {
  constructor(
    public readonly organizationId: string,
    public readonly consumedTokens: number,
    public readonly quotaTokens: number,
    public readonly tier: string,
  ) {
    super(
      `Quota mensal de tokens de IA atingida para esta organização (Tier: ${tier.toUpperCase()}, ` +
        `${consumedTokens.toLocaleString('pt-BR')} de ${quotaTokens.toLocaleString('pt-BR')} tokens consumidos). ` +
        'Novas inferências com modelos premium estão restritas até o início do próximo mês ou upgrade do plano.',
      429,
    );
    this.name = 'AiTokenQuotaExceededError';
  }
}

export interface CheckTokenQuotaParams {
  organizationId: string;
  requestedModel: string;
  estimatedTokens?: number;
  tierOverride?: OrganizationTier;
  customQuota?: number;
  policy?: 'fallback' | 'block'; // default: 'fallback'
}

export interface TokenQuotaCheckResult {
  allowed: boolean;
  status: 'ok' | 'warning' | 'exceeded';
  organizationId: string;
  tier: OrganizationTier;
  consumedTokens: number;
  quotaTokens: number;
  percentageUsed: number;
  usageRatio: number;
  action: 'allow' | 'fallback' | 'block';
  requestedModel: string;
  effectiveModel: string;
  warningAlertTriggered: boolean;
  exceededAlertTriggered: boolean;
}

export interface FinOpsExecutiveReport {
  organizationId: string;
  tier: OrganizationTier;
  planName?: string;
  period: string;
  monthlyTokenQuota: number;
  consumedTokens: number;
  monthCostUsd: number;
  usageRatio: number;
  percentageUsed: number;
  status: 'ok' | 'warning' | 'exceeded';
  projectedMonthEndTokens: number;
  topModels: Array<{ model: string; tokens: number; cost: number; calls: number }>;
  recommendation: string;
  generatedAt: string;
}

const CACHE_KEY_PREFIX = 'ai-finops:token-quota:usage:';
const CACHE_TTL_SECONDS = 60;

interface LocalCacheState {
  value: number;
  expiresAt: number;
}
const localTokenUsageCache = new Map<string, LocalCacheState>();

/** Limpa cache de tokens em memória entre execuções de testes. */
export function __resetTokenQuotaCacheForTests(): void {
  localTokenUsageCache.clear();
}

function currentMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function currentMonthKey(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function normalizeTier(rawTier?: string | null): OrganizationTier {
  if (!rawTier) return 'starter';
  const lower = rawTier.toLowerCase();
  if (lower.includes('enterprise')) return 'enterprise';
  if (lower.includes('pro')) return 'pro';
  if (lower.includes('free')) return 'free';
  return 'starter';
}

// OpenTelemetry Instruments
const tracer = trace.getTracer('birthhub-finops', '1.0.0');
const meter = metrics.getMeter('birthhub-finops', '1.0.0');

const otelQuotaChecks = meter.createCounter('ai.finops.quota_checks', {
  description: 'Contagem de verificações de quota de tokens realizadas',
});

const otelQuotaAlerts = meter.createCounter('ai.finops.quota_alerts', {
  description: 'Contagem de alertas de quota de tokens emitidos',
});

const otelQuotaUsageRatio = meter.createHistogram('ai.finops.quota_usage_ratio', {
  description: 'Proporção de uso da quota de tokens por organização (0.0 a 1.0+)',
});

export class TokenQuotaService {
  /**
   * Obtém os tokens consumidos pela organização no mês corrente, com cache Redis e fallback em memória.
   * Fail-open caso Postgres/Redis estejam indisponíveis (retorna 0 para não interromper chamadas críticas).
   */
  async getMonthlyTokenUsage(organizationId: string): Promise<number> {
    const cacheKey = `${CACHE_KEY_PREFIX}${organizationId}:${currentMonthKey()}`;
    try {
      const cached = await cacheConnection.get(cacheKey);
      if (cached !== null) return Number(cached);
    } catch (err: unknown) {
      logger.warn(
        { err, organizationId },
        '[TokenQuota] Redis indisponível ao ler cache de tokens',
      );
    }

    const now = Date.now();
    const local = localTokenUsageCache.get(cacheKey);
    if (local && local.expiresAt > now) return local.value;

    let fresh: number;
    try {
      const agg = await prisma.aILog.aggregate({
        where: {
          organizationId,
          createdAt: { gte: currentMonthStart() },
        },
        _sum: { tokens: true },
      });
      fresh = agg._sum.tokens ?? 0;
    } catch (err: unknown) {
      logger.warn(
        { err, organizationId },
        '[TokenQuota] Falha ao calcular uso de tokens (Postgres indisponível) — tratando como 0 (fail-open)',
      );
      return 0;
    }

    localTokenUsageCache.set(cacheKey, { value: fresh, expiresAt: now + CACHE_TTL_SECONDS * 1000 });
    try {
      await cacheConnection.set(cacheKey, fresh.toString(), 'EX', CACHE_TTL_SECONDS);
    } catch (err: unknown) {
      logger.warn(
        { err, organizationId },
        '[TokenQuota] Redis indisponível ao gravar cache de tokens',
      );
    }

    return fresh;
  }

  /**
   * Resolve o tier da organização consultando a Wallet e Plan associados.
   */
  async resolveOrganizationTier(organizationId: string): Promise<{
    tier: OrganizationTier;
    planName?: string;
  }> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          wallet: {
            select: {
              plan: {
                select: { slug: true, name: true },
              },
            },
          },
        },
      });

      const slug = org?.wallet?.plan?.slug;
      const tier = normalizeTier(slug);
      return {
        tier,
        planName: org?.wallet?.plan?.name,
      };
    } catch (err: unknown) {
      logger.warn(
        { err, organizationId },
        '[TokenQuota] Falha ao ler organização/plano — adotando fallback tier starter',
      );
      return { tier: 'starter' };
    }
  }

  /**
   * Avalia a quota de tokens de uma organização para a chamada solicitada.
   * Não lança exceção diretamente: retorna diagnóstico completo e decisão sugerida (allow, fallback, block).
   */
  async checkTokenQuota(params: CheckTokenQuotaParams): Promise<TokenQuotaCheckResult> {
    const {
      organizationId,
      requestedModel,
      policy = 'fallback',
      tierOverride,
      customQuota,
    } = params;

    const span = tracer.startSpan('finops.token_quota_check', {
      attributes: {
        'finops.organization_id': organizationId,
        'finops.requested_model': requestedModel,
        'finops.policy': policy,
      },
    });

    try {
      const resolved = await this.resolveOrganizationTier(organizationId);
      const tier = tierOverride ?? resolved.tier;
      const tierConfig = TIER_QUOTAS[tier];
      const quotaTokens = customQuota ?? tierConfig.monthlyTokenQuota;

      // Atualiza gauge de limite no Prometheus
      setTokenQuotaLimitGauge(organizationId, tier, quotaTokens);

      const consumedTokens = await this.getMonthlyTokenUsage(organizationId);
      const estimatedAddition =
        typeof params.estimatedTokens === 'number' && Number.isFinite(params.estimatedTokens)
          ? Math.max(0, Math.round(params.estimatedTokens))
          : 0;
      const effectiveConsumedTokens = consumedTokens + estimatedAddition;
      const usageRatio = quotaTokens > 0 ? effectiveConsumedTokens / quotaTokens : 0;
      const percentageUsed = usageRatio * 100;

      let status: 'ok' | 'warning' | 'exceeded' = 'ok';
      let action: 'allow' | 'fallback' | 'block' = 'allow';
      let allowed = true;
      let effectiveModel = requestedModel;
      let warningAlertTriggered = false;
      let exceededAlertTriggered = false;

      // Avaliação de limiares
      if (usageRatio >= tierConfig.hardLimitRatio) {
        // >= 100% (Quota esgotada)
        status = 'exceeded';
        exceededAlertTriggered = true;

        recordTokenQuotaAlert(organizationId, tier, 'exceeded_100');
        otelQuotaAlerts.add(1, { organizationId, tier, level: 'exceeded_100' });
        logger.warn(
          {
            organizationId,
            tier,
            consumedTokens,
            quotaTokens,
            percentageUsed: percentageUsed.toFixed(1),
          },
          '[FinOps Alert] Organização atingiu ou excedeu 100% da quota mensal de tokens',
        );

        this.emitLangfuseAlertEvent({
          level: 'exceeded_100',
          organizationId,
          tier,
          consumedTokens,
          quotaTokens,
          percentageUsed,
          requestedModel,
        });

        // Decisão de fallback vs bloqueio
        if (policy === 'fallback' && tierConfig.allowEconomicalFallback) {
          const fallbackModel = tierConfig.economicalFallbackModel;
          if (requestedModel !== fallbackModel) {
            action = 'fallback';
            allowed = true;
            effectiveModel = fallbackModel;
            recordTokenQuotaFallback(organizationId, requestedModel, effectiveModel);
            logger.info(
              { organizationId, fromModel: requestedModel, toModel: effectiveModel },
              '[FinOps] Fail-safe: Modelo redirecionado para opção econômica devido a limite de quota',
            );
          } else {
            // Já estava usando o modelo econômico e ainda assim estourou a quota
            action = 'block';
            allowed = false;
            recordTokenQuotaBlocked(organizationId, tier);
          }
        } else {
          // Política estrita de bloqueio
          action = 'block';
          allowed = false;
          recordTokenQuotaBlocked(organizationId, tier);
        }
      } else if (usageRatio >= tierConfig.warningThresholdRatio) {
        // >= 80% e < 100% (Aviso preventivo)
        status = 'warning';
        warningAlertTriggered = true;
        action = 'allow';
        allowed = true;
        effectiveModel = requestedModel;

        recordTokenQuotaAlert(organizationId, tier, 'warning_80');
        otelQuotaAlerts.add(1, { organizationId, tier, level: 'warning_80' });
        logger.warn(
          {
            organizationId,
            tier,
            consumedTokens,
            quotaTokens,
            percentageUsed: percentageUsed.toFixed(1),
          },
          '[FinOps Alert] Organização atingiu 80% da quota mensal de tokens',
        );

        this.emitLangfuseAlertEvent({
          level: 'warning_80',
          organizationId,
          tier,
          consumedTokens,
          quotaTokens,
          percentageUsed,
          requestedModel,
        });
      }

      // Registro de telemetria no span e métricas OTel
      otelQuotaUsageRatio.record(usageRatio, { organizationId, tier });
      otelQuotaChecks.add(1, { organizationId, tier, status, action });

      span.setAttributes({
        'finops.tier': tier,
        'finops.consumed_tokens': consumedTokens,
        'finops.quota_tokens': quotaTokens,
        'finops.usage_ratio': usageRatio,
        'finops.percentage_used': percentageUsed,
        'finops.quota_status': status,
        'finops.action': action,
        'finops.allowed': allowed,
        'finops.effective_model': effectiveModel,
      });

      return {
        allowed,
        status,
        organizationId,
        tier,
        consumedTokens,
        quotaTokens,
        percentageUsed,
        usageRatio,
        action,
        requestedModel,
        effectiveModel,
        warningAlertTriggered,
        exceededAlertTriggered,
      };
    } finally {
      span.end();
    }
  }

  /**
   * Aplica a governança de quota de tokens.
   * Lança AiTokenQuotaExceededError (HTTP 429) se a chamada for bloqueada.
   * Se fallback econômico for aceito, retorna o resultado com `effectiveModel` modificado.
   */
  async enforceTokenQuota(params: CheckTokenQuotaParams): Promise<TokenQuotaCheckResult> {
    const result = await this.checkTokenQuota(params);
    if (!result.allowed) {
      throw new AiTokenQuotaExceededError(
        result.organizationId,
        result.consumedTokens,
        result.quotaTokens,
        result.tier,
      );
    }
    return result;
  }

  /**
   * Atalho para verificar a quota no contexto da requisição ativa (`requestContext`).
   * Fail-open se não houver `tenantId` (ex: workers, chamadas internas).
   */
  async assertTenantTokenQuota(
    requestedModel: string = 'local-llama3',
    policy: 'fallback' | 'block' = 'fallback',
  ): Promise<TokenQuotaCheckResult | null> {
    const organizationId = requestContext.getStore()?.tenantId;
    if (!organizationId) {
      return null;
    }
    return this.enforceTokenQuota({
      organizationId,
      requestedModel,
      policy,
    });
  }

  /**
   * Registra uso efetivo de tokens pós-chamada nas métricas e cache.
   */
  async recordUsage(params: {
    organizationId?: string | null;
    model: string;
    tokens: number;
    tier?: OrganizationTier;
  }): Promise<void> {
    const { organizationId, model, tokens, tier = 'starter' } = params;
    recordTokenUsage(organizationId, tier, model, tokens);

    if (!organizationId || !Number.isFinite(tokens) || tokens <= 0) {
      return;
    }

    const delta = Math.round(tokens);
    const cacheKey = `${CACHE_KEY_PREFIX}${organizationId}:${currentMonthKey()}`;
    const now = Date.now();
    const local = localTokenUsageCache.get(cacheKey);
    if (local && local.expiresAt > now) {
      local.value += delta;
    }

    try {
      const exists = await cacheConnection.exists(cacheKey);
      if (exists) {
        await cacheConnection.incrby(cacheKey, delta);
      }
    } catch (err: unknown) {
      logger.warn(
        { err, organizationId },
        '[TokenQuota] Redis indisponível ao incrementar cache de tokens em tempo real',
      );
    }
  }

  /**
   * Gera relatório executivo FinOps para tomada de decisão gerencial e exporta para o Langfuse.
   */
  async generateFinOpsExecutiveReport(organizationId: string): Promise<FinOpsExecutiveReport> {
    const span = tracer.startSpan('finops.executive_report', {
      attributes: { 'finops.organization_id': organizationId },
    });

    try {
      const resolved = await this.resolveOrganizationTier(organizationId);
      const tierConfig = TIER_QUOTAS[resolved.tier];
      const monthlyTokenQuota = tierConfig.monthlyTokenQuota;

      const [totalAgg, modelGroups] = await Promise.all([
        prisma.aILog.aggregate({
          where: {
            organizationId,
            createdAt: { gte: currentMonthStart() },
          },
          _sum: { tokens: true, cost: true },
        }),
        prisma.aILog.groupBy({
          by: ['model'],
          where: {
            organizationId,
            createdAt: { gte: currentMonthStart() },
          },
          _sum: { tokens: true, cost: true },
          _count: { id: true },
          orderBy: { _sum: { tokens: 'desc' } },
          take: 5,
        }),
      ]);

      const consumedTokens = totalAgg._sum.tokens ?? 0;
      const monthCostUsd = totalAgg._sum.cost ?? 0;
      const usageRatio = monthlyTokenQuota > 0 ? consumedTokens / monthlyTokenQuota : 0;
      const percentageUsed = usageRatio * 100;

      let status: 'ok' | 'warning' | 'exceeded' = 'ok';
      if (usageRatio >= 1.0) status = 'exceeded';
      else if (usageRatio >= 0.8) status = 'warning';

      // Projeção de encerramento do mês em UTC estrito (alinhado ao agregador FinOps)
      const now = new Date();
      const currentDay = Math.max(1, now.getUTCDate());
      const daysInMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
      ).getUTCDate();
      const dailyRunRate = consumedTokens / currentDay;
      const projectedMonthEndTokens = Math.round(dailyRunRate * daysInMonth);

      let recommendation: string;
      if (status === 'exceeded') {
        recommendation =
          'Crítico: franquia de tokens esgotada (100%+). Fallback econômico ativo ou novas chamadas bloqueadas. Upgrade de plano recomendado imediatamente.';
      } else if (status === 'warning') {
        recommendation =
          'Atenção: consumo acima de 80% da franquia. Projeção indica risco de esgotamento antes do fim do ciclo. Avaliar expansão de pacote.';
      } else if (projectedMonthEndTokens > monthlyTokenQuota) {
        recommendation =
          'Alerta preventivo: ritmo diário atual projeta ultrapassar a franquia antes do fim do mês.';
      } else {
        recommendation =
          'Franquia saudável: ritmo de consumo compatível com a alocação contratada.';
      }

      const topModels = modelGroups.map((g) => ({
        model: g.model,
        tokens: g._sum.tokens ?? 0,
        cost: g._sum.cost ?? 0,
        calls: g._count.id,
      }));

      const report: FinOpsExecutiveReport = {
        organizationId,
        tier: resolved.tier,
        planName: resolved.planName,
        period: currentMonthKey(now),
        monthlyTokenQuota,
        consumedTokens,
        monthCostUsd,
        usageRatio,
        percentageUsed,
        status,
        projectedMonthEndTokens,
        topModels,
        recommendation,
        generatedAt: now.toISOString(),
      };

      // Exportação para Langfuse
      const langfuse = getLangfuseClient();
      if (langfuse) {
        try {
          langfuse.event({
            name: 'finops:executive-cost-report',
            metadata: {
              organizationId,
              tier: resolved.tier,
              consumedTokens,
              monthCostUsd,
              percentageUsed,
              status,
              projectedMonthEndTokens,
            },
          });
        } catch (err: unknown) {
          logger.warn(
            { err },
            '[TokenQuotaService] Falha ao enviar relatório executivo ao Langfuse',
          );
        }
      }

      span.setAttributes({
        'finops.tier': resolved.tier,
        'finops.consumed_tokens': consumedTokens,
        'finops.month_cost_usd': monthCostUsd,
        'finops.percentage_used': percentageUsed,
        'finops.status': status,
      });

      return report;
    } finally {
      span.end();
    }
  }

  private emitLangfuseAlertEvent(params: {
    level: 'warning_80' | 'exceeded_100';
    organizationId: string;
    tier: OrganizationTier;
    consumedTokens: number;
    quotaTokens: number;
    percentageUsed: number;
    requestedModel: string;
  }): void {
    const langfuse = getLangfuseClient();
    if (!langfuse) return;

    try {
      langfuse.event({
        name:
          params.level === 'warning_80' ? 'finops:quota-warning-80' : 'finops:quota-exceeded-100',
        metadata: {
          organizationId: params.organizationId,
          tier: params.tier,
          consumedTokens: params.consumedTokens,
          quotaTokens: params.quotaTokens,
          percentageUsed: params.percentageUsed,
          requestedModel: params.requestedModel,
        },
      });
    } catch (err: unknown) {
      logger.warn({ err }, '[TokenQuotaService] Falha ao emitir evento de alerta no Langfuse');
    }
  }
}

export const tokenQuotaService = new TokenQuotaService();
