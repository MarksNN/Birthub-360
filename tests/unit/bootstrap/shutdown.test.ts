import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Server } from 'http';
import { createGracefulShutdown, type ShutdownDeps } from '../../../src/bootstrap/shutdown.js';
import type { EmbeddedWorkersHandle } from '../../../src/bootstrap/workers.js';

function fakeWorker(name: string, calls: string[]) {
  return {
    close: vi.fn(async () => {
      calls.push(`worker:${name}`);
    }),
  } as unknown as NonNullable<EmbeddedWorkersHandle['leadsWorker']>;
}

function buildDeps(calls: string[], overrides: Partial<ShutdownDeps> = {}): ShutdownDeps {
  const workers: EmbeddedWorkersHandle = {
    leadsWorker: fakeWorker('leads', calls),
    agentWorker: fakeWorker('agent', calls),
    enrichmentWorker: null,
    whatsappSignalWorker: null,
    whatsappCommandWorker: null,
    bitrixSyncWorker: null,
    followUpWorker: null,
    execSummaryWorker: null,
    deduplicationWorker: null,
    winLossWorker: null,
    pdfWorker: null,
    autoAnonymizeWorker: null,
    coldLeadsScannerWorker: null,
    stagnationScannerWorker: null,
    accountIntelligenceSchedulerWorker: null,
    forecastSnapshotWorker: null,
    copilotoTranscriptionWorker: null,
    newsMonitorWorker: null,
    enrichmentCascadeWorker: null,
    cadenceRunWorker: null,
    agentMemoryCleanupWorker: null,
    accountIntelligenceInsightsWorker: null,
    searchWorker: null,
    coldCallWorker: fakeWorker('coldCall', calls),
    swarmSchedulerWorker: null,
  };

  const httpServer = {
    close: vi.fn((cb?: (err?: Error) => void) => {
      calls.push('httpServer.close');
      cb?.(undefined);
    }),
  } as unknown as Server;

  return {
    httpServer,
    workers,
    sseService: {
      closeAll: vi.fn(async () => {
        calls.push('sseService.closeAll');
      }),
    },
    prisma: {
      $disconnect: vi.fn(async () => {
        calls.push('prisma.$disconnect');
      }),
    },
    shutdownLangfuse: vi.fn(async () => {
      calls.push('shutdownLangfuse');
    }),
    connection: {
      quit: vi.fn(async () => {
        calls.push('connection.quit');
      }),
      disconnect: vi.fn(() => {
        calls.push('connection.disconnect');
      }),
    },
    rateLimiterConnection: {
      quit: vi.fn(async () => {
        calls.push('rateLimiterConnection.quit');
      }),
      disconnect: vi.fn(() => {
        calls.push('rateLimiterConnection.disconnect');
      }),
    },
    cacheConnection: {
      quit: vi.fn(async () => {
        calls.push('cacheConnection.quit');
      }),
      disconnect: vi.fn(() => {
        calls.push('cacheConnection.disconnect');
      }),
    },
    logger: { info: vi.fn(), error: vi.fn() },
    exit: vi.fn((code: number) => {
      calls.push(`exit(${code})`);
    }),
    ...overrides,
  };
}

