// @vitest-environment node
/**
 * Agente 15 — reencrypt-credentials.ts (alvo db): gravação ATÔMICA POR LINHA (linha com qualquer
 * campo ilegível não é gravada em nenhum model), `--verify` e códigos de saída. `pg` é mockado:
 * nada aqui conecta em banco.
 */
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  settings: {} as Record<string, Array<{ id: string; key: string; value: unknown }>>,
  calls: [] as Array<{ sql: string; params?: unknown[] }>,
}));

function route(sql: string, params?: unknown[]) {
  db.calls.push({ sql, params });
  if (sql.includes('information_schema.tables')) {
    return { rows: [{ exists: Boolean(db.tables[params?.[0] as string]) }] };
  }
  if (sql.includes('FROM "Organization"')) return { rows: Object.keys(db.settings).map((id) => ({ id })) };
  if (sql.includes('FROM "Setting"')) return { rows: db.settings[params?.[0] as string] ?? [] };
  const m = /^SELECT .* FROM "(\w+)"$/.exec(sql);
  if (m) return { rows: db.tables[m[1]] ?? [] };
  return { rows: [] };
}

vi.mock('pg', () => {
  class Pool {
    async connect() {
      return { query: async (sql: string, params?: unknown[]) => route(sql, params), release() {} };
    }
    async end() {}
  }
  return { default: { Pool } };
});

import {
  encryptWithKey,
  main,
  planRowReencrypt,
  type QueryFn,
  reencryptModel,
  reencryptSettings,
  verifyModel,
  verifySettings,
} from '../../../scripts/security/reencrypt-credentials.js';
import { decryptWithKey } from '../../../scripts/security/credential-envelope.js';

const OLD = randomBytes(32);
const NEW = randomBytes(32);
const OTHER = randomBytes(32);
const b64 = (b: Buffer) => b.toString('base64');
const query: QueryFn = (async (sql: string, params?: unknown[]) => route(sql, params)) as QueryFn;
const updates = () => db.calls.filter((c) => c.sql.startsWith('UPDATE'));

