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
  assertVerifyPreconditions,
  isVerifyMode,
  parseKeyEnvName,
  parseReencryptScope,
  parseSnapshotConfirmed,
  requireRedisUrl,
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

describe('--verify (somente leitura)', () => {
  it('isVerifyMode detecta a flag', () => {
    expect(isVerifyMode([...ARGV0, '--verify'])).toBe(true);
    expect(isVerifyMode(ARGV0)).toBe(false);
  });

  it('não exige NEW_KEY nem snapshot; usa CREDENTIALS_ENCRYPTION_KEY por padrão', () => {
    const cek = k();
    const pre = assertVerifyPreconditions({ CREDENTIALS_ENCRYPTION_KEY: cek }, [...ARGV0, '--verify']);
    expect(pre.keyEnv).toBe('CREDENTIALS_ENCRYPTION_KEY');
    expect(pre.key.equals(Buffer.from(cek, 'base64'))).toBe(true);
  });

  it('--key-env=NOME lê a chave de outra variável, explícita', () => {
    const vk = k();
    const pre = assertVerifyPreconditions({ VERIFY_KEY: vk }, [...ARGV0, '--verify', '--key-env=VERIFY_KEY']);
    expect(pre.keyEnv).toBe('VERIFY_KEY');
    expect(pre.key.equals(Buffer.from(vk, 'base64'))).toBe(true);
    // sem fallback para CREDENTIALS_ENCRYPTION_KEY quando a variável pedida não existe
    expect(() =>
      assertVerifyPreconditions({ CREDENTIALS_ENCRYPTION_KEY: k() }, [...ARGV0, '--verify', '--key-env=VERIFY_KEY']),
    ).toThrow(/VERIFY_KEY/);
  });

  it.each(['--key-env=', '--key-env=lower', '--key-env=1BAD', '--key-env=A-B'])('rejeita %s', (flag) => {
    expect(() => parseKeyEnvName([...ARGV0, flag])).toThrow(ScriptPreconditionError);
  });

  it('aborta sem chave, com chave inválida ou sem --verify', () => {
    expect(() => assertVerifyPreconditions({}, [...ARGV0, '--verify'])).toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
    expect(() =>
      assertVerifyPreconditions({ CREDENTIALS_ENCRYPTION_KEY: Buffer.alloc(8).toString('base64') }, [...ARGV0, '--verify']),
    ).toThrow(/32 bytes/);
    expect(() => assertVerifyPreconditions({ CREDENTIALS_ENCRYPTION_KEY: k() }, ARGV0)).toThrow(/--verify/);
  });

  it('--verify não combina com --apply (verify nunca grava)', () => {
    expect(() =>
      assertVerifyPreconditions({ CREDENTIALS_ENCRYPTION_KEY: k() }, [...ARGV0, '--verify', '--apply']),
    ).toThrow(/mutuamente exclusivos/);
  });

  it('guards de backfill/rotação recusam --verify (evita gravar achando que é só leitura)', () => {
    const o = k();
    const n = k();
    expect(() =>
      assertBackfillPreconditions({ CREDENTIALS_ENCRYPTION_KEY: o }, [...ARGV0, '--verify']),
    ).toThrow(/--verify/);
    expect(() =>
      assertRotationPreconditions(
        { CREDENTIALS_ENCRYPTION_KEY: o, OLD_KEY: o, NEW_KEY: n },
        [...ARGV0, '--verify'],
      ),
    ).toThrow(/--verify/);
  });
});

describe('parseReencryptScope', () => {
  const MODELS = ['BitrixConnection', 'Setting'];
  it('padrão: alvo db, todos os models', () => {
    expect(parseReencryptScope(ARGV0, MODELS)).toEqual({ target: 'db', model: null });
  });
  it('aceita --model conhecido e --target=redis-wa-auth', () => {
    expect(parseReencryptScope([...ARGV0, '--model=Setting'], MODELS)).toEqual({ target: 'db', model: 'Setting' });
    expect(parseReencryptScope([...ARGV0, '--target=redis-wa-auth'], MODELS)).toEqual({
      target: 'redis-wa-auth',
      model: null,
    });
  });
  it('--model= vazio aborta (antes processava TODOS os models)', () => {
    expect(() => parseReencryptScope([...ARGV0, '--model='], MODELS)).toThrow(ScriptPreconditionError);
  });
  it('model ou alvo desconhecido aborta; --model só com alvo db', () => {
    expect(() => parseReencryptScope([...ARGV0, '--model=Nope'], MODELS)).toThrow(/desconhecido/);
    expect(() => parseReencryptScope([...ARGV0, '--target=redis'], MODELS)).toThrow(/desconhecido/);
    expect(() =>
      parseReencryptScope([...ARGV0, '--target=redis-wa-auth', '--model=Setting'], MODELS),
    ).toThrow(/só vale/);
  });
});

describe('requireRedisUrl', () => {
  it('exige REDIS_URL explícita (sem fallback para localhost)', () => {
    expect(() => requireRedisUrl({})).toThrow(/REDIS_URL/);
    expect(() => requireRedisUrl({ REDIS_URL: '  ' })).toThrow(/REDIS_URL/);
    expect(requireRedisUrl({ REDIS_URL: 'redis://example.invalid:6379' })).toBe('redis://example.invalid:6379');
  });
});