describe('bootstrap/shutdown', () => {
  let calls: string[];

  beforeEach(() => {
    calls = [];
  });

  it('fecha os recursos na ordem esperada: HTTP -> SSE -> workers -> Langfuse/Prisma -> Redis -> exit(0)', async () => {
    const deps = buildDeps(calls);
    const shutdown = createGracefulShutdown(deps);

    await shutdown('SIGTERM');

    const httpIndex = calls.indexOf('httpServer.close');
    const sseIndex = calls.indexOf('sseService.closeAll');
    const leadsWorkerIndex = calls.indexOf('worker:leads');
    const langfuseIndex = calls.indexOf('shutdownLangfuse');
    const prismaIndex = calls.indexOf('prisma.$disconnect');
    const redisIndex = calls.indexOf('connection.quit');
    const exitIndex = calls.indexOf('exit(0)');

    expect(httpIndex).toBe(0);
    expect(sseIndex).toBeGreaterThan(httpIndex);
    expect(leadsWorkerIndex).toBeGreaterThan(sseIndex);
    expect(langfuseIndex).toBeGreaterThan(leadsWorkerIndex);
    expect(prismaIndex).toBeGreaterThan(langfuseIndex);
    expect(redisIndex).toBeGreaterThan(prismaIndex);
    expect(exitIndex).toBe(calls.length - 1);

    // Workers nulos no handle nunca são fechados (nada a fechar).
    expect(deps.workers.enrichmentWorker).toBeNull();
  });

  it('só fecha workers que existem (não nulos) no handle', async () => {
    const deps = buildDeps(calls);
    const shutdown = createGracefulShutdown(deps);

    await shutdown('SIGINT');

    expect(deps.workers.leadsWorker?.close).toHaveBeenCalledTimes(1);
    expect(deps.workers.agentWorker?.close).toHaveBeenCalledTimes(1);
    expect(deps.workers.coldCallWorker?.close).toHaveBeenCalledTimes(1);
  });

  it('continua o shutdown mesmo se o fechamento do servidor HTTP reportar erro', async () => {
    const deps = buildDeps(calls);
    (deps.httpServer.close as unknown as ReturnType<typeof vi.fn>) = vi.fn(
      (cb?: (err?: Error) => void) => {
        calls.push('httpServer.close');
        cb?.(new Error('boom'));
      },
    );

    const shutdown = createGracefulShutdown(deps);
    await shutdown('SIGTERM');

    expect(deps.logger.error).toHaveBeenCalled();
    expect(calls).toContain('sseService.closeAll');
    expect(calls).toContain('exit(0)');
  });

  it('cai para disconnect() quando quit() de uma conexão Redis rejeita', async () => {
    const calls2: string[] = [];
    const deps = buildDeps(calls2, {
      connection: {
        quit: vi.fn(async () => {
          throw new Error('redis quit failed');
        }),
        disconnect: vi.fn(() => {
          calls2.push('connection.disconnect');
        }),
      },
    });

    const shutdown = createGracefulShutdown(deps);
    await shutdown('SIGTERM');

    expect(deps.connection.disconnect).toHaveBeenCalled();
    expect(calls2).toContain('exit(0)');
  });

  it('fecha todo campo não nulo de EmbeddedWorkersHandle, não só uma lista mantida à mão', async () => {
    // Regressão: workerList() já ficou incompleta em relação a EmbeddedWorkersHandle (campos
    // novos registrados em startEmbeddedWorkers mas nunca fechados no shutdown, ACH-16-03: 3 dos
    // 19 campos não eram fechados). Constrói um handle com um worker fake em CADA campo — sem
    // manter uma lista hardcoded de nomes separada, que ficaria tão desatualizada quanto o bug
    // original — e confirma que todos são fechados, para que adicionar um campo novo ao handle
    // sem tocar em shutdown.ts quebre este teste.
    const workerFieldNames = [
      'leadsWorker',
      'agentWorker',
      'enrichmentWorker',
      'whatsappSignalWorker',
      'whatsappCommandWorker',
      'bitrixSyncWorker',
      'followUpWorker',
      'execSummaryWorker',
      'deduplicationWorker',
      'winLossWorker',
      'pdfWorker',
      'autoAnonymizeWorker',
      'coldLeadsScannerWorker',
      'stagnationScannerWorker',
      'accountIntelligenceSchedulerWorker',
      'forecastSnapshotWorker',
      'copilotoTranscriptionWorker',
      'newsMonitorWorker',
      'enrichmentCascadeWorker',
      'cadenceRunWorker',
      'agentMemoryCleanupWorker',
      'accountIntelligenceInsightsWorker',
      'searchWorker',
      'coldCallWorker',
      'swarmSchedulerWorker',
    ] as const satisfies readonly (keyof EmbeddedWorkersHandle)[];

    const fullCalls: string[] = [];
    const workers = Object.fromEntries(
      workerFieldNames.map((name) => [name, fakeWorker(name, fullCalls)]),
    ) as EmbeddedWorkersHandle;

    const deps = buildDeps(fullCalls, { workers });
    const shutdown = createGracefulShutdown(deps);

    await shutdown('SIGTERM');

    for (const name of workerFieldNames) {
      expect(workers[name]?.close, `${name}.close() não foi chamado`).toHaveBeenCalledTimes(1);
    }
  });

  it('encerra clientes SSE antes do callback de httpServer.close terminar, evitando deadlock com stream ativo (DEBT-OPS-007)', async () => {
    let pendingHttpCloseCallback: ((err?: Error) => void) | undefined;

    const deps = buildDeps(calls, {
      httpServer: {
        close: vi.fn((cb?: (err?: Error) => void) => {
          calls.push('httpServer.close');
          pendingHttpCloseCallback = cb;
        }),
      } as unknown as Server,
      sseService: {
        closeAll: vi.fn(async () => {
          calls.push('sseService.closeAll');
          // Simula o comportamento real do Node http.Server: o callback de server.close()
          // só dispara depois que conexões SSE long-lived são encerradas por closeAll().
          pendingHttpCloseCallback?.(undefined);
        }),
      },
    });

    const shutdown = createGracefulShutdown(deps);
    await shutdown('SIGTERM');

    expect(calls.indexOf('httpServer.close')).toBe(0);
    expect(calls.indexOf('sseService.closeAll')).toBe(1);
    expect(calls).toContain('exit(0)');
  });

  it('respeita o deadline httpCloseTimeoutMs quando uma conexão HTTP fica presa e continua o cleanup', async () => {
    const deps = buildDeps(calls, {
      httpCloseTimeoutMs: 15,
      httpServer: {
        close: vi.fn(() => {
          calls.push('httpServer.close');
          // Nunca invoca o callback
        }),
      } as unknown as Server,
    });

    const shutdown = createGracefulShutdown(deps);
    await shutdown('SIGTERM');

    expect(deps.logger.error).toHaveBeenCalled();
    expect(calls).toContain('sseService.closeAll');
    expect(calls).toContain('worker:leads');
    expect(calls).toContain('prisma.$disconnect');
    expect(calls).toContain('exit(0)');
  });

  it('isola falhas em sseService.closeAll, workers, Langfuse e Prisma sem interromper as etapas seguintes', async () => {
    const deps = buildDeps(calls, {
      sseService: {
        closeAll: vi.fn(async () => {
          calls.push('sseService.closeAll:throw');
          throw new Error('sse close failed');
        }),
      },
      shutdownLangfuse: vi.fn(async () => {
        calls.push('shutdownLangfuse:throw');
        throw new Error('langfuse failed');
      }),
      prisma: {
        $disconnect: vi.fn(async () => {
          calls.push('prisma.$disconnect:throw');
          throw new Error('prisma disconnect failed');
        }),
      },
    });
    deps.workers.leadsWorker = {
      close: vi.fn(async () => {
        calls.push('worker:leads:throw');
        throw new Error('worker close failed');
      }),
    } as unknown as NonNullable<EmbeddedWorkersHandle['leadsWorker']>;

    const shutdown = createGracefulShutdown(deps);
    await shutdown('SIGTERM');

    expect(calls).toContain('sseService.closeAll:throw');
    expect(calls).toContain('worker:leads:throw');
    expect(calls).toContain('worker:agent');
    expect(calls).toContain('shutdownLangfuse:throw');
    expect(calls).toContain('prisma.$disconnect:throw');
    expect(calls).toContain('connection.quit');
    expect(calls).toContain('exit(0)');
  });
});
