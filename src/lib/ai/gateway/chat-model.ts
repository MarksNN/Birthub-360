/**
 * Orquestrador do gateway de chat: aplica a política de orçamento (../budget.ts), percorre a
 * cadeia de fallback entre adapters de provedor (providers/*.provider.ts) e, só depois de ter uma
 * resposta, dispara custo (../metrics.ts) e trace (telemetry.ts). Nenhuma lógica de
 * provedor/retry/circuit-breaker mora aqui — só composição. Trocar a ordem de fallback, adicionar
 * um provedor novo, ou trocar a política de orçamento nunca deve exigir tocar nos outros módulos.
 */
import type { BaseMessage } from '@langchain/core/messages';
import { requestContext } from '../../async-context.js';
import { assertAiBudgetNotExceeded } from '../budget.js';
import { recordAiUsageCost } from '../metrics.js';
import { tokenQuotaService } from '../finops/tokenQuota.service.js';
import { logger } from '../../logger.js';
import { detectPII, detectToxicity } from '../guardrails/index.js';
import { resolveFallbackTimeoutMs } from './http-client.js';
import { resolveModelName } from './model-routing.js';
import { toChatCompletionMessages } from './parsing.js';
import { estimateCostUsd } from './pricing.js';
import { groqProvider } from './providers/groq.provider.js';
import { litellmProvider } from './providers/litellm.provider.js';
import { openaiProvider } from './providers/openai.provider.js';
import { vllmProvider } from './providers/vllm.provider.js';
import { openrouterProvider } from './providers/openrouter.provider.js';
import type { ProviderAdapter } from './providers/types.js';
import { sanitizeProviderMessage } from './redaction.js';
import { traceAiGeneration } from './telemetry.js';
import type { AiChatModel, AiInvokeResult, ChatCompletionResponse } from './types.js';
import {
  selectDynamicRouting,
  recordLatency,
  type DynamicRoutingOptions,
} from './dynamic-routing.js';

// Ordem de fallback: vLLM primeiro (se hospedado no cluster), Groq (rápido, open source),
// OpenAI como terceira opção, LiteLLM/Ollama por último (ver comentário em
// providers/litellm.provider.ts sobre por que ele nunca deve ser a primeira tentativa).
const PROVIDER_CHAIN: readonly ProviderAdapter[] = [
  vllmProvider,
  groqProvider,
  openaiProvider,
  openrouterProvider,
  litellmProvider,
];

function buildExhaustedProvidersError(errorsByProvider: Map<string, unknown>): Error {
  const configuredNames: Record<string, string> = {
    vllm: 'vLLM',
    groq: 'Groq',
    openai: 'OpenAI',
    openrouter: 'OpenRouter',
    litellm: 'Ollama/LiteLLM',
  };
  const configured = PROVIDER_CHAIN.filter((provider) => provider.isConfigured())
    .map((provider) => configuredNames[provider.name])
    .join(', ');

  if (!configured) {
    return new Error(
      'Nenhum motor de IA configurado. Defina GROQ_API_KEY (gratuito, console.groq.com) ou OPENAI_API_KEY no .env.',
    );
  }

  const vllmMessage = sanitizeProviderMessage(describeError(errorsByProvider.get('vllm')));
  const groqMessage = sanitizeProviderMessage(describeError(errorsByProvider.get('groq')));
  const openaiMessage = sanitizeProviderMessage(describeError(errorsByProvider.get('openai')));
  const openrouterMessage = sanitizeProviderMessage(
    describeError(errorsByProvider.get('openrouter')),
  );
  const litellmMessage = sanitizeProviderMessage(describeError(errorsByProvider.get('litellm')));
  return new Error(
    `Os motores de IA estão indisponíveis (${configured}). vLLM: ${vllmMessage}. Groq: ${groqMessage}. OpenAI: ${openaiMessage}. OpenRouter: ${openrouterMessage}. LiteLLM: ${litellmMessage}`,
  );
}

function describeError(error: unknown): unknown {
  return error instanceof Error ? error.message : error;
}

/**
 * Percorre a cadeia de fallback na ordem definida, pulando provedores não configurados, e retorna
 * a primeira resposta bem-sucedida com o nome do provedor que a produziu. Lança um erro agregado
 * (uma linha por provedor tentado) se todos falharem.
 *
 * Esta função é usada como fallback quando o routing dinâmico não está disponível ou falha.
 */
