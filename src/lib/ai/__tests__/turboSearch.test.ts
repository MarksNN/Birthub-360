// @vitest-environment node
// Provider and database calls below are mocks, not external connectivity evidence.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  chat: vi.fn(),
  budget: vi.fn(),
  quota: vi.fn(),
  org: vi.fn(),
  aggregate: vi.fn(),
  log: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('../../../config/env.js', () => ({ env: {} }));
vi.mock('../../prisma.js', () => ({
  prisma: { organization: { findUnique: mocks.org }, aILog: { aggregate: mocks.aggregate } },
}));
vi.mock('../budget.js', () => ({ assertAiBudgetNotExceeded: mocks.budget }));
vi.mock('../finops/tokenQuota.service.js', () => ({
  tokenQuotaService: { enforceTokenQuota: mocks.quota },
}));
vi.mock('../gateway/providers/groq.provider.js', () => ({
  groqProvider: {
    isConfigured: () => Boolean(process.env.GROQ_API_KEY),
    chatCompletion: mocks.chat,
  },
}));
vi.mock('../gateway/pricing.js', () => ({ estimateCostUsd: () => 0.001 }));
vi.mock('../usage-log.js', () => ({ logAiUsage: mocks.log }));

import { requestContext } from '../../async-context.js';
import { getTurboAIProviderHealth, interpretTurboSearch } from '../turboSearch.js';

const input = {
  query: 'Engenharia civil em São Paulo com 20 a 200 funcionários',
  consent: true as const,
  organizationId: 'tenant-a',
  userId: 'user-a',
};
const filters = {
  segment: 'Engenharia civil',
  locations: ['São Paulo'],
  employeeMin: 20,
  employeeMax: 200,
  keywords: [],
  excludedKeywords: [],
  cnaes: [],
  personas: [],
};
const run = (options = {}) =>
  requestContext.run({ tenantId: 'tenant-a' }, () =>
    interpretTurboSearch({ ...input, ...options }),
  );
