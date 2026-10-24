/**
 * Streaming com fallback entre provedores.
 *
 * Se o provedor primário (Groq) falhar antes de entregar o primeiro chunk com erros recuperáveis
 * (429, 5xx, timeout), aborta a tentativa e tenta o próximo provedor na cadeia (OpenAI, LiteLLM, etc.).
 *
 * IMPORTANTE: O fallback só ocorre antes do primeiro chunk ser entregue ao usuário. Uma vez que o
 * stream começou, não é possível trocar de provedor sem reiniciar a resposta do zero, o que seria
 * uma experiência ruim para quem já está lendo o texto parcial.
 *
 * Quando ocorre fallback, emite um chunk especial com a mensagem "Mudando para provedor mais rápido..."
 * para informar o usuário sobre a troca.
 */
import type { BaseMessage } from '@langchain/core/messages';
import { requestContext } from '../../async-context.js';
import { assertAiBudgetNotExceeded } from '../budget.js';
import { tokenQuotaService } from '../finops/tokenQuota.service.js';
import { recordAiUsageCost } from '../metrics.js';
import { resolveFallbackTimeoutMs } from './http-client.js';
import { resolveModelName } from './model-routing.js';
import { toChatCompletionMessages } from './parsing.js';
import { estimateCostUsd } from './pricing.js';
import { readProviderError } from './redaction.js';
import { traceAiGeneration } from './telemetry.js';
import { groqProvider } from './providers/groq.provider.js';
import { litellmProvider } from './providers/litellm.provider.js';
import { openaiProvider } from './providers/openai.provider.js';
import { vllmProvider } from './providers/vllm.provider.js';
import { openrouterProvider } from './providers/openrouter.provider.js';
import type { ProviderAdapter } from './providers/types.js';
import type { AiStreamChunk, AiStreamResult, ChatCompletionResponse } from './types.js';

const FALLBACK_MESSAGE = '\n\n_Mudando para provedor mais rápido..._';

// Mesma ordem de fallback do chat-model.ts
const PROVIDER_CHAIN: readonly ProviderAdapter[] = [
  vllmProvider,
  groqProvider,
  openaiProvider,
  openrouterProvider,
  litellmProvider,
];

interface StreamConfig {
  messages: BaseMessage[];
  modelName: string;
  temperature: number;
  agentContext: string;
}

/**
 * Tenta fazer streaming com um provider específico.
 * Retorna um generator que emite chunks do stream.
 *
 * Se falhar antes do primeiro chunk com erro recuperável, lança o erro para permitir fallback.
 */
async function* streamWithProvider(
  provider: ProviderAdapter,
  config: StreamConfig,
  resolvedModel: string,
  timeoutMs: number,
): AsyncGenerator<AiStreamChunk, AiStreamResult> {
  const startedAt = Date.now();
  let firstTokenAt: number | null = null;
  let fullContent = '';
  let usage: ChatCompletionResponse['usage'];
  let modelUsed = resolvedModel;

  // Determina a URL e headers baseados no provider
  let url: string;
  let apiKey: string;
  let includeMetadata = false;

  switch (provider.name) {
    case 'groq':
      url = 'https://api.groq.com/openai/v1/chat/completions';
      apiKey = process.env.GROQ_API_KEY!;
      break;
    case 'openai':
      url = 'https://api.openai.com/v1/chat/completions';
      apiKey = process.env.OPENAI_API_KEY!;
      break;
    case 'litellm':
      url = `${process.env.OLLAMA_BASE_URL || process.env.LITELLM_URL}/v1/chat/completions`;
      apiKey = process.env.LITELLM_KEY || process.env.OLLAMA_API_KEY || 'ollama';
      includeMetadata = true;
      break;
    case 'vllm':
      url = `${process.env.VLLM_BASE_URL}/v1/chat/completions`;
      apiKey = process.env.VLLM_API_KEY || 'dummy';
      break;
    case 'openrouter':
      url = 'https://openrouter.ai/api/v1/chat/completions';
      apiKey = process.env.OPENROUTER_API_KEY!;
      break;
    default:
      throw new Error(`Provider não suportado para streaming: ${provider.name}`);
  }

  const requestMessages = toChatCompletionMessages(config.messages);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: requestMessages,
        temperature: config.temperature,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error: any) {
    // Erro de rede/timeout - permite fallback
    throw error;
  }

  // Verifica se é erro recuperável (429, 5xx)
  if (!response.ok) {
    const isRecoverable = response.status >= 429 || response.status >= 500;
    if (isRecoverable) {
      const errorMsg = `HTTP ${response.status}: ${await readProviderError(response)}`;
      throw new Error(errorMsg);
    }
    // Erro não recuperável (4xx exceto 429) - não faz fallback
    throw new Error(`HTTP ${response.status}: ${await readProviderError(response)}`);
  }

  if (!response.body) {
    throw new Error('Resposta sem body para streaming');
  }

  interface StreamChunkPayload {
    model?: string;
    choices?: Array<{ delta?: { content?: string } }>;
    usage?: ChatCompletionResponse['usage'];
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let lineBuffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;

        let parsed: StreamChunkPayload;
        try {
          parsed = JSON.parse(dataStr) as StreamChunkPayload;
        } catch {
          continue;
        }
        if (parsed.model) modelUsed = parsed.model;
        if (parsed.usage) usage = parsed.usage;
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          if (firstTokenAt === null) {
            firstTokenAt = Date.now();
          }
          fullContent += delta;
          yield { delta };
        }
      }
    }
  } catch (error: any) {
    // Erro durante o stream - se já emitiu pelo menos um chunk, não faz fallback
    if (firstTokenAt !== null) {
      throw error;
    }
    // Se ainda não emitiu chunk, permite fallback
    throw error;
  }

  const tokenUsage = {
    totalTokens: usage?.total_tokens ?? 0,
    promptTokens: usage?.prompt_tokens ?? 0,
    completionTokens: usage?.completion_tokens ?? 0,
  };
  const estimatedCost = estimateCostUsd(modelUsed, tokenUsage);
  const ttftMs = firstTokenAt ? firstTokenAt - startedAt : Date.now() - startedAt;
  const latencyMs = Date.now() - startedAt;

  recordAiUsageCost(provider.name, requestContext.getStore()?.tenantId, estimatedCost);

  if (usage?.total_tokens) {
    tokenQuotaService
      .recordUsage({
        organizationId: requestContext.getStore()?.tenantId,
        model: modelUsed,
        tokens: usage.total_tokens,
      })
      .catch(() => {});
  }

  traceAiGeneration({
    provider: provider.name,
    model: modelUsed,
    agentContext: config.agentContext,
    temperature: config.temperature,
    input: requestMessages,
    output: fullContent,
    usage,
    startedAt,
  });

  return {
    model: modelUsed,
    usage: tokenUsage,
  };
}