async function callWithFallback(
  resolvedModel: string,
  requestMessages: ReturnType<typeof toChatCompletionMessages>,
  temperature: number,
  agentContext: string,
): Promise<{ response: ChatCompletionResponse; providerUsed: string }> {
  const timeoutMs = resolveFallbackTimeoutMs();
  const _startTime = Date.now();
  const errorsByProvider = new Map<string, unknown>();

  const chain = resolvedModel.startsWith('openrouter/')
    ? [openrouterProvider, litellmProvider]
    : PROVIDER_CHAIN;
  for (const provider of chain) {
    if (!provider.isConfigured()) continue;
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const response = await provider.chatCompletion({
          messages: requestMessages,
          temperature,
          agentContext,
          resolvedModel,
          timeoutMs,
        });
        return { response, providerUsed: provider.name };
      } catch (error: any) {
        const errMsg = String(error?.message || error);
        const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit');
        if (isRateLimit && attempts < 3) {
          const match = errMsg.match(/try again in ([\d\.]+)s/i);
          const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 1500 : attempts * 5000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        errorsByProvider.set(provider.name, error);
        break;
      }
    }
  }

  throw buildExhaustedProvidersError(errorsByProvider);
}

/**
 * Executa chamada usando routing dinâmico (baseado em custo, latência, disponibilidade e tier).
 * Se o routing dinâmico falhar, fallback para a cadeia estática tradicional.
 */
async function callWithDynamicRouting(
  resolvedModel: string,
  requestMessages: ReturnType<typeof toChatCompletionMessages>,
  temperature: number,
  agentContext: string,
  tenantTier?: string,
): Promise<{ response: ChatCompletionResponse; providerUsed: string }> {
  const timeoutMs = resolveFallbackTimeoutMs();
  const startTime = Date.now();
  const errorsByProvider = new Map<string, unknown>();

  // Tenta routing dinâmico primeiro
  try {
    const routingOptions: DynamicRoutingOptions = {
      tenantTier: tenantTier as any,
      requestedModel: resolvedModel,
      availableProviders: PROVIDER_CHAIN,
    };

    if (process.env.DISABLE_DYNAMIC_ROUTING_FOR_TESTS) throw new Error('Disabled');
    const routingResult = await selectDynamicRouting(routingOptions);

    // Tenta chamar o provider selecionado
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const response = await routingResult.selectedProvider.chatCompletion({
          messages: requestMessages,
          temperature,
          agentContext,
          resolvedModel,
          timeoutMs,
        });

        // Registra latência para aprendizado do routing dinâmico
        const latencyMs = Date.now() - startTime;
        recordLatency(routingResult.selectedProvider.name, resolvedModel, latencyMs);

        return { response, providerUsed: routingResult.selectedProvider.name };
      } catch (error: any) {
        const errMsg = String(error?.message || error);
        const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit');
        if (isRateLimit && attempts < 3) {
          const match = errMsg.match(/try again in ([\d\.]+)s/i);
          const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 1500 : attempts * 5000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        errorsByProvider.set(routingResult.selectedProvider.name, error);
        break;
      }
    }
  } catch (routingError: any) {
    logger.warn(
      { err: routingError, model: resolvedModel },
      '[DynamicRouting] Falha no routing dinâmico, usando fallback estático',
    );
  }

  // Fallback para cadeia estática se routing dinâmico falhar
  logger.info(
    { model: resolvedModel },
    '[DynamicRouting] Usando cadeia de fallback estática',
  );
  return callWithFallback(resolvedModel, requestMessages, temperature, agentContext);
}

/**
 * Retorna um "chat model" mínimo compatível com o padrão `.invoke([HumanMessage])` do LangChain.
 * Ver providers/*.provider.ts para o comportamento específico de cada motor.
 */
