/**
 * P2.2 - Testes para Streaming com Fallback
 */

import { HumanMessage } from '@langchain/core/messages';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertAiBudgetNotExceeded } from '../../budget.js';
import { isCircuitOpen } from '../circuit-breaker.js';
import { groqProvider } from '../providers/groq.provider.js';
import { openaiProvider } from '../providers/openai.provider.js';
import { streamChatCompletionWithFallback } from '../streaming-fallback.js';

vi.mock('../../budget.js');
vi.mock('../circuit-breaker.js');
vi.mock('../providers/groq.provider.js');
vi.mock('../providers/openai.provider.js');
vi.mock('../providers/vllm.provider.js', () => ({
  vllmProvider: { name: 'vllm', isConfigured: () => false },
}));
vi.mock('../providers/openrouter.provider.js', () => ({
  openrouterProvider: { name: 'openrouter', isConfigured: () => false },
}));
vi.mock('../providers/litellm.provider.js', () => ({
  litellmProvider: { name: 'litellm', isConfigured: () => false },
}));
vi.mock('../telemetry.js', () => ({
  traceAiGeneration: vi.fn(),
}));
vi.mock('../metrics.js', () => ({
  recordAiUsageCost: vi.fn(),
}));
vi.mock('../dynamic-routing.js', () => ({
  recordLatency: vi.fn(),
}));

describe('streamChatCompletionWithFallback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.mocked(assertAiBudgetNotExceeded).mockResolvedValue(undefined);
    vi.mocked(isCircuitOpen).mockResolvedValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('deve lançar erro se nenhum provedor estiver configurado', async () => {
    vi.mocked(groqProvider.isConfigured).mockReturnValue(false);
    vi.mocked(openaiProvider.isConfigured).mockReturnValue(false);

    const generator = streamChatCompletionWithFallback(
      [new HumanMessage('Olá')],
      'local-llama3',
      0.7,
      'test-context',
    );

    await expect(generator.next()).rejects.toThrow('Nenhum motor de IA configurado para streaming');
  });

  it('deve respeitar assertAiBudgetNotExceeded', async () => {
    vi.mocked(assertAiBudgetNotExceeded).mockRejectedValueOnce(
      new Error('Orçamento mensal de IA excedido'),
    );

    const generator = streamChatCompletionWithFallback(
      [new HumanMessage('Olá')],
      'local-llama3',
      0.7,
      'test-context',
    );

    await expect(generator.next()).rejects.toThrow('Orçamento mensal de IA excedido');
  });

  it('deve emitir chunks de fallback e tentar próximo provider quando o primeiro falha com 429', async () => {
    vi.mocked(groqProvider.isConfigured).mockReturnValue(true);
    groqProvider.name = 'groq';
    process.env.GROQ_API_KEY = 'test-groq-key';

    vi.mocked(openaiProvider.isConfigured).mockReturnValue(true);
    openaiProvider.name = 'openai';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    // Mock fetch global: primeira chamada (Groq) retorna 429, segunda (OpenAI) sucede
    let callCount = 0;
    const originalFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation(async (url: any) => {
      callCount++;
      if (String(url).includes('groq.com')) {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: async () => JSON.stringify({ error: { message: 'Rate limit 429 exceeded' } }),
        };
      }

      // Stream fake para OpenAI
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Olá"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" mundo"}}],"usage":{"prompt_tokens":5,"completion_tokens":5,"total_tokens":10}}\n\n',
        'data: [DONE]\n\n',
      ];
      let index = 0;

      const readableStream = new ReadableStream({
        pull(controller) {
          if (index < chunks.length) {
            controller.enqueue(new TextEncoder().encode(chunks[index++]));
          } else {
            controller.close();
          }
        },
      });

      return {
        ok: true,
        status: 200,
        body: readableStream,
      };
    });

    try {
      const generator = streamChatCompletionWithFallback(
        [new HumanMessage('Olá')],
        'local-llama3',
        0.7,
        'test-context',
      );

      const yieldedDeltas: string[] = [];
      let next = await generator.next();
      while (!next.done) {
        if (next.value?.delta) {
          yieldedDeltas.push(next.value.delta);
        }
        next = await generator.next();
      }

      // Deve ter emitido a mensagem de fallback antes do conteúdo do segundo provider
      expect(yieldedDeltas.some((d) => d.includes('Mudando para provedor mais rápido'))).toBe(true);
      expect(yieldedDeltas.some((d) => d.includes('Olá'))).toBe(true);
      expect(callCount).toBe(2);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