/**
 * Streaming com fallback entre provedores.
 *
 * Tenta providers em ordem (vLLM → Groq → OpenAI → OpenRouter → LiteLLM).
 * Se um provider falhar antes do primeiro chunk com erro recuperável (429, 5xx, timeout),
 * emite mensagem de fallback e tenta o próximo provider.
 *
 * Uma vez que o primeiro chunk é entregue, não há mais fallback - o stream continua
 * até o fim ou erro irrecuperável.
 */
export async function* streamChatCompletionWithFallback(
  messages: BaseMessage[],
  modelName: string,
  temperature: number,
  agentContext: string,
): AsyncGenerator<AiStreamChunk, AiStreamResult> {
  await assertAiBudgetNotExceeded();

  const resolvedModel = resolveModelName(modelName);
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

  const timeoutMs = resolveFallbackTimeoutMs();
  const errorsByProvider = new Map<string, unknown>();

  // Filtra apenas providers configurados
  const configuredProviders = PROVIDER_CHAIN.filter((p) => p.isConfigured());

  if (configuredProviders.length === 0) {
    throw new Error(
      'Nenhum motor de IA configurado para streaming. Defina GROQ_API_KEY (gratuito, console.groq.com) ou OPENAI_API_KEY no .env.',
    );
  }

  for (const provider of configuredProviders) {
    try {
      const config = { messages, modelName, temperature, agentContext };
      const stream = streamWithProvider(provider, config, effectiveModel, timeoutMs);

      let result: AiStreamResult;
      for await (const chunk of stream) {
        yield chunk;
        result = chunk as any; // O último valor do generator é o resultado
      }

      // TypeScript não infere corretamente o tipo do return value do generator
      // Precisamos capturar o valor final de forma diferente
      const finalResult = await stream.next();
      if (finalResult.done) {
        return finalResult.value as AiStreamResult;
      }

      // Se chegou aqui, algo deu errado
      throw new Error('Stream finalizado sem resultado');
    } catch (error: any) {
      const errMsg = String(error?.message || error);
      errorsByProvider.set(provider.name, error);

      // Verifica se é erro recuperável que justifica fallback
      const isRecoverable =
        errMsg.includes('429') ||
        errMsg.includes('500') ||
        errMsg.includes('502') ||
        errMsg.includes('503') ||
        errMsg.includes('504') ||
        errMsg.includes('timeout') ||
        errMsg.includes('ETIMEDOUT') ||
        errMsg.includes('ECONNRESET');

      if (!isRecoverable) {
        // Erro não recuperável - não tenta mais providers
        throw error;
      }

      // Emite mensagem de fallback e continua para o próximo provider
      yield { delta: FALLBACK_MESSAGE };
      continue;
    }
  }

  // Todos os providers falharam
  const configuredNames: Record<string, string> = {
    vllm: 'vLLM',
    groq: 'Groq',
    openai: 'OpenAI',
    openrouter: 'OpenRouter',
    litellm: 'Ollama/LiteLLM',
  };
  const configured = configuredProviders
    .map((p) => configuredNames[p.name])
    .join(', ');

  throw new Error(
    `Todos os motores de IA falharam para streaming (${configured}). Último erro: ${String(
      errorsByProvider.get(configuredProviders[configuredProviders.length - 1].name),
    )}`,
  );
}
