// @vitest-environment node
/**
 * Agente 15 (parecer 24 do #102): usa os caminhos REAIS do logger (LOGGER_REDACT_PATHS) — não uma
 * cópia — e garante que cada credencial de integração sai [REDACTED] no topo e num nível aninhado.
 */
import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { LOGGER_REDACT_PATHS } from '../../../src/lib/logger.js';

const FIELDS = [
  'refreshToken',
  'apiKey',
  'clientSecret',
  'webhookSecret',
  'authToken',
  'appKey',
  // já existentes, não podem regredir
  'accessToken',
  'botToken',
  'appSecret',
  'appPassword',
  'webhookUrl',
  'token',
  'password',
  'secret',
] as const;

function capture() {
  let out = '';
  const dest = new Writable({
    write(chunk, _enc, cb) {
      out += chunk.toString();
      cb();
    },
  });
  const log = pino({ redact: { paths: LOGGER_REDACT_PATHS, censor: '[REDACTED]' } }, dest);
  return { log, read: () => JSON.parse(out) as Record<string, unknown> };
}

describe('logger redact — credenciais de integração', () => {
  it('cada campo tem forma de topo e *.campo na config', () => {
    for (const f of FIELDS) {
      expect(LOGGER_REDACT_PATHS).toContain(f);
      expect(LOGGER_REDACT_PATHS).toContain(`*.${f}`);
    }
  });

  it('redige todos os campos no topo e aninhados, preservando campos operacionais', () => {
    const { log, read } = capture();
    const top: Record<string, string> = {};
    const nested: Record<string, string> = {};
    for (const f of FIELDS) {
      top[f] = `top-${f}-SECRET`;
      nested[f] = `nested-${f}-SECRET`;
    }
    log.info({ route: '/x', provider: 'trello', ...top, config: nested }, 'cfg');
    const parsed = read();
    expect(parsed.route).toBe('/x');
    expect(parsed.provider).toBe('trello');
    const config = parsed.config as Record<string, unknown>;
    for (const f of FIELDS) {
      expect(parsed[f], `topo ${f}`).toBe('[REDACTED]');
      expect(config[f], `aninhado ${f}`).toBe('[REDACTED]');
    }
    expect(JSON.stringify(parsed)).not.toContain('SECRET');
  });
});
