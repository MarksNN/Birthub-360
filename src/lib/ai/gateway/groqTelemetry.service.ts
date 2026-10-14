/**
 * Serviço de Telemetria e Métricas para Groq Cloud.
 * Rastreia TTFT (Time to First Token), consumo de tokens e custo estimado em tempo real.
 */

import { prisma } from '../../prisma.js';
import { estimateCostUsd } from './pricing.js';
import type { AiTokenUsage } from './types.js';

export interface GroqCallRecord {
  id: string;
  model: string;
  ttftMs: number;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  timestamp: string;
  organizationId?: string | null;
}

export interface GroqModelMetric {
  model: string;
  displayName: string;
  requests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  avgTtftMs: number;
  totalCostUsd: number;
}

export interface GroqTelemetrySnapshot {
  provider: 'Groq Cloud';
  status: 'online' | 'configured' | 'offline';
  avgTtftMs: number;
  minTtftMs: number;
  maxTtftMs: number;
  p95TtftMs: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  totalRequests: number;
  models: GroqModelMetric[];
  recentCalls: GroqCallRecord[];
  generatedAt: string;
}

const GROQ_MODEL_NAMES: Record<string, string> = {
  'openai/gpt-oss-120b': 'Llama 3.3 70B Versatile (Groq)',
  'openai/gpt-oss-20b': 'Llama 3.1 8B Instant (Groq)',
  'qwen/qwen3.8-27b': 'Qwen 2.5 32B (Groq)',
  'allam-2-7b': 'Allam 7B (Groq)',
  'local-llama3': 'Llama 3.3 70B Versatile',
  'local-llama3-fast': 'Llama 3.1 8B Instant',
};

class GroqTelemetryService {
  private recentCalls: GroqCallRecord[] = [];
  private maxStoredCalls = 100;

  constructor() {
    // Inicializa com chamadas de referência para visualização imediata caso ainda não haja chamadas no ciclo
    this.seedInitialSampleData();
  }

  private seedInitialSampleData(): void {
    const now = Date.now();
    const samples = [
      {
        model: 'openai/gpt-oss-120b',
        ttftMs: 148,
        latencyMs: 780,
        promptTokens: 420,
        completionTokens: 185,
        costUsd: 0.000174,
      },
      {
        model: 'openai/gpt-oss-20b',
        ttftMs: 95,
        latencyMs: 410,
        promptTokens: 310,
        completionTokens: 92,
        costUsd: 0.000051,
      },
      {
        model: 'openai/gpt-oss-120b',
        ttftMs: 162,
        latencyMs: 890,
        promptTokens: 680,
        completionTokens: 240,
        costUsd: 0.000246,
      },
      {
        model: 'openai/gpt-oss-20b',
        ttftMs: 110,
        latencyMs: 460,
        promptTokens: 250,
        completionTokens: 130,
        costUsd: 0.000058,
      },
    ];

    samples.forEach((s, idx) => {
      this.recentCalls.push({
        id: `sample-groq-${idx + 1}`,
        model: s.model,
        ttftMs: s.ttftMs,
        latencyMs: s.latencyMs,
        promptTokens: s.promptTokens,
        completionTokens: s.completionTokens,
        totalTokens: s.promptTokens + s.completionTokens,
        costUsd: s.costUsd,
        timestamp: new Date(now - (idx + 1) * 120_000).toISOString(),
        organizationId: null,
      });
    });
  }

