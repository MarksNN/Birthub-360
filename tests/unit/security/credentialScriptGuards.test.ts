// @vitest-environment node
/**
 * Agente 15 — abortos obrigatórios dos scripts de backfill/rotação (parecer 24 do #102):
 * chave explícita no env em QUALQUER NODE_ENV (sem fallback para a chave de dev), sem fallback
 * OLD_KEY→CREDENTIALS_ENCRYPTION_KEY / NEW_KEY→NEW_CREDENTIALS_ENCRYPTION_KEY, e --apply só com
 * --snapshot-confirmed=<id>. Puro: nada aqui conecta em banco.
 */
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  assertBackfillPreconditions,
  assertRotationPreconditions,
  parseSnapshotConfirmed,
  ScriptPreconditionError,
} from '../../../scripts/security/credential-script-guards.js';

const k = () => randomBytes(32).toString('base64');
const ARGV0 = ['node', 'script.ts'];

describe('assertBackfillPreconditions', () => {
  it.each(['development', 'test', 'production', undefined])(
    'aborta sem CREDENTIALS_ENCRYPTION_KEY explícita (NODE_ENV=%s)',
    (nodeEnv) => {
      expect(() => assertBackfillPreconditions({ NODE_ENV: nodeEnv }, ARGV0)).toThrow(
        ScriptPreconditionError,
      );
      expect(() =>
        assertBackfillPreconditions({ NODE_ENV: nodeEnv, CREDENTIALS_ENCRYPTION_KEY: '  ' }, ARGV0),
      ).toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
    },
  );

  it('aborta com chave inválida (≠ 32 bytes)', () => {
    expect(() =>
      assertBackfillPreconditions(
        { CREDENTIALS_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') },
        ARGV0,
      ),
    ).toThrow(/32 bytes/);
  });

  it('dry-run com chave válida passa, sem snapshot', () => {
    expect(assertBackfillPreconditions({ CREDENTIALS_ENCRYPTION_KEY: k() }, ARGV0)).toEqual({
      apply: false,
      snapshotId: null,
    });
  });

  it('--apply sem --snapshot-confirmed aborta; com id vazio aborta; com id passa', () => {
    const env = { CREDENTIALS_ENCRYPTION_KEY: k() };
    expect(() => assertBackfillPreconditions(env, [...ARGV0, '--apply'])).toThrow(
      /snapshot-confirmed/,
    );
    expect(() =>
      assertBackfillPreconditions(env, [...ARGV0, '--apply', '--snapshot-confirmed=']),
    ).toThrow(/snapshot-confirmed/);
    expect(() =>
      assertBackfillPreconditions(env, [...ARGV0, '--apply', '--snapshot-confirmed']),
    ).toThrow(/snapshot-confirmed/);
    expect(
      assertBackfillPreconditions(env, [...ARGV0, '--apply', '--snapshot-confirmed=rds-snap-42']),
    ).toEqual({ apply: true, snapshotId: 'rds-snap-42' });
  });
});

describe('assertRotationPreconditions', () => {
  it('aborta se faltar OLD_KEY — sem fallback para CREDENTIALS_ENCRYPTION_KEY', () => {
    const cur = k();
    expect(() =>
      assertRotationPreconditions({ CREDENTIALS_ENCRYPTION_KEY: cur, NEW_KEY: k() }, ARGV0),
    ).toThrow(/OLD_KEY/);
  });

  it('aborta se faltar NEW_KEY — sem fallback para NEW_CREDENTIALS_ENCRYPTION_KEY', () => {
    const cur = k();
    expect(() =>
      assertRotationPreconditions(
        { CREDENTIALS_ENCRYPTION_KEY: cur, OLD_KEY: cur, NEW_CREDENTIALS_ENCRYPTION_KEY: k() },
        ARGV0,
      ),
    ).toThrow(/NEW_KEY/);
  });

  it.each(['development', 'production', undefined])(
    'aborta sem CREDENTIALS_ENCRYPTION_KEY explícita (NODE_ENV=%s)',
    (nodeEnv) => {
      expect(() =>
        assertRotationPreconditions({ NODE_ENV: nodeEnv, OLD_KEY: k(), NEW_KEY: k() }, ARGV0),
      ).toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
    },
  );

  it('aborta com OLD==NEW, chave atual fora de {OLD,NEW} e --apply com --dry-run', () => {
    const a = k();
    expect(() =>
      assertRotationPreconditions({ CREDENTIALS_ENCRYPTION_KEY: a, OLD_KEY: a, NEW_KEY: a }, ARGV0),
    ).toThrow(/idênticas/);
    expect(() =>
      assertRotationPreconditions(
        { CREDENTIALS_ENCRYPTION_KEY: k(), OLD_KEY: a, NEW_KEY: k() },
        ARGV0,
      ),
    ).toThrow(/não corresponde/);
    expect(() =>
      assertRotationPreconditions({ CREDENTIALS_ENCRYPTION_KEY: a, OLD_KEY: a, NEW_KEY: k() }, [
        ...ARGV0,
        '--apply',
        '--dry-run',
        '--snapshot-confirmed=s1',
      ]),
    ).toThrow(/mutuamente exclusivos/);
  });

  it('dry-run por padrão; --apply exige --snapshot-confirmed=<id>', () => {
    const a = k();
    const env = { CREDENTIALS_ENCRYPTION_KEY: a, OLD_KEY: a, NEW_KEY: k() };
    expect(assertRotationPreconditions(env, ARGV0)).toMatchObject({
      apply: false,
      snapshotId: null,
    });
    expect(() => assertRotationPreconditions(env, [...ARGV0, '--apply'])).toThrow(
      /snapshot-confirmed/,
    );
    const ok = assertRotationPreconditions(env, [...ARGV0, '--apply', '--snapshot-confirmed=s-9']);
    expect(ok.apply).toBe(true);
    expect(ok.snapshotId).toBe('s-9');
    expect(ok.oldKey.equals(Buffer.from(a, 'base64'))).toBe(true);
  });
});

describe('parseSnapshotConfirmed', () => {
  it('ausente → null; último vence; vazio lança', () => {
    expect(parseSnapshotConfirmed(ARGV0)).toBeNull();
    expect(
      parseSnapshotConfirmed(['--snapshot-confirmed=a', '--snapshot-confirmed=b']),
    ).toBe('b');
    expect(() => parseSnapshotConfirmed(['--snapshot-confirmed=  '])).toThrow();
  });
});
