/**
 * Ponto de entrada público do gateway de IA (ITEM-09). Este arquivo é DE PROPÓSITO um barrel
 * fino: mantém o caminho de import `lib/ai/gateway.js` estável para os ~40 serviços que já
 * dependem dele, mas nenhuma lógica mora mais aqui — só composição e re-export.
 *
 * A implementação real está decomposta em `./gateway/*`, uma responsabilidade por arquivo:
 *
 *   gateway/types.ts             — contratos compartilhados (ChatCompletionMessage, AiTokenUsage...)
 *   gateway/model-routing.ts     — nome lógico → nome real por provedor (LOCAL_MODEL, aliases)
 *   gateway/redaction.ts         — sanitização de erro de provedor (nunca vaza API key/token)
 *   gateway/retry.ts             — política de retry (o que vale reexecutar, e com que backoff)
 *   gateway/circuit-breaker.ts   — memória de falhas por provedor entre chamadas (Redis + fallback local)
 *   gateway/pricing.ts           — estimativa de custo por modelo (USD)
 *   gateway/telemetry.ts         — trace de geração no Langfuse
 *   gateway/parsing.ts           — LangChain → Chat Completions na ida, extração de JSON na volta
 *   gateway/http-client.ts       — transporte HTTP comum a todo adapter (timeout, payload, erro)
 *   gateway/providers/*          — um adapter por provedor (Groq, OpenAI, LiteLLM/Ollama), forma uniforme
 *   gateway/embeddings.ts        — geração de embeddings (local por padrão, LiteLLM como legado)
 *   gateway/chat-model.ts        — orquestra orçamento → cadeia de fallback de provedores → custo/trace
 *   gateway/streaming.ts         — streaming de tokens (com fallback entre provedores antes do primeiro chunk)
 *   gateway/streaming-fallback.ts — implementação de fallback para streaming
 *   gateway/prompt-registry.ts   — catálogo dos promptId usados em ../usage-log.ts
 *   gateway/prompt-safety.ts     — delimitador estrutural para conteúdo externo/não confiável
 *                                  interpolado num prompt (defesa contra prompt injection)
 *
 * `../budget.ts` (política de orçamento mensal) e `../metrics.ts` (métricas Prometheus) já
 * viviam fora deste arquivo antes do ITEM-09 e continuam onde estavam — só passaram a ser
 * consumidos por `gateway/chat-model.ts`/`gateway/streaming.ts` em vez de pelo monólito antigo.
 *
 * `logAiUsage` é re-exportado de `./usage-log.ts` (não reimplementado aqui): esse módulo já tinha
 * a versão correta e ciente de RLS (INSERT sem RETURNING para o caso sem tenant — ver a migration
 * `20260813230000_fix_ailog_rls_unattributed_internal_writes` e o comentário em usage-log.ts), mas
 * nenhum dos ~40 chamadores importava dali: todos importavam a cópia mais simples que vivia neste
 * arquivo (e uma terceira cópia idêntica em `gateway-core.ts`, removido nesta mudança — nada além
 * de `usage-log.ts` ainda dependia dele). Consolidar nesta única implementação corrige esse desvio
 * sem exigir tocar em nenhum dos pontos de chamada.
 */

export { getAiModel } from './gateway/chat-model.js';
export { __resetCircuitBreakerForTests } from './gateway/circuit-breaker.js';
export { generateEmbedding } from './gateway/embeddings.js';
export { LOCAL_MODEL } from './gateway/model-routing.js';
export { cleanAndParseJson, toChatCompletionMessages } from './gateway/parsing.js';
export { estimateCostUsd } from './gateway/pricing.js';
export { getGroqTelemetrySnapshot } from './gateway/groqTelemetry.service.js';
export {
  UNTRUSTED_CONTENT_GUARD_INSTRUCTION,
  wrapUntrustedContent,
} from './gateway/prompt-safety.js';
export { withRetry } from './gateway/retry.js';
export { streamChatCompletion } from './gateway/streaming.js';
export type {
  AiChatModel,
  AiInvokeResult,
  AiStreamChunk,
  AiStreamResult,
  AiTokenUsage,
  AiUsageLogInput,
  ChatCompletionMessage,
} from './gateway/types.js';
export { litellmProvider } from './gateway/providers/litellm.provider.js';
export { logAiUsage } from './usage-log.js';
export {
  tokenQuotaService,
  TokenQuotaService,
  AiTokenQuotaExceededError,
  TIER_QUOTAS,
} from './finops/tokenQuota.service.js';
export {
  selectDynamicRouting,
  recordLatency,
  __resetLatencyCacheForTests,
} from './gateway/dynamic-routing.js';
export type {
  DynamicRoutingOptions,
  DynamicRoutingResult,
} from './gateway/dynamic-routing.js';

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getAiModel } from './gateway/chat-model.js';
import { cleanAndParseJson } from './gateway/parsing.js';

export async function generateTextOutput(options: {
  organizationId?: string;
  feature?: string;
  systemInstruction?: string;
  prompt: string;
  fallback?: () => string;
}): Promise<{ text: string }> {
  try {
    const model = getAiModel(options.feature || 'general');
    const messages = [
      new SystemMessage(
        options.systemInstruction || 'Você é um assistente prestativo e profissional.',
      ),
      new HumanMessage(options.prompt),
    ];
    const res = await model.invoke(messages);
    return { text: res.content };
  } catch (err) {
    if (options.fallback) {
      return { text: options.fallback() };
    }
    throw err;
  }
}

export async function generateStructuredOutput<T>(options: {
  organizationId?: string;
  feature?: string;
  systemInstruction?: string;
  prompt: string;
  schema?: unknown;
  fallback?: () => T;
}): Promise<T> {
  const model = getAiModel(options.feature || 'general');
  const messages = [
    new SystemMessage(
      (options.systemInstruction || '') +
        '\nResponda ESTRITAMENTE em formato JSON válido, sem blocos markdown adicionais.',
    ),
    new HumanMessage(options.prompt),
  ];
  const res = await model.invoke(messages);
  return cleanAndParseJson<T>(res.content);
}
