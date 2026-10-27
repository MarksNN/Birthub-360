import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../../../src/lib/logger.js';

vi.mock('dotenv/config', () => ({}));
vi.mock('../../../../../src/lib/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    fatal: vi.fn(),
  },
}));

const ORIGINAL_ENV = { ...process.env };

async function loadEnv(port?: string) {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://localhost:5432/test',
  };
  if (port === undefined) delete process.env.PORT;
  else process.env.PORT = port;
  vi.mocked(logger.error).mockClear();

  return import('../../../../../src/config/env.js');
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('env.PORT validation', () => {
  it('defaults to 3005 when not provided', async () => {
    const { env } = await loadEnv();
    expect(env.PORT).toBe(3005);
  });

  it('falls back to 3005 when provided as an empty string', async () => {
    const { env } = await loadEnv('');
    expect(env.PORT).toBe(3005);
  });

  it('parses valid port strings into numbers', async () => {
    const { env } = await loadEnv('8080');
    expect(env.PORT).toBe(8080);
  });

  it.each(['3005abc', '0123', '65536', '-3000', '3000.5', '30 00'])(
    'rejects invalid PORT value %s through the application environment schema',
    async (port) => {
      await loadEnv(port);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.objectContaining({ PORT: expect.any(Object) }),
        }),
        expect.any(String),
      );
    },
  );
});
