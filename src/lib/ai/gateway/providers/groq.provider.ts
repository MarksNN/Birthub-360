/**
 * Adapter Groq — rota principal do gateway hoje (rápido, sem o gargalo de concorrência do modelo
 * local). Ver `../chat-model.ts` para a ordem de fallback completa.
 */
import { callProvider } from '../circuit-breaker.js';
import { requestChatCompletion } from '../http-client.js';
import { resolveGroqModelName } from '../model-routing.js';
import type { ChatCompletionResponse } from '../types.js';
import type { ProviderAdapter, ProviderChatParams } from './types.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const groqProvider: ProviderAdapter = {
  name: 'groq',
  isConfigured(): boolean {
    return Boolean(process.env.GROQ_API_KEY);
  },
  async chatCompletion(params: ProviderChatParams): Promise<ChatCompletionResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq não está configurado (GROQ_API_KEY ausente).');
    const primaryGroqModel = resolveGroqModelName(params.resolvedModel);

    // Lista de fallback de modelos compatíveis no Groq para tolerância a rate-limits específicos de modelo (TPD)
    const modelCandidates = Array.from(
      new Set([primaryGroqModel, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']),
    );

    let lastError: unknown;
    for (const groqModel of modelCandidates) {
      try {
        const effectiveMaxTokens =
          groqModel === 'qwen/qwen3.8-27b'
            ? Math.min(params.maxTokens ?? 1000, 1000)
            : params.maxTokens;
        return await callProvider(
          'groq',
          () =>
            requestChatCompletion(
              GROQ_CHAT_URL,
              apiKey,
              groqModel,
              params.messages,
              params.temperature,
              params.agentContext,
              params.timeoutMs,
              false, // Groq ignora user/metadata — não vazamos agentContext para fora sem necessidade.
              { maxTokens: effectiveMaxTokens, jsonMode: params.jsonMode },
            ),
          params.retries,
        );
      } catch (err: any) {
        const msg = String(err?.message || err);
        // Preserva erro 429 útil caso um modelo posterior falhe com 404 genérico
        if (!lastError || msg.includes('429')) {
          lastError = err;
        }
        // Se for erro de quota de modelo específico (429) ou modelo não acessível nesta chave (404 / does not exist), tenta o próximo modelo candidato
        if (
          msg.includes('429') ||
          msg.includes('404') ||
          msg.includes('does not exist') ||
          msg.includes('not have access') ||
          msg.includes('tokens per day') ||
          msg.includes('TPD') ||
          msg.includes('Rate limit reached for model')
        ) {
          if (msg.includes('429') && !msg.includes('TPD') && !msg.includes('tokens per day')) {
            const match = msg.match(/try again in ([0-9.]+)s/i);
            const waitMs = match ? Math.ceil(Number(match[1]) * 1000) + 200 : 1500;
            await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 5000)));
          }
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },
};
