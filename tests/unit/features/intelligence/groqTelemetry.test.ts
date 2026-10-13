import { describe, expect, it, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { groqTelemetryService } from '../../../../src/lib/ai/gateway/groqTelemetry.service.js';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    aILog: {
      aggregate: vi.fn().mockResolvedValue({
        _sum: { tokens: 12000, cost: 0.0035 },
        _count: { id: 18 },
      }),
    },
  },
}));

vi.mock('../../../../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

const { intelligenceRoutes } = await import(
  '../../../../src/features/intelligence/routes/intelligence.routes.js'
);

function buildApp(user = { id: 'usr-1', organizationId: 'org-groq-test', role: 'ADMIN' }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = user;
    next();
  });
  app.use('/api/intelligence', intelligenceRoutes);
  return app;
}

describe('Telemetria Groq Cloud (TTFT, Tokens e Custo Estimado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve registrar chamadas e calcular métricas de TTFT e tokens', () => {
    groqTelemetryService.recordGroqCall({
      model: 'openai/gpt-oss-120b',
      ttftMs: 130,
      latencyMs: 650,
      usage: {
        promptTokens: 500,
        completionTokens: 200,
        totalTokens: 700,
      },
      organizationId: 'org-groq-test',
    });

    groqTelemetryService.recordGroqCall({
      model: 'openai/gpt-oss-20b',
      ttftMs: 90,
      latencyMs: 380,
      usage: {
        promptTokens: 300,
        completionTokens: 100,
        totalTokens: 400,
      },
      organizationId: 'org-groq-test',
    });
  });

  it('deve retornar snapshot completo com TTFT, tokens e custo estimado via getSnapshot', async () => {
    const snapshot = await groqTelemetryService.getSnapshot('org-groq-test');

    expect(snapshot.provider).toBe('Groq Cloud');
    expect(snapshot.avgTtftMs).toBeGreaterThan(0);
    expect(snapshot.minTtftMs).toBeGreaterThan(0);
    expect(snapshot.maxTtftMs).toBeGreaterThanOrEqual(snapshot.minTtftMs);
    expect(snapshot.totalTokens).toBeGreaterThan(0);
    expect(snapshot.totalCostUsd).toBeGreaterThanOrEqual(0);
    expect(snapshot.models.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.recentCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('deve expor endpoint GET /api/intelligence/telemetry/groq com dados da Groq Cloud', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/intelligence/telemetry/groq');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.provider).toBe('Groq Cloud');
    expect(res.body.data.avgTtftMs).toBeDefined();
    expect(res.body.data.totalTokens).toBeDefined();
    expect(res.body.data.totalCostUsd).toBeDefined();
    expect(Array.isArray(res.body.data.models)).toBe(true);
    expect(Array.isArray(res.body.data.recentCalls)).toBe(true);
  });
});
