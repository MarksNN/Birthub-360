import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loggerErrorMock = vi.fn();
const loggerFatalMock = vi.fn();

vi.mock('../../../src/lib/logger.js', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    fatal: (...args: unknown[]) => loggerFatalMock(...args),
  },
}));

import {
  isKnownRedisUnavailableRejection,
  registerProcessGuards,
} from '../../../src/lib/process-guards.js';

describe('lib/process-guards (DEBT-OPS-006)', () => {
  const originalListeners = process.listeners('unhandledRejection');

  beforeEach(() => {
    loggerErrorMock.mockReset();
    loggerFatalMock.mockReset();
    process.removeAllListeners('unhandledRejection');
  });

  afterEach(() => {
    process.removeAllListeners('unhandledRejection');
    for (const listener of originalListeners) {
      process.on('unhandledRejection', listener);
    }
    vi.restoreAllMocks();
  });

  it('classifica erro de conexão com proveniência ioredis/BullMQ como indisponibilidade conhecida do Redis', () => {
    const redisErr = new Error('read ECONNRESET');
    redisErr.stack =
      'Error: read ECONNRESET\n    at Socket.onStreamRead (node:internal/stream_base_commons:217:20)\n    at Redis.eventHandler (/app/node_modules/ioredis/built/redis/event_handler.js:180:12)';

    expect(isKnownRedisUnavailableRejection(redisErr)).toBe(true);

    const closedErr = new Error('Connection is closed.');
    closedErr.name = 'MaxRetriesPerRequestError';
    expect(isKnownRedisUnavailableRejection(closedErr)).toBe(true);
  });

  it('rejeita ECONNRESET/ECONNREFUSED de aplicação sem proveniência Redis/BullMQ', () => {
    const appErr = new Error('read ECONNRESET');
    appErr.stack =
      'Error: read ECONNRESET\n    at TLSWrap.onStreamRead (node:internal/stream_base_commons:217:20)\n    at HttpClient.request (/app/src/features/crm/http.ts:42:11)';

    expect(isKnownRedisUnavailableRejection(appErr)).toBe(false);
    expect(isKnownRedisUnavailableRejection('raw string rejection')).toBe(false);
  });

  it('mantém processo ativo com logger.error para erro Redis conhecido e encerra com logger.fatal + process.exit(1) para ECONNRESET de aplicação', () => {
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as unknown as (code?: number) => never);

    registerProcessGuards();
    const listeners = process.listeners('unhandledRejection');
    const handler = listeners[listeners.length - 1];
    expect(handler).toBeDefined();

    const redisErr = new Error('Connection is closed.');
    redisErr.stack = 'Error: Connection is closed.\n    at Queue.init (/app/node_modules/bullmq/dist/esm/classes/queue.js:55:19)';
    handler?.(redisErr, Promise.resolve());

    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
    expect(loggerFatalMock).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();

    const appResetErr = new Error('read ECONNRESET');
    appResetErr.stack = 'Error: read ECONNRESET\n    at pgPool.query (/app/src/lib/prisma.ts:12:5)';
    handler?.(appResetErr, Promise.resolve());

    expect(loggerFatalMock).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