export const getAiModel = (
  modelName: string = 'local-llama3',
  temperature: number = 0.7,
  agentContext: string = 'system',
): AiChatModel => {
  const resolvedModel = resolveModelName(modelName);

  return {
    async invoke(messages: BaseMessage[]): Promise<AiInvokeResult> {
      // AI-011: verificado antes de qualquer tentativa de rede — se o orçamento mensal já foi
      // excedido, a chamada nem chega a ser tentada em nenhum provedor.
      await assertAiBudgetNotExceeded();

      // FINOPS-001: governança de quota de tokens por tenant (Onda 15)
      let effectiveModel = resolvedModel;
      const tenantId = requestContext.getStore()?.tenantId;
      if (tenantId) {
        const quotaDecision = await tokenQuotaService.enforceTokenQuota({
          organizationId: tenantId,
          requestedModel: resolvedModel,
        });
        if (quotaDecision.effectiveModel && quotaDecision.effectiveModel !== resolvedModel) {
          effectiveModel = resolveModelName(quotaDecision.effectiveModel);
        }
      }

      const requestMessages = toChatCompletionMessages(messages);
      const invokeStartedAt = Date.now();

      // Resolve tenant tier para routing dinâmico
      let tenantTier: string | undefined;
      if (tenantId) {
        try {
          const tierResult = await tokenQuotaService.resolveOrganizationTier(tenantId);
          tenantTier = tierResult.tier;
        } catch {
          // Se falhar ao resolver tier, continua sem tier (usa pesos padrão)
        }
      }

      const { response, providerUsed } = await callWithDynamicRouting(
        effectiveModel,
        requestMessages,
        temperature,
        agentContext,
        tenantTier,
      );

      const usage = response.usage;
      const content = response.choices?.[0]?.message?.content?.trim() ?? '';

      // Guardrails: verificar PII e toxicidade antes de retornar
      const piiCheck = detectPII(content);
      if (piiCheck.blocked) {
        // Log tentativa bloqueada em AILog
        const { logAiUsage } = await import('../usage-log.js');
        await logAiUsage({
          // tenantId resolved internally
          model: response.model || resolvedModel,
          usage: {
            promptTokens: usage?.prompt_tokens ?? 0,
            completionTokens: usage?.completion_tokens ?? 0,
            totalTokens: usage?.total_tokens ?? 0,
          },
          latencyMs: 0,
          agentRole: agentContext,
        });

        throw new Error(`Resposta bloqueada por conter PII: ${piiCheck.matches.join(', ')}`);
      }

      const toxicityCheck = detectToxicity(content);
      if (toxicityCheck.toxic) {
        // Log tentativa bloqueada em AILog
        const { logAiUsage } = await import('../usage-log.js');
        await logAiUsage({
          // tenantId resolved internally
          model: response.model || resolvedModel,
          usage: {
            promptTokens: usage?.prompt_tokens ?? 0,
            completionTokens: usage?.completion_tokens ?? 0,
            totalTokens: usage?.total_tokens ?? 0,
          },
          latencyMs: 0,
          agentRole: agentContext,
        });

        throw new Error(
          `Resposta bloqueada por conter linguagem tóxica: ${toxicityCheck.matches.join(', ')}`,
        );
      }

      // Métrica de custo (ai_usage_cost_usd_total): registrada aqui, não em logAiUsage(), porque
      // aqui já temos o provedor real que atendeu a chamada (providerUsed) — logAiUsage() só
      // recebe model/usage, sem saber se veio de Groq/OpenAI/LiteLLM. Dispara sempre que a
      // chamada teve sucesso, independentemente de o chamador decidir persistir o AILog.
      recordAiUsageCost(
        providerUsed,
        requestContext.getStore()?.tenantId,
        estimateCostUsd(response.model || effectiveModel, {
          totalTokens: usage?.total_tokens ?? 0,
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
        }),
      );

      if (usage?.total_tokens) {
        tokenQuotaService
          .recordUsage({
            organizationId: requestContext.getStore()?.tenantId,
            model: response.model || effectiveModel,
            tokens: usage.total_tokens,
          })
          .catch(() => {});
      }

      traceAiGeneration({
        provider: providerUsed,
        model: response.model || resolvedModel,
        agentContext,
        temperature,
        input: requestMessages,
        output: content,
        usage,
        startedAt: invokeStartedAt,
      });

      return {
        content,
        response_metadata: {
          model: response.model || resolvedModel,
          tokenUsage: {
            totalTokens: usage?.total_tokens ?? 0,
            promptTokens: usage?.prompt_tokens ?? 0,
            completionTokens: usage?.completion_tokens ?? 0,
          },
        },
      };
    },
  };
};
