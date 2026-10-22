import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/config/env.js', () => ({
  env: { DATABASE_URL: 'postgresql://test/test' },
}));
vi.mock('../../../../src/lib/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// PR #39: ensureCheckpointerReady() não chama mais setup(); confere a versão em
// checkpoint_migrations (pool.query). `setupMock` agora é o mock dessa query.
const { poolEndMock, setupMock } = vi.hoisted(() => ({
  poolEndMock: vi.fn().mockResolvedValue(undefined),
  setupMock: vi.fn().mockResolvedValue({ rows: [{ v: 4 }] }),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(function FakePool() {
    return { on: vi.fn(), end: poolEndMock, query: setupMock };
  }),
}));

vi.mock('@langchain/langgraph-checkpoint-postgres', () => ({
  PostgresSaver: vi.fn().mockImplementation(function FakePostgresSaver() {
    return { setup: vi.fn() };
  }),
}));

import {
  ensureCheckpointerReady,
  closeCheckpointerPool,
  __resetCheckpointerSetupForTests,
} from '../../../../src/lib/ai/checkpointer.js';

/**
 * AI-002 (onda 32): checkpointer real de LangGraph (src/lib/ai/checkpointer.ts). Este teste cobre
 * só a memoização de `ensureCheckpointerReady()` (com pg/PostgresSaver mockados) — a garantia real
 * de persistência entre processos independentes está em
 * tests/integration/langgraph-checkpointer.test.ts (Postgres real).
 */
describe('src/lib/ai/checkpointer.ts (AI-002)', () => {
  beforeEach(() => {
    setupMock.mockClear();
    poolEndMock.mockClear();
    __resetCheckpointerSetupForTests();
  });

  afterEach(() => {
    setupMock.mockReset();
    setupMock.mockResolvedValue({ rows: [{ v: 4 }] });
  });

  it('chama setup() apenas uma vez, mesmo com chamadas concorrentes', async () => {
    await Promise.all([
      ensureCheckpointerReady(),
      ensureCheckpointerReady(),
      ensureCheckpointerReady(),
    ]);

    expect(setupMock).toHaveBeenCalledTimes(1);
  });

  it('chamadas sequenciais depois do sucesso não recomputam', async () => {
    await ensureCheckpointerReady();
    await ensureCheckpointerReady();

    expect(setupMock).toHaveBeenCalledTimes(1);
  });

  it('após uma falha, a próxima chamada tenta novamente (não fica permanentemente quebrado)', async () => {
    setupMock.mockRejectedValueOnce(new Error('conexão recusada'));
    await expect(ensureCheckpointerReady()).rejects.toThrow('conexão recusada');

    await expect(ensureCheckpointerReady()).resolves.toBeUndefined();
    expect(setupMock).toHaveBeenCalledTimes(2);
  });

  it('__resetCheckpointerSetupForTests força um novo setup() na próxima chamada', async () => {
    await ensureCheckpointerReady();
    __resetCheckpointerSetupForTests();
    await ensureCheckpointerReady();

    expect(setupMock).toHaveBeenCalledTimes(2);
  });

  it('falha com mensagem clara se a migration do checkpointer não rodou (versão < esperada)', async () => {
    setupMock.mockResolvedValueOnce({ rows: [{ v: 2 }] });
    await expect(ensureCheckpointerReady()).rejects.toThrow(/versão 2, esperado 4/);
  });

  it('closeCheckpointerPool fecha o pool dedicado do checkpointer', async () => {
    await closeCheckpointerPool();

    expect(poolEndMock).toHaveBeenCalledTimes(1);
  });
});
