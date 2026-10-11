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
    const modelCandidates = [primaryGroqModel];
    if (primaryGroqModel === 'llama-3.1-8b-instant') {
      modelCandidates.push('llama-3.3-70b-versatile', 'openai/gpt-oss-20b');
    } else if (primaryGroqModel === 'llama-3.3-70b-versatile') {
      modelCandidates.push('llama-3.1-8b-instant', 'openai/gpt-oss-120b');
    } else {
      modelCandidates.push('llama-3.1-8b-instant', 'llama-3.3-70b-versatile');
    }

    let lastError: unknown;
    for (const groqModel of modelCandidates) {
      try {
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
              { maxTokens: params.maxTokens, jsonMode: params.jsonMode },
            ),
          params.retries,
        );
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        if (
          msg.includes('429') &&
          (msg.includes('tokens per day') ||
            msg.includes('TPD') ||
            msg.includes('Rate limit reached for model'))
        ) {
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },
};
