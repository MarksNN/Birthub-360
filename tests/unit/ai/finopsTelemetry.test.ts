import { beforeEach, describe, expect, it } from 'vitest';
import {
  FinOpsTelemetryService,
} from '../../../src/lib/ai/gateway/finopsTelemetry.js';

describe('FinOps Telemetry Service (Passo 051)', () => {
  let service: FinOpsTelemetryService;
  const orgId = 'org-finops-alpha';

  beforeEach(() => {
    service = new FinOpsTelemetryService();
  });

  it('deve calcular o custo em USD e gravar métricas de inferência com precisão', () => {
    const record = service.recordInference({
      organizationId: orgId,
      model: 'openai/gpt-oss-120b',
      promptId: 'predictive-revenue-forecast',
      latencyMs: 145,
      usage: {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      },
    });

    // openai/gpt-oss-120b: input 0.15/1M, output 0.60/1M
    // 1000 * 0.15 / 1M = 0.00015
    // 500 * 0.60 / 1M = 0.00030
    // Total = 0.00045 USD
    expect(record.costUsd).toBeCloseTo(0.00045, 5);
    expect(record.latencyMs).toBe(145);
    expect(record.totalTokens).toBe(1500);
  });

  it('deve consolidar o resumo FinOps da organização com múltiplos chamados', () => {
    service.recordInference({
      organizationId: orgId,
      model: 'local-llama3-fast',
      promptId: 'query-1',
      latencyMs: 100,
      usage: { promptTokens: 2000, completionTokens: 1000, totalTokens: 3000 },
    });

    service.recordInference({
      organizationId: orgId,
      model: 'local-llama3-fast',
      promptId: 'query-2',
      latencyMs: 200,
      usage: { promptTokens: 4000, completionTokens: 2000, totalTokens: 6000 },
    });

    const summary = service.getOrganizationSummary(orgId);

    expect(summary.totalCalls).toBe(2);
    expect(summary.totalTokens).toBe(9000);
    expect(summary.averageLatencyMs).toBe(150);
    expect(summary.totalCostUsd).toBeGreaterThan(0);
  });

  it('deve retornar zeros para organização sem chamados registrados', () => {
    const summary = service.getOrganizationSummary('org-empty');
    expect(summary.totalCalls).toBe(0);
    expect(summary.totalTokens).toBe(0);
    expect(summary.totalCostUsd).toBe(0);
  });
});
