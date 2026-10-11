/**
 * AI Provider Router para o Motor de Busca Turbo:
 * - Suporta GroqCloud (rápido, modelos abertos em nuvem)
 * - Suporta Ollama (inteligência local em 11434)
 * - Suporta Modo Automático (seleciona conforme disponibilidade/latência)
 * - Interpretação de linguagem natural para filtros estruturados
 * - Avaliação de Fit ICP e síntese de inteligência comercial
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { logger } from '../../../lib/logger.js';
import { getAiModel } from '../../../lib/ai/gateway.js';
import type { ProspectCriteria } from '../domain/prospectTypes.js';

export interface AIProviderStatus {
  provider: 'groq' | 'ollama';
  configured: boolean;
  available: boolean;
  model: string;
  latencyMs?: number;
  lastChecked: string;
  error?: string;
}

export interface NlpSearchIntentResult {
  criteria: Partial<ProspectCriteria>;
  explanation: string;
  suggestedKeywords: string[];
}

export class AIProviderRouter {
  private static instance: AIProviderRouter;

  private constructor() {}

  public static getInstance(): AIProviderRouter {
    if (!AIProviderRouter.instance) {
      AIProviderRouter.instance = new AIProviderRouter();
    }
    return AIProviderRouter.instance;
  }

  /**
   * Checa o status e disponibilidade do Groq
   */
  public async checkGroqHealth(): Promise<AIProviderStatus> {
    const configured = !!process.env.GROQ_API_KEY;
    if (!configured) {
      return {
        provider: 'groq',
        configured: false,
        available: false,
        model: 'groq/allam-2-7b',
        lastChecked: new Date().toISOString(),
        error: 'GROQ_API_KEY não configurada no ambiente.',
      };
    }

    const start = Date.now();
    try {
      // Teste leve via gateway oficial do repositório
      const model = getAiModel('groq/allam-2-7b', 0, 'prospecting-health-check');
      await model.invoke([new HumanMessage('Ping')]);
      const latency = Date.now() - start;

      return {
        provider: 'groq',
        configured: true,
        available: true,
        model: 'groq/allam-2-7b',
        latencyMs: latency,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        provider: 'groq',
        configured: true,
        available: false,
        model: 'groq/allam-2-7b',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Checa o status e disponibilidade do Ollama Local
   */
  public async checkOllamaHealth(): Promise<AIProviderStatus> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as { models?: Array<{ name: string }> };
        const model = data.models?.[0]?.name || 'llama3:latest';
        return {
          provider: 'ollama',
          configured: true,
          available: true,
          model,
          latencyMs: Date.now() - start,
          lastChecked: new Date().toISOString(),
        };
      }
      return {
        provider: 'ollama',
        configured: true,
        available: false,
        model: 'llama3:latest',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    } catch (err: any) {
      return {
        provider: 'ollama',
        configured: !!process.env.OLLAMA_BASE_URL,
        available: false,
        model: 'llama3:latest',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Conexão recusada ao Ollama',
      };
    }
  }

  /**
   * Converte uma frase em linguagem natural (ex: "Empresas de engenharia civil em Campinas com 50 funcionários")
   * em um objeto de filtros estruturados de busca.
   */
  public async parseNaturalLanguageQuery(
    prompt: string,
    mode: 'auto' | 'groq' | 'local' = 'auto',
  ): Promise<NlpSearchIntentResult> {
    const systemPrompt = `Você é o analisador de buscas do Motor Turbo do Birthhub-360.
Sua missão é extrair filtros comerciais precisos a partir da descrição do usuário.
Responda APENAS com um JSON válido no formato:
{
  "segmento": "string",
  "subsegmento": "string",
  "cidade": "string",
  "estado": "string (UF, ex: SP)",
  "porte": "string (ex: 11,50 ou 51,200)",
  "cnaePrincipal": "string (se mencionado)",
  "decisorCargos": ["cargo 1", "cargo 2"],
  "palavrasChave": "string separada por vírgula",
  "explanation": "breve explicação do raciocínio"
}`;

    try {
      const preferredModel = mode === 'local' ? 'ollama/llama3' : 'groq/allam-2-7b';
      const model = getAiModel(preferredModel, 0.1, 'prospecting-nlp-parser');

      const res = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(`Analise a seguinte busca: "${prompt}"`),
      ]);

      const content = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
      const cleaned = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      return {
        criteria: {
          segmento: parsed.segmento || '',
          subsegmento: parsed.subsegmento || undefined,
          cidade: parsed.cidade || undefined,
          estado: parsed.estado || undefined,
          porte: parsed.porte || undefined,
          cnaePrincipal: parsed.cnaePrincipal || undefined,
          decisorCargos: Array.isArray(parsed.decisorCargos) ? parsed.decisorCargos : undefined,
          palavrasChave: parsed.palavrasChave || undefined,
        },
        explanation: parsed.explanation || 'Critérios interpretados por IA.',
        suggestedKeywords: parsed.palavrasChave
          ? parsed.palavrasChave.split(',').map((s: string) => s.trim())
          : [],
      };
    } catch (error: any) {
      logger.warn(
        { err: error, prompt },
        'Falha na interpretação via IA, fallback para busca por texto',
      );
      return {
        criteria: {
          segmento: prompt,
          palavrasChave: prompt,
        },
        explanation: 'Interpretação fallback por palavras-chave.',
        suggestedKeywords: prompt.split(' ').filter((w) => w.length > 3),
      };
    }
  }
}
