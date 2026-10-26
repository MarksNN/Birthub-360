// @vitest-environment node
/**
 * Agente 15 — rotação das sessões WhatsApp/Baileys no Redis (`wa-auth:<org>:*`), alvo
 * `--target=redis-wa-auth`. Redis é um mock manual (ioredis-mock não está nas deps): SCAN com
 * cursor, GET, PTTL e EVAL do compare-and-set. Nada aqui conecta em Redis.
 */
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptWithKey, encryptWithKey } from '../../../scripts/security/credential-envelope.js';
import {
  CAS_SET_PRESERVE_TTL_LUA,
  isWrongTypeError,
  type RedisLike,
  reencryptRedisWaAuth,
  scanAllKeys,
  verifyRedisWaAuth,
} from '../../../scripts/security/reencrypt-credentials.js';

class FakeRedis implements RedisLike {
  store = new Map<string, { value: string | string[]; expireAt: number | null }>();
  commands: string[] = [];
  /** Hook para simular a app gravando entre o GET e o EVAL. */
  beforeEval?: (key: string) => void;

  setStr(key: string, value: string, ttlMs?: number) {
    this.store.set(key, { value, expireAt: ttlMs ? Date.now() + ttlMs : null });
  }
  async scan(cursor: string, ...args: (string | number)[]): Promise<[string, string[]]> {
    this.commands.push('SCAN');
    const match = String(args[args.indexOf('MATCH') + 1]);
    const re = new RegExp(`^${match.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    const keys = [...this.store.keys()].sort();
    const start = Number(cursor);
    const page = keys.slice(start, start + 2); // páginas pequenas para exercitar o cursor
    const next = start + 2 >= keys.length ? '0' : String(start + 2);
    // SCAN pode repetir chaves: devolve a primeira de novo na página seguinte
    const dup = start > 0 ? [keys[start - 1]] : [];
    return [next, [...dup, ...page].filter((k) => re.test(k))];
  }
  async get(key: string): Promise<string | null> {
    this.commands.push('GET');
    const e = this.store.get(key);
    if (!e) return null;
    if (Array.isArray(e.value)) throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return e.value;
  }
  async eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown> {
    this.commands.push('EVAL');
    expect(script).toBe(CAS_SET_PRESERVE_TTL_LUA);
    expect(numKeys).toBe(1);
    const [key, expected, next] = args.map(String);
    this.beforeEval?.(key);
    const e = this.store.get(key);
    if (!e || e.value !== expected) return 0;
    const ttl = e.expireAt ? e.expireAt - Date.now() : -1;
    this.store.set(key, { value: next, expireAt: ttl > 0 ? Date.now() + ttl : null });
    return 1;
  }
}

const OLD = randomBytes(32);
const NEW = randomBytes(32);
const OTHER = randomBytes(32);
const SECRET = '{"noiseKey":{"private":"SUPER-SECRET-NOISE"}}';
let redis: FakeRedis;

beforeEach(() => {
  redis = new FakeRedis();
  redis.setStr('wa-auth:org-a:creds', encryptWithKey(SECRET, OLD), 60_000);
  redis.setStr('wa-auth:org-a:pre-key-1', encryptWithKey('pk1', OLD));
  redis.setStr('wa-auth:org-b:creds', encryptWithKey('creds-b', OLD));
  redis.setStr('wa-auth:org-b:legacy', '{"plain":"json"}');
  redis.setStr('other:key', encryptWithKey('x', OLD));
});
afterEach(() => vi.restoreAllMocks());

describe('scanAllKeys', () => {
  it('usa SCAN (nunca KEYS), segue o cursor, filtra e deduplica', async () => {
    const keys = await scanAllKeys(redis, 'wa-auth:*', 2);
    expect(keys).toEqual(['wa-auth:org-a:creds', 'wa-auth:org-a:pre-key-1', 'wa-auth:org-b:creds', 'wa-auth:org-b:legacy']);
    expect(redis.commands.filter((c) => c === 'SCAN').length).toBeGreaterThan(1);
    expect(redis.commands).not.toContain('KEYS');
  });
});

describe('reencryptRedisWaAuth', () => {
  it('dry-run (padrão): conta e NÃO grava', async () => {
    const before = JSON.stringify([...redis.store]);
    const r = await reencryptRedisWaAuth(redis, { apply: false, oldKey: OLD, newKey: NEW });
    expect(r).toMatchObject({ scanned: 4, rotated: 3, plaintext: 1, errors: 0, conflicts: 0 });
    expect(redis.commands).not.toContain('EVAL');
    expect(JSON.stringify([...redis.store])).toBe(before);
  });

  it('apply: rotaciona OLD→NEW, preserva o TTL, não toca legado em claro nem chaves fora do prefixo', async () => {
    const ttlBefore = redis.store.get('wa-auth:org-a:creds')?.expireAt as number;
    const r = await reencryptRedisWaAuth(redis, { apply: true, oldKey: OLD, newKey: NEW });
    expect(r).toMatchObject({ rotated: 3, errors: 0, conflicts: 0 });
    expect(decryptWithKey(redis.store.get('wa-auth:org-a:creds')?.value as string, NEW)).toBe(SECRET);
    const ttlAfter = redis.store.get('wa-auth:org-a:creds')?.expireAt as number;
    expect(ttlAfter).toBeGreaterThan(Date.now());
    expect(Math.abs(ttlAfter - ttlBefore)).toBeLessThan(1000);
    expect(redis.store.get('wa-auth:org-a:pre-key-1')?.expireAt).toBeNull();
    expect(redis.store.get('wa-auth:org-b:legacy')?.value).toBe('{"plain":"json"}');
    expect(decryptWithKey(redis.store.get('other:key')?.value as string, OLD)).toBe('x');
  });

  it('é idempotente: segunda passada vê tudo "Já em NEW_KEY" (não é erro) e não grava', async () => {
    await reencryptRedisWaAuth(redis, { apply: true, oldKey: OLD, newKey: NEW });
    redis.commands = [];
    const r = await reencryptRedisWaAuth(redis, { apply: true, oldKey: OLD, newKey: NEW });
    expect(r.rotated).toBe(0);
    expect(r.alreadyNew).toBe(3);
    expect(r.errors).toBe(0);
    expect(redis.commands).not.toContain('EVAL');
  });

  it('valor ilegível ou WRONGTYPE: conta erro, não grava, loga só o NOME da chave', async () => {
    redis.setStr('wa-auth:org-c:creds', encryptWithKey('c', OTHER));
    redis.store.set('wa-auth:org-c:list', { value: ['a'], expireAt: null });
    const r = await reencryptRedisWaAuth(redis, { apply: true, oldKey: OLD, newKey: NEW });
    expect(r.errors).toBe(2);
    expect(r.problemKeys).toEqual(['wa-auth:org-c:creds', 'wa-auth:org-c:list']);
    expect(decryptWithKey(redis.store.get('wa-auth:org-c:creds')?.value as string, OTHER)).toBe('c');
    expect(JSON.stringify(r)).not.toContain('enc:');
    expect(JSON.stringify(r)).not.toContain('SUPER-SECRET');
  });

  it('conflito (app gravou entre GET e EVAL): não sobrescreve, conta conflito', async () => {
    const appValue = encryptWithKey('fresh-from-app', OLD);
    redis.beforeEval = (key) => {
      if (key === 'wa-auth:org-a:creds') redis.setStr(key, appValue, 60_000);
    };
    const r = await reencryptRedisWaAuth(redis, { apply: true, oldKey: OLD, newKey: NEW });
    expect(r.conflicts).toBe(1);
    expect(r.problemKeys).toEqual(['wa-auth:org-a:creds']);
    expect(redis.store.get('wa-auth:org-a:creds')?.value).toBe(appValue);
  });

  it('chave que expirou entre SCAN e GET conta como sumida', async () => {
    const realGet = redis.get.bind(redis);
    vi.spyOn(redis, 'get').mockImplementation(async (k) => (k === 'wa-auth:org-b:creds' ? null : realGet(k)));
    const r = await reencryptRedisWaAuth(redis, { apply: false, oldKey: OLD, newKey: NEW });
    expect(r.missing).toBe(1);
  });
});

describe('verifyRedisWaAuth', () => {
  it('conta legíveis / ilegíveis / em claro sob a chave dada', async () => {
    expect(await verifyRedisWaAuth(redis, OLD)).toEqual({ readable: 3, unreadable: 0, plaintext: 1, scanned: 4 });
    await reencryptRedisWaAuth(redis, { apply: true, oldKey: OLD, newKey: NEW });
    expect(await verifyRedisWaAuth(redis, NEW)).toMatchObject({ readable: 3, unreadable: 0 });
    expect(await verifyRedisWaAuth(redis, OLD)).toMatchObject({ readable: 0, unreadable: 3 });
  });
});

describe('erro de conexão no GET (P3 do parecer do 24 no #107)', () => {
  const connErr = () => Object.assign(new Error('Connection is closed.'), { name: 'Error' });

  it('rotação: erro que NÃO é WRONGTYPE relança (CLI: código 1), nunca vira "Erros" e segue', async () => {
    vi.spyOn(redis, 'get').mockRejectedValue(connErr());
    await expect(reencryptRedisWaAuth(redis, { apply: true, oldKey: OLD, newKey: NEW })).rejects.toThrow(
      /Connection is closed/,
    );
    expect(redis.commands).not.toContain('EVAL');
  });

  it('verify: erro de conexão relança — nunca "VERIFY OK"', async () => {
    vi.spyOn(redis, 'get').mockRejectedValue(new Error('ETIMEDOUT'));
    await expect(verifyRedisWaAuth(redis, OLD)).rejects.toThrow(/ETIMEDOUT/);
  });

  it('isWrongTypeError só aceita WRONGTYPE', () => {
    expect(isWrongTypeError(new Error('WRONGTYPE Operation against a key'))).toBe(true);
    expect(isWrongTypeError(new Error('Connection is closed.'))).toBe(false);
    expect(isWrongTypeError('WRONGTYPE')).toBe(false);
  });
});