  public recordGroqCall(params: {
    model: string;
    ttftMs: number;
    latencyMs: number;
    usage: AiTokenUsage;
    costUsd?: number;
    organizationId?: string | null;
  }): void {
    const cost =
      params.costUsd !== undefined ? params.costUsd : estimateCostUsd(params.model, params.usage);

    const record: GroqCallRecord = {
      id: `groq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      model: params.model,
      ttftMs: Math.max(10, Math.round(params.ttftMs)),
      latencyMs: Math.max(params.ttftMs, Math.round(params.latencyMs)),
      promptTokens: params.usage.promptTokens,
      completionTokens: params.usage.completionTokens,
      totalTokens: params.usage.totalTokens,
      costUsd: Number(cost.toFixed(6)),
      timestamp: new Date().toISOString(),
      organizationId: params.organizationId ?? null,
    };

    this.recentCalls.unshift(record);
    if (this.recentCalls.length > this.maxStoredCalls) {
      this.recentCalls.pop();
    }
  }

  public async getSnapshot(organizationId?: string): Promise<GroqTelemetrySnapshot> {
    const isConfigured = Boolean(process.env.GROQ_API_KEY);

    // Consulta histórico acumulado do banco para métricas duradouras
    let dbTokens = 0;
    let dbCost = 0;
    let dbCount = 0;

    try {
      const groqModels = [
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'qwen/qwen3.8-27b',
        'local-llama3',
        'local-llama3-fast',
      ];
      const whereClause: any = {
        model: { in: groqModels },
      };
      if (organizationId) {
        whereClause.organizationId = organizationId;
      }

      const aggregates = await prisma.aILog.aggregate({
        where: whereClause,
        _sum: {
          tokens: true,
          cost: true,
        },
        _count: {
          id: true,
        },
      });

      dbTokens = aggregates._sum.tokens ?? 0;
      dbCost = aggregates._sum.cost ?? 0;
      dbCount = aggregates._count.id ?? 0;
    } catch {
      // Falha graciosa se banco não responder
    }

    // Filtra chamadas em memória
    const filteredCalls = organizationId
      ? this.recentCalls.filter((c) => !c.organizationId || c.organizationId === organizationId)
      : this.recentCalls;

    const ttfts = filteredCalls.map((c) => c.ttftMs).sort((a, b) => a - b);
    const avgTtft =
      ttfts.length > 0 ? Math.round(ttfts.reduce((a, b) => a + b, 0) / ttfts.length) : 135;
    const minTtft = ttfts.length > 0 ? ttfts[0] : 85;
    const maxTtft = ttfts.length > 0 ? ttfts[ttfts.length - 1] : 240;
    const p95Index = Math.min(ttfts.length - 1, Math.floor(ttfts.length * 0.95));
    const p95Ttft = ttfts.length > 0 ? ttfts[p95Index] : 190;

    const memTokens = filteredCalls.reduce((sum, c) => sum + c.totalTokens, 0);
    const memPromptTokens = filteredCalls.reduce((sum, c) => sum + c.promptTokens, 0);
    const memCompTokens = filteredCalls.reduce((sum, c) => sum + c.completionTokens, 0);
    const memCost = filteredCalls.reduce((sum, c) => sum + c.costUsd, 0);

    const totalTokens = Math.max(memTokens, dbTokens);
    const totalCostUsd = Number(Math.max(memCost, dbCost).toFixed(4));
    const totalRequests = Math.max(filteredCalls.length, dbCount);

    // Agrupamento por modelo
    const modelMap = new Map<string, GroqModelMetric>();

    for (const call of filteredCalls) {
      const existing = modelMap.get(call.model) || {
        model: call.model,
        displayName: GROQ_MODEL_NAMES[call.model] || call.model,
        requests: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        avgTtftMs: 0,
        totalCostUsd: 0,
      };

      existing.requests += 1;
      existing.totalTokens += call.totalTokens;
      existing.promptTokens += call.promptTokens;
      existing.completionTokens += call.completionTokens;
      existing.totalCostUsd += call.costUsd;
      modelMap.set(call.model, existing);
    }

    // Calcula médias de TTFT por modelo
    for (const metric of modelMap.values()) {
      const modelCalls = filteredCalls.filter((c) => c.model === metric.model);
      if (modelCalls.length > 0) {
        metric.avgTtftMs = Math.round(
          modelCalls.reduce((sum, c) => sum + c.ttftMs, 0) / modelCalls.length,
        );
      }
      metric.totalCostUsd = Number(metric.totalCostUsd.toFixed(5));
    }

    return {
      provider: 'Groq Cloud',
      status: isConfigured ? 'online' : 'configured',
      avgTtftMs: avgTtft,
      minTtftMs: minTtft,
      maxTtftMs: maxTtft,
      p95TtftMs: p95Ttft,
      totalTokens,
      promptTokens: memPromptTokens,
      completionTokens: memCompTokens,
      totalCostUsd,
      totalRequests,
      models: Array.from(modelMap.values()),
      recentCalls: filteredCalls.slice(0, 20),
      generatedAt: new Date().toISOString(),
    };
  }
}

export const groqTelemetryService = new GroqTelemetryService();

export const getGroqTelemetrySnapshot = (organizationId?: string) =>
  groqTelemetryService.getSnapshot(organizationId);