const response = (data: unknown, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => data,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('GROQ_API_KEY', 'mock-only');
  vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-20b');
  vi.stubEnv('OLLAMA_BASE_URL', '');
  vi.stubEnv('OLLAMA_HOST', '');
  vi.stubEnv('OLLAMA_MODEL', '');
  vi.stubEnv('OLLAMA_API_KEY', '');
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.fetch.mockResolvedValue(response({ data: [{ id: 'openai/gpt-oss-20b' }] }));
  mocks.chat.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(filters) } }],
    usage: { total_tokens: 12, prompt_tokens: 8, completion_tokens: 4 },
  });
  mocks.org.mockResolvedValue({ monthlyAiBudgetUsd: 1 });
  mocks.aggregate.mockResolvedValue({ _sum: { cost: 0 } });
  mocks.quota.mockResolvedValue({ allowed: true });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Turbo interpretation with mocked providers', () => {
  it('returns validated filters with explicit paid consent and limits', async () => {
    const result = await run({ mode: 'groq', allowPaidProviders: true });
    expect(result.filters).toEqual(filters);
    expect(result.provider).toBe('groq');
    expect(mocks.chat).toHaveBeenCalledWith(
      expect.objectContaining({ maxTokens: 512, jsonMode: true, retries: 0 }),
    );
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({ costInUsd: 0.001 }));
  });
  it('never invokes paid generation without authorization', async () => {
    await expect(run()).rejects.toThrow('não autorizado');
    expect(mocks.chat).not.toHaveBeenCalled();
  });
  it('requires explicit data consent', async () => {
    await expect(run({ consent: false })).rejects.toThrow();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('rejects cross-tenant calls before network access', async () => {
    await expect(run({ organizationId: 'tenant-b' })).rejects.toThrow('organização inválido');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('redacts contact identifiers before generation', async () => {
    await run({
      mode: 'groq',
      allowPaidProviders: true,
      query: 'Empresas telefone 11987654321 e contato@transportadora.com.br',
    });
    const messages = mocks.chat.mock.calls[0][0].messages;
    expect(JSON.stringify(messages)).not.toContain('contato@transportadora.com.br');
    expect(JSON.stringify(messages)).not.toContain('11987654321');
  });
  it('blocks paid generation when ledger unavailable', async () => {
    mocks.aggregate.mockRejectedValue(new Error('database unavailable'));
    await expect(run({ allowPaidProviders: true })).rejects.toThrow();
    expect(mocks.chat).not.toHaveBeenCalled();
  });
  it('blocks insufficient tenant budget', async () => {
    mocks.org.mockResolvedValue({ monthlyAiBudgetUsd: 0 });
    await expect(run({ allowPaidProviders: true })).rejects.toThrow('Orçamento');
    expect(mocks.chat).not.toHaveBeenCalled();
  });
  it('blocks insufficient request budget and quota', async () => {
    await expect(run({ allowPaidProviders: true, maxCostUsd: 0.0001 })).rejects.toThrow(
      'Orçamento',
    );
    mocks.quota.mockResolvedValue({ allowed: false });
    await expect(run({ allowPaidProviders: true })).rejects.toThrow('Quota');
    expect(mocks.chat).not.toHaveBeenCalled();
  });
  it('rejects unknown-priced models', async () => {
    mocks.fetch.mockResolvedValue(response({ data: [{ id: 'unknown-model' }] }));
    await expect(run({ allowPaidProviders: true, model: 'unknown-model' })).rejects.toThrow(
      'preço',
    );
    expect(mocks.chat).not.toHaveBeenCalled();
  });
  it.each([
    'invalid json',
    JSON.stringify({ companies: [{ name: 'invented' }] }),
    JSON.stringify({ employeeMin: 200, employeeMax: 20 }),
  ])('rejects invalid provider response %s', async (content) => {
    mocks.chat.mockResolvedValue({ choices: [{ message: { content } }] });
    await expect(run({ allowPaidProviders: true })).rejects.toThrow('filtros inválidos');
  });
  it('discovers models with read-only health without exposing credentials', async () => {
    const status = await getTurboAIProviderHealth();
    expect(status[0]).toMatchObject({ status: 'available', models: ['openai/gpt-oss-20b'] });
    expect(JSON.stringify(status)).not.toContain('mock-only');
    expect(mocks.chat).not.toHaveBeenCalled();
    expect(mocks.fetch.mock.calls[0][1]).not.toHaveProperty('body');
  });
  it('reports invalid model discovery and auth failure as unavailable', async () => {
    mocks.fetch.mockResolvedValue(response({ error: 'secret' }, 401));
    const status = await getTurboAIProviderHealth();
    expect(status[0].status).toBe('unavailable');
    expect(JSON.stringify(status)).not.toContain('secret');
  });
  it('blocks insecure remote Ollama before network request', async () => {
    vi.stubEnv('OLLAMA_BASE_URL', 'http://public.example.com');
    vi.stubEnv('GROQ_API_KEY', '');
    const status = await getTurboAIProviderHealth();
    expect(status[1].status).toBe('unavailable');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('uses discovered local model and zero provider cost', async () => {
    vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434');
    mocks.fetch.mockImplementation(async (url: string) =>
      url.endsWith('/api/tags')
        ? response({ models: [{ name: 'nomic-embed-text' }, { name: 'llama3:latest' }] })
        : response({
            message: { content: JSON.stringify(filters) },
            prompt_eval_count: 5,
            eval_count: 5,
          }),
    );
    const result = await run();
    expect(result).toMatchObject({ provider: 'ollama', model: 'llama3:latest', filters });
    expect(mocks.chat).not.toHaveBeenCalled();
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({ costInUsd: 0 }));
    expect(mocks.fetch.mock.calls[1][1]).toMatchObject({
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
  });
  it('falls back from invalid local JSON only when Groq authorized', async () => {
    vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434');
    mocks.fetch.mockImplementation(async (url: string) =>
      url.endsWith('/api/tags')
        ? response({ models: [{ name: 'llama3' }] })
        : url.endsWith('/api/chat')
          ? response({ message: { content: 'invalid' } })
          : response({ data: [{ id: 'openai/gpt-oss-20b' }] }),
    );
    const result = await run({ allowPaidProviders: true });
    expect(result.provider).toBe('groq');
    expect(result.warnings).toContain('ollama: falha de conexão, timeout ou filtros inválidos.');
  });
  it('handles provider timeout without invented successful filters', async () => {
    mocks.chat.mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    await expect(run({ allowPaidProviders: true })).rejects.toThrow('timeout');
    expect(mocks.log).toHaveBeenCalledWith(
      expect.objectContaining({
        promptId: 'turbo-search-interpret-estimated',
        usage: expect.objectContaining({ completionTokens: 512 }),
      }),
    );
  });
  it('records conservative usage when paid response omits token accounting', async () => {
    mocks.chat.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(filters) } }] });
    const result = await run({ allowPaidProviders: true });
    expect(result.usageEstimated).toBe(true);
    expect(result.usage.totalTokens).toBeGreaterThan(512);
    expect(mocks.log).toHaveBeenCalledWith(
      expect.objectContaining({ promptId: 'turbo-search-interpret-estimated' }),
    );
  });
  it('blocks simultaneous paid interpretations and releases the lock after failure', async () => {
    let release!: (value: unknown) => void;
    mocks.chat.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = run({ allowPaidProviders: true });
    await vi.waitFor(() => expect(mocks.chat).toHaveBeenCalled());
    await expect(run({ allowPaidProviders: true })).rejects.toThrow('ocupada');
    release({ choices: [{ message: { content: 'invalid' } }] });
    await expect(pending).rejects.toThrow('inválidos');
    await expect(run({ allowPaidProviders: true })).resolves.toHaveProperty('filters');
  });
});