beforeEach(() => {
  db.tables = {};
  db.settings = {};
  db.calls = [];
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('planRowReencrypt (atômico por linha)', () => {
  it('rotaciona todos os campos enc:v1 legíveis e pula os demais', () => {
    const row = { id: '1', a: encryptWithKey('sa', OLD), b: encryptWithKey('sb', OLD), c: null, d: 'plain' };
    const plan = planRowReencrypt(row, ['a', 'b', 'c', 'd'], OLD, NEW);
    expect(plan.unreadableFields).toEqual([]);
    expect(plan.skipped).toBe(2);
    expect(decryptWithKey(plan.updates.a, NEW)).toBe('sa');
    expect(decryptWithKey(plan.updates.b, NEW)).toBe('sb');
  });

  it('linha mista (um campo legível + um ilegível): NADA a gravar', () => {
    const row = { id: '1', a: encryptWithKey('sa', OLD), b: encryptWithKey('sb', OTHER) };
    const plan = planRowReencrypt(row, ['a', 'b'], OLD, NEW);
    expect(plan.unreadableFields).toEqual(['b']);
    expect(plan.updates).toEqual({});
  });

  it('envelope enc: de versão desconhecida conta como ilegível (fail-closed)', () => {
    const plan = planRowReencrypt({ id: '1', a: 'enc:v9:x:y:z' }, ['a'], OLD, NEW);
    expect(plan.unreadableFields).toEqual(['a']);
  });
});

describe('reencryptModel (QueryFn fake)', () => {
  it('apply: linha mista NÃO recebe UPDATE; linha boa recebe UM UPDATE com todos os campos', async () => {
    db.tables.BitrixConnection = [
      { id: 'ok', webhookUrl: encryptWithKey('u1', OLD), webhookSecret: encryptWithKey('s1', OLD) },
      { id: 'mixed', webhookUrl: encryptWithKey('u2', OLD), webhookSecret: encryptWithKey('s2', OTHER) },
    ];
    const r = await reencryptModel(query, 'BitrixConnection', ['webhookUrl', 'webhookSecret'], {
      apply: true,
      oldKey: OLD,
      newKey: NEW,
    });
    expect(r).toMatchObject({ total: 2, rotated: 1, errors: 1, unreadableFields: 1 });
    const ups = updates();
    expect(ups).toHaveLength(1);
    expect(ups[0].params?.[0]).toBe('ok');
    expect(ups[0].sql).toContain('"webhookUrl" = $2');
    expect(ups[0].sql).toContain('"webhookSecret" = $3');
    expect(decryptWithKey(ups[0].params?.[1] as string, NEW)).toBe('u1');
  });

  it('dry-run: conta, nunca grava', async () => {
    db.tables.SlackConnection = [{ id: '1', webhookUrl: encryptWithKey('u', OLD), botToken: null }];
    const r = await reencryptModel(query, 'SlackConnection', ['webhookUrl', 'botToken'], {
      apply: false,
      oldKey: OLD,
      newKey: NEW,
    });
    expect(r.rotated).toBe(1);
    expect(updates()).toHaveLength(0);
  });
});

describe('reencryptSettings', () => {
  it('linha de Setting com um campo ilegível não é gravada; conta como Erro', async () => {
    db.settings['org-a'] = [
      { id: 's1', key: 'integration.trello', value: { apiKey: encryptWithKey('k', OLD), token: encryptWithKey('t', OTHER) } },
      { id: 's2', key: 'integration.trello', value: { apiKey: encryptWithKey('k2', OLD) } },
    ];
    const r = await reencryptSettings(query, { apply: true, oldKey: OLD, newKey: NEW });
    expect(r).toEqual({ total: 2, rotated: 1, errors: 1 });
    expect(updates().map((u) => u.params?.[1])).toEqual(['s2']);
  });
});

describe('verify (somente leitura)', () => {
  it('conta legíveis / ilegíveis / em claro por model e nunca grava', async () => {
    db.tables.Contact = [
      { id: '1', email: encryptWithKey('a@x', NEW), phone: encryptWithKey('1', OLD), whatsapp: 'plain' },
    ];
    expect(await verifyModel(query, 'Contact', ['email', 'phone', 'whatsapp'], NEW)).toEqual({
      readable: 1,
      unreadable: 1,
      plaintext: 1,
    });
    db.settings['org-a'] = [{ id: 's1', key: 'integration.trello', value: { apiKey: encryptWithKey('k', NEW), token: 'plain' } }];
    expect(await verifySettings(query, NEW)).toEqual({ readable: 1, unreadable: 0, plaintext: 1 });
    expect(updates()).toHaveLength(0);
  });
});

describe('main — códigos de saída (pg mockado)', () => {
  const rotationEnv = () => {
    vi.stubEnv('DATABASE_URL', 'postgres://fake.invalid/db');
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', b64(OLD));
    vi.stubEnv('OLD_KEY', b64(OLD));
    vi.stubEnv('NEW_KEY', b64(NEW));
  };
  const argv = (...flags: string[]) => ['node', 'reencrypt-credentials.ts', ...flags];
  const silent = () => {};

  it('dry-run com Erros > 0 → 2 (e não grava)', async () => {
    rotationEnv();
    db.tables.OmieConnection = [{ id: '1', appKey: encryptWithKey('k', OTHER), appSecret: null }];
    const lines: string[] = [];
    expect(await main(argv('--model=OmieConnection'), (l) => lines.push(l))).toBe(2);
    expect(lines.join('\n')).toContain('Concluído COM PROBLEMAS');
    expect(updates()).toHaveLength(0);
  });

  it('apply com Erros > 0 → 2; a linha ilegível não é gravada', async () => {
    rotationEnv();
    db.tables.OmieConnection = [
      { id: 'bad', appKey: encryptWithKey('k', OTHER), appSecret: encryptWithKey('s', OLD) },
      { id: 'good', appKey: encryptWithKey('k', OLD), appSecret: null },
    ];
    expect(await main(argv('--model=OmieConnection', '--apply', '--snapshot-confirmed=snap-1'), silent)).toBe(2);
    expect(updates().map((u) => u.params?.[0])).toEqual(['good']);
  });

  it('sem erros → 0', async () => {
    rotationEnv();
    db.tables.OmieConnection = [{ id: '1', appKey: encryptWithKey('k', OLD), appSecret: null }];
    expect(await main(argv('--model=OmieConnection'), silent)).toBe(0);
  });

  it('pré-condição (apply sem snapshot) lança antes de qualquer query', async () => {
    rotationEnv();
    await expect(main(argv('--apply'), silent)).rejects.toThrow(/snapshot/i);
    expect(db.calls).toHaveLength(0);
  });

  it('--verify: sem NEW_KEY nem snapshot; 0 se tudo legível, 2 se algum ilegível', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://fake.invalid/db');
    vi.stubEnv('VERIFY_KEY', b64(NEW));
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', '');
    db.tables.OmieConnection = [{ id: '1', appKey: encryptWithKey('k', NEW), appSecret: null }];
    expect(await main(argv('--verify', '--key-env=VERIFY_KEY', '--model=OmieConnection'), silent)).toBe(0);
    db.tables.OmieConnection.push({ id: '2', appKey: encryptWithKey('k', OLD), appSecret: null });
    const lines: string[] = [];
    expect(await main(argv('--verify', '--key-env=VERIFY_KEY', '--model=OmieConnection'), (l) => lines.push(l))).toBe(2);
    expect(lines.join('\n')).toContain('ilegíveis=1');
    expect(updates()).toHaveLength(0);
  });
});
