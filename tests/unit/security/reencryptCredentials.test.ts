// @vitest-environment node
/**
 * Agente 15 — reencrypt-credentials.ts (alvo db). PR #107 / parecer do 24:
 * - B1: models com RLS só de tenant (Contact, ...) processados POR ORGANIZAÇÃO, em transação com
 *   `app.current_tenant_id` LOCAL; preflight fail-closed; cobertura por org e global → código 2.
 * - gravação ATÔMICA POR LINHA + compare-and-set; `--verify` em transações READ ONLY.
 * `pg` é mockado com um Postgres FALSO que simula RLS (helpers/fakeRlsDb.ts): nada conecta em
 * banco. O comportamento contra Postgres REAL está em tests/container/reencryptCredentialsRls.test.ts.
 */
import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeDb, type FakeTable, orgRows } from './helpers/fakeRlsDb.js';

const holder = vi.hoisted(() => ({ db: null as null | { query: (s: string, p?: unknown[]) => Promise<unknown> } }));

vi.mock('pg', () => {
  class Pool {
    async connect() {
      if (!holder.db) throw new Error('fake db não configurado');
      const db = holder.db;
      return { query: (sql: string, params?: unknown[]) => db.query(sql, params), release() {} };
    }
    async end() {}
  }
  return { default: { Pool } };
});

import { decryptWithKey } from '../../../scripts/security/credential-envelope.js';
import {
  encryptWithKey,
  main,
  planRowReencrypt,
  reencryptModel,
  reencryptSettings,
  TARGET_MODELS,
  tableTargetFor,
  verifyModel,
  verifySettings,
} from '../../../scripts/security/reencrypt-credentials.js';
import {
  CoverageNotProvableError,
  estimateMatches,
  listOrganizations,
  runPreflight,
  type TableTarget,
} from '../../../scripts/security/rls-coverage.js';

const OLD = randomBytes(32);
const NEW = randomBytes(32);
const OTHER = randomBytes(32);
const b64 = (b: Buffer) => b.toString('base64');
const silent = () => {};
const SETTING_TARGET: TableTarget = { model: 'Setting', table: 'Setting', scope: 'org' };

/** Banco falso com TODAS as tabelas-alvo (vazias), Organization e Setting; `over` sobrescreve. */
function fullDb(over: Record<string, FakeTable>, role?: { rolbypassrls?: boolean }) {
  const tables: Record<string, FakeTable> = {
    Organization: { rows: orgRows('org-a', 'org-b'), bypassPolicy: true },
    Setting: { rows: [], bypassPolicy: false },
  };
  for (const m of Object.keys(TARGET_MODELS)) tables[tableTargetFor(m).table] = { rows: [] };
  Object.assign(tables, over);
  const db = createFakeDb({ tables, role });
  holder.db = db as never;
  return db;
}

async function prep(db: ReturnType<typeof createFakeDb>, targets: TableTarget[], write = true) {
  const pf = await runPreflight(db.query, targets, { write, log: silent });
  const orgs = await listOrganizations(db.query);
  return { pf, orgs, info: (m: string) => pf.tables.get(m)! };
}

afterEach(() => {
  vi.unstubAllEnvs();
  holder.db = null;
});

describe('planRowReencrypt (atômico por linha)', () => {
  it('retomada idempotente: campo já em NEW_KEY conta alreadyNew, não é erro nem é regravado', () => {
    const row = { id: '1', a: encryptWithKey('x', NEW), b: encryptWithKey('y', OLD) };
    const plan = planRowReencrypt(row, ['a', 'b'], OLD, NEW);
    expect(plan.alreadyNew).toBe(1);
    expect(plan.unreadableFields).toEqual([]);
    expect(Object.keys(plan.updates)).toEqual(['b']);
    expect(decryptWithKey(plan.updates.b, NEW)).toBe('y');
  });

  it('valor que não decifra com OLD nem com NEW continua Erro (fail-closed)', () => {
    const plan = planRowReencrypt({ id: '1', a: encryptWithKey('x', randomBytes(32)) }, ['a'], OLD, NEW);
    expect(plan.unreadableFields).toEqual(['a']);
    expect(plan.alreadyNew).toBe(0);
  });

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

describe('B1 — RLS só de tenant: processamento por organização', () => {
  const contacts = () => [
    { id: 'c1', organizationId: 'org-a', email: encryptWithKey('a@x', OLD), phone: null, whatsapp: null },
    { id: 'c2', organizationId: 'org-b', email: encryptWithKey('b@x', OLD), phone: encryptWithKey('1', OLD), whatsapp: null },
  ];

  it('role SEM BYPASSRLS: rotaciona Contact das duas orgs; cada leitura/gravação sob o tenant, sem bypass, GUC local', async () => {
    const db = createFakeDb({
      tables: {
        Organization: { rows: orgRows('org-a', 'org-b'), bypassPolicy: true },
        Contact: { rows: contacts(), bypassPolicy: false },
      },
    });
    const c = tableTargetFor('Contact');
    const { orgs, info } = await prep(db, [c]);
    expect(info('Contact')).toMatchObject({ rlsApplies: true, policyAdmitsBypass: false, globalMode: 'estimate' });
    const r = await reencryptModel(db.query, info('Contact'), ['email', 'phone', 'whatsapp'], { apply: true, oldKey: OLD, newKey: NEW }, { orgs, log: silent });
    expect(r).toMatchObject({ total: 2, rotated: 2, errors: 0, conflicts: 0 });
    expect(r.coverage.divergences).toEqual([]);
    for (const row of db.rows('Contact')) expect(decryptWithKey(String(row.email), NEW)).toMatch(/@x$/);
    const contactSql = db.calls.filter((x) => x.sql.includes('"Contact"') && !x.sql.startsWith('SELECT c.'));
    expect(contactSql.length).toBeGreaterThan(0);
    for (const x of contactSql) {
      expect(x.inTx).toBe(true);
      expect(x.bypass).toBe('off');
      expect(['org-a', 'org-b']).toContain(x.tenant);
    }
    const ups = db.updates();
    expect(ups).toHaveLength(2);
    expect(ups[0].sql).toContain('"organizationId" = $');
    expect(ups[0].sql).toContain('IS NOT DISTINCT FROM');
  });

  it('o caminho antigo (bypass sem tenant) veria 0 linhas neste banco — o fake reproduz a falha', async () => {
    const db = createFakeDb({ tables: { Contact: { rows: contacts(), bypassPolicy: false } } });
    await db.query('BEGIN');
    await db.query(`SELECT set_config('app.bypass_rls', $1, TRUE), set_config('app.current_tenant_id', $2, TRUE)`, ['on', '']);
    const { rows } = await db.query('SELECT count(*)::bigint AS n FROM "Contact"');
    expect(rows[0]).toEqual({ n: '0' });
  });

  it('linha órfã (org fora da lista) → divergência pela estimativa global (reltuples)', async () => {
    const db = createFakeDb({
      tables: {
        Organization: { rows: orgRows('org-a', 'org-b'), bypassPolicy: true },
        Contact: { rows: [...contacts(), { id: 'c3', organizationId: 'org-zumbi', email: encryptWithKey('z', OLD) }], bypassPolicy: false },
      },
    });
    const { orgs, info } = await prep(db, [tableTargetFor('Contact')]);
    const r = await reencryptModel(db.query, info('Contact'), ['email'], { apply: false, oldKey: OLD, newKey: NEW }, { orgs, log: silent });
    expect(r.total).toBe(2);
    expect(r.coverage.divergences.join('\n')).toMatch(/soma por org=2 incompatível com pg_class.reltuples=3/);
  });

  it('policy que admite bypass (BitrixConnection): contagem global EXATA com bypass pega a órfã', async () => {
    const db = createFakeDb({
      tables: {
        Organization: { rows: orgRows('org-a'), bypassPolicy: true },
        BitrixConnection: {
          rows: [
            { id: 'b1', organizationId: 'org-a', webhookUrl: encryptWithKey('u', OLD), webhookSecret: null },
            { id: 'b2', organizationId: 'org-x', webhookUrl: encryptWithKey('u', OLD), webhookSecret: null },
          ],
          bypassPolicy: true,
        },
      },
    });
    const { orgs, info } = await prep(db, [tableTargetFor('BitrixConnection')], false);
    expect(info('BitrixConnection').globalMode).toBe('exact-bypass');
    const c = await verifyModel(db.query, info('BitrixConnection'), ['webhookUrl', 'webhookSecret'], OLD, { orgs, log: silent });
    expect(c.coverage.global).toBe(2);
    expect(c.coverage.divergences.join('\n')).toMatch(/count\(\*\) global=2/);
  });

  it('role COM BYPASSRLS: contagem global exata sem precisar de reltuples', async () => {
    const db = createFakeDb({
      role: { rolbypassrls: true },
      tables: { Organization: { rows: orgRows('org-a', 'org-b') }, Contact: { rows: contacts(), bypassPolicy: false, reltuples: -1 } },
    });
    const { orgs, info } = await prep(db, [tableTargetFor('Contact')]);
    expect(info('Contact')).toMatchObject({ rlsApplies: false, globalMode: 'exact' });
    const c = await verifyModel(db.query, info('Contact'), ['email'], OLD, { orgs, log: silent });
    expect(c).toMatchObject({ readable: 2, unreadable: 0 });
    expect(c.coverage).toMatchObject({ global: 2, divergences: [] });
  });

  it('Account (sem organizationId) é lida numa transação com bypass; tabela é "account" (@@map)', async () => {
    const db = createFakeDb({
      tables: {
        Organization: { rows: orgRows('org-a'), bypassPolicy: true },
        account: { rows: [{ id: 'a1', accessToken: encryptWithKey('t', OLD), refreshToken: null, idToken: null }] },
      },
    });
    const t = tableTargetFor('Account');
    expect(t).toEqual({ model: 'Account', table: 'account', scope: 'bypass' });
    const { orgs, info } = await prep(db, [t]);
    const r = await reencryptModel(db.query, info('Account'), TARGET_MODELS.Account, { apply: true, oldKey: OLD, newKey: NEW }, { orgs, log: silent });
    expect(r).toMatchObject({ total: 1, rotated: 1 });
    expect(db.updates()[0].bypass).toBe('on');
    expect(db.updates()[0].sql).not.toContain('organizationId');
  });
});

describe('preflight fail-closed (código 1: nada lido nem gravado)', () => {
  it('tabela inexistente aborta (antes era "[PULADO]" em silêncio)', async () => {
    const db = createFakeDb({ tables: { Organization: { rows: orgRows('o') } } });
    const lines: string[] = [];
    await expect(runPreflight(db.query, [tableTargetFor('Contact')], { write: false, log: (l) => lines.push(l) })).rejects.toBeInstanceOf(CoverageNotProvableError);
    expect(lines.join('\n')).toContain('current_user=app_owner rolsuper=false rolbypassrls=false');
    expect(lines.join('\n')).toMatch(/Contact: tabela "Contact" não existe/);
    expect(db.calls.some((c) => c.sql.includes('FROM "Contact"'))).toBe(false);
  });

  it('estimativa global impossível (reltuples=-1, nunca analisada) aborta pedindo ANALYZE', async () => {
    const db = createFakeDb({ tables: { Organization: { rows: orgRows('o') }, Contact: { rows: [], bypassPolicy: false, reltuples: -1 } } });
    const lines: string[] = [];
    await expect(runPreflight(db.query, [tableTargetFor('Contact')], { write: false, log: (l) => lines.push(l) })).rejects.toThrow(/cobertura não provável/);
    expect(lines.join('\n')).toContain('ANALYZE "Contact"');
  });

  it('tabela sem organizationId cuja policy não admite bypass aborta', async () => {
    const db = createFakeDb({ tables: { Organization: { rows: orgRows('o') }, account: { rows: [], bypassPolicy: false } } });
    await expect(runPreflight(db.query, [tableTargetFor('Account')], { write: false, log: silent })).rejects.toThrow(CoverageNotProvableError);
  });

  it('apply sem UPDATE aborta; Organization não listável aborta', async () => {
    const db1 = createFakeDb({ tables: { Organization: { rows: orgRows('o') }, Contact: { rows: [], canUpdate: false } } });
    await expect(runPreflight(db1.query, [tableTargetFor('Contact')], { write: true, log: silent })).rejects.toThrow(CoverageNotProvableError);
    const db2 = createFakeDb({ tables: { Organization: { rows: orgRows('o'), bypassPolicy: false }, Contact: { rows: [] } } });
    await expect(runPreflight(db2.query, [tableTargetFor('Contact')], { write: false, log: silent })).rejects.toThrow(CoverageNotProvableError);
  });
});

describe('estimateMatches (estimativa de pg_class.reltuples)', () => {
  it('exata até 30000; tolerância de 2% acima; -1 nunca casa', () => {
    expect(estimateMatches(0, 0)).toBe(true);
    expect(estimateMatches(0, 1)).toBe(false);
    expect(estimateMatches(10, 10)).toBe(true);
    expect(estimateMatches(10, 11)).toBe(false);
    expect(estimateMatches(5, -1)).toBe(false);
    expect(estimateMatches(100_500, 100_000)).toBe(true);
    expect(estimateMatches(103_000, 100_000)).toBe(false);
  });
});

describe('gravação atômica, CAS e Setting', () => {
  it('apply: linha mista NÃO recebe UPDATE; linha boa recebe UM UPDATE com todos os campos', async () => {
    const db = createFakeDb({
      tables: {
        Organization: { rows: orgRows('org-a'), bypassPolicy: true },
        BitrixConnection: {
          rows: [
            { id: 'mixed', organizationId: 'org-a', webhookUrl: encryptWithKey('u2', OLD), webhookSecret: encryptWithKey('s2', OTHER) },
            { id: 'ok', organizationId: 'org-a', webhookUrl: encryptWithKey('u1', OLD), webhookSecret: encryptWithKey('s1', OLD) },
          ],
          bypassPolicy: true,
        },
      },
    });
    const { orgs, info } = await prep(db, [tableTargetFor('BitrixConnection')]);
    const r = await reencryptModel(db.query, info('BitrixConnection'), ['webhookUrl', 'webhookSecret'], { apply: true, oldKey: OLD, newKey: NEW }, { orgs, log: silent });
    expect(r).toMatchObject({ total: 2, rotated: 1, errors: 1, unreadableFields: 1 });
    const ups = db.updates();
    expect(ups).toHaveLength(1);
    expect(ups[0].sql).toContain('"webhookUrl" = $1, "webhookSecret" = $2');
    expect(ups[0].params?.[2]).toBe('ok');
    expect(decryptWithKey(String(db.rows('BitrixConnection')[1].webhookUrl), NEW)).toBe('u1');
  });

  it('CAS: a app grava no meio → conflito, linha não sobrescrita', async () => {
    const tables: Record<string, FakeTable> = {
      Organization: { rows: orgRows('org-a'), bypassPolicy: true },
      OmieConnection: { rows: [{ id: 'o1', organizationId: 'org-a', appKey: encryptWithKey('k', OLD), appSecret: null }] },
    };
    const db = createFakeDb({
      tables,
      beforeUpdate: () => {
        tables.OmieConnection.rows[0].appKey = encryptWithKey('k-novo-da-app', NEW);
      },
    });
    const { orgs, info } = await prep(db, [tableTargetFor('OmieConnection')]);
    const r = await reencryptModel(db.query, info('OmieConnection'), ['appKey', 'appSecret'], { apply: true, oldKey: OLD, newKey: NEW }, { orgs, log: silent });
    expect(r).toMatchObject({ rotated: 0, conflicts: 1 });
    expect(decryptWithKey(String(tables.OmieConnection.rows[0].appKey), NEW)).toBe('k-novo-da-app');
  });

  it('dry-run: transações READ ONLY e nenhum UPDATE', async () => {
    const db = createFakeDb({
      tables: {
        Organization: { rows: orgRows('org-a'), bypassPolicy: true },
        SlackConnection: { rows: [{ id: '1', organizationId: 'org-a', webhookUrl: encryptWithKey('u', OLD), botToken: null }] },
      },
    });
    const { orgs, info } = await prep(db, [tableTargetFor('SlackConnection')], false);
    const r = await reencryptModel(db.query, info('SlackConnection'), ['webhookUrl', 'botToken'], { apply: false, oldKey: OLD, newKey: NEW }, { orgs, log: silent });
    expect(r.rotated).toBe(1);
    expect(db.updates()).toHaveLength(0);
    for (const c of db.calls.filter((x) => x.sql.includes('"SlackConnection"') && !x.sql.startsWith('SELECT c.'))) expect(c.readOnly).toBe(true);
  });

  it('Setting: campo ilegível ou versão enc: desconhecida = Erro (não gravada); boa recebe CAS no value', async () => {
    const db = createFakeDb({
      tables: {
        Organization: { rows: orgRows('org-a'), bypassPolicy: true },
        Setting: {
          bypassPolicy: false,
          rows: [
            { id: 's1', organizationId: 'org-a', key: 'integration.trello', value: { apiKey: encryptWithKey('k', OLD), token: encryptWithKey('t', OTHER) } },
            { id: 's2', organizationId: 'org-a', key: 'integration.trello', value: { apiKey: encryptWithKey('k2', OLD) } },
            { id: 's3', organizationId: 'org-a', key: 'integration.trello', value: { apiKey: 'enc:v2:a:b:c' } },
            { id: 's4', organizationId: 'org-a', key: 'outra.coisa', value: { x: 1 } },
          ],
        },
      },
    });
    const { orgs, info } = await prep(db, [SETTING_TARGET]);
    const r = await reencryptSettings(db.query, info('Setting'), { apply: true, oldKey: OLD, newKey: NEW }, { orgs, log: silent });
    expect(r).toMatchObject({ total: 3, rotated: 1, errors: 2, conflicts: 0 });
    expect(r.coverage.divergences).toEqual([]);
    const ups = db.updates();
    expect(ups.map((u) => u.params?.[1])).toEqual(['s2']);
    expect(ups[0].sql).toContain('value = $4::jsonb');
  });

  it('Setting com organizationId nulo → divergência (soma por org ≠ reltuples)', async () => {
    const db = createFakeDb({
      tables: {
        Organization: { rows: orgRows('org-a'), bypassPolicy: true },
        Setting: { bypassPolicy: false, rows: [{ id: 's1', organizationId: null, key: 'integration.trello', value: {} }] },
      },
    });
    const { orgs, info } = await prep(db, [SETTING_TARGET], false);
    const c = await verifySettings(db.query, info('Setting'), NEW, { orgs, log: silent });
    expect(c.coverage.divergences).toHaveLength(1);
  });
});

describe('verify (somente leitura)', () => {
  it('conta legíveis / ilegíveis / em claro; só transações READ ONLY; nunca grava', async () => {
    const db = createFakeDb({
      tables: {
        Organization: { rows: orgRows('org-a'), bypassPolicy: true },
        Contact: { bypassPolicy: false, rows: [{ id: '1', organizationId: 'org-a', email: encryptWithKey('a@x', NEW), phone: encryptWithKey('1', OLD), whatsapp: 'plain' }] },
        Setting: { bypassPolicy: false, rows: [{ id: 's1', organizationId: 'org-a', key: 'integration.trello', value: { apiKey: encryptWithKey('k', NEW), token: 'plain' } }] },
      },
    });
    const { orgs, info } = await prep(db, [tableTargetFor('Contact'), SETTING_TARGET], false);
    expect(await verifyModel(db.query, info('Contact'), ['email', 'phone', 'whatsapp'], NEW, { orgs, log: silent })).toMatchObject({ readable: 1, unreadable: 1, plaintext: 1 });
    expect(await verifySettings(db.query, info('Setting'), NEW, { orgs, log: silent })).toMatchObject({ readable: 1, unreadable: 0, plaintext: 1 });
    expect(db.updates()).toHaveLength(0);
    expect(db.calls.filter((c) => c.sql.startsWith('BEGIN')).every((c) => c.sql.includes('READ ONLY'))).toBe(true);
  });
});

describe('main — códigos de saída (pg mockado com o banco falso)', () => {
  const rotationEnv = () => {
    vi.stubEnv('DATABASE_URL', 'postgres://fake.invalid/db');
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', b64(OLD));
    vi.stubEnv('OLD_KEY', b64(OLD));
    vi.stubEnv('NEW_KEY', b64(NEW));
  };
  const argv = (...flags: string[]) => ['node', 'reencrypt-credentials.ts', ...flags];
  const omie = (rows: Array<Record<string, unknown>>) => ({ OmieConnection: { rows: rows.map((r) => ({ organizationId: 'org-a', appSecret: null, ...r })) } as FakeTable });

  it('dry-run com Erros > 0 → 2 (e não grava)', async () => {
    rotationEnv();
    const db = fullDb(omie([{ id: '1', appKey: encryptWithKey('k', OTHER) }]));
    const lines: string[] = [];
    expect(await main(argv('--model=OmieConnection'), (l) => lines.push(l))).toBe(2);
    expect(lines.join('\n')).toContain('Concluído COM PROBLEMAS');
    expect(lines.join('\n')).toContain('[PREFLIGHT] current_user=app_owner');
    expect(db.updates()).toHaveLength(0);
  });

  it('apply com Erros > 0 → 2; a linha ilegível não é gravada', async () => {
    rotationEnv();
    const db = fullDb(omie([
      { id: 'bad', appKey: encryptWithKey('k', OTHER), appSecret: encryptWithKey('s', OLD) },
      { id: 'good', appKey: encryptWithKey('k', OLD) },
    ]));
    expect(await main(argv('--model=OmieConnection', '--apply', '--snapshot-confirmed=snap-1'), silent)).toBe(2);
    expect(db.updates().map((u) => u.params?.[1])).toEqual(['good']);
  });

  it('sem erros → 0; rodada completa (todos os models + Setting) também → 0', async () => {
    rotationEnv();
    fullDb(omie([{ id: '1', appKey: encryptWithKey('k', OLD) }]));
    expect(await main(argv('--model=OmieConnection'), silent)).toBe(0);
    fullDb({
      Contact: { bypassPolicy: false, rows: [{ id: 'c1', organizationId: 'org-b', email: encryptWithKey('e', OLD), phone: null, whatsapp: null }] },
      CopilotoTranscriptSegment: { rows: [{ id: 't1', organizationId: 'org-a', text: encryptWithKey('fala', OLD) }] },
    });
    const lines: string[] = [];
    expect(await main(argv('--apply', '--snapshot-confirmed=snap-1'), (l) => lines.push(l))).toBe(0);
    const out = lines.join('\n');
    expect(out).toContain('Processando Model: Contact');
    expect(out).toContain('Processando Model: CopilotoTranscriptSegment');
    expect(out).toContain('Processando Model: Account → "account"');
    expect(out).not.toContain('[PULADO]');
  });

  it('divergência de cobertura (Contact órfã) → 2', async () => {
    rotationEnv();
    fullDb({ Contact: { bypassPolicy: false, rows: [{ id: 'c9', organizationId: 'org-fantasma', email: encryptWithKey('e', OLD) }] } });
    const lines: string[] = [];
    expect(await main(argv('--model=Contact'), (l) => lines.push(l))).toBe(2);
    expect(lines.join('\n')).toContain('[DIVERGÊNCIA]');
  });

  it('preflight (tabela ausente) → lança CoverageNotProvableError (CLI: código 1), sem ler dados', async () => {
    rotationEnv();
    const db = createFakeDb({ tables: { Organization: { rows: orgRows('o') } } });
    holder.db = db as never;
    await expect(main(argv('--model=Contact'), silent)).rejects.toBeInstanceOf(CoverageNotProvableError);
    expect(db.calls.some((c) => c.sql.includes('FROM "Contact"'))).toBe(false);
  });

  it('pré-condição (apply sem snapshot) lança antes de qualquer query', async () => {
    rotationEnv();
    const db = fullDb({});
    await expect(main(argv('--apply'), silent)).rejects.toThrow(/snapshot/i);
    expect(db.calls).toHaveLength(0);
  });

  it('--verify: sem NEW_KEY nem snapshot; 0 se tudo legível, 2 se algum ilegível; só READ ONLY', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://fake.invalid/db');
    vi.stubEnv('VERIFY_KEY', b64(NEW));
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', '');
    const db = fullDb(omie([{ id: '1', appKey: encryptWithKey('k', NEW) }]));
    expect(await main(argv('--verify', '--key-env=VERIFY_KEY', '--model=OmieConnection'), silent)).toBe(0);
    db.rows('OmieConnection').push({ id: '2', organizationId: 'org-b', appKey: encryptWithKey('k', OLD), appSecret: null });
    const lines: string[] = [];
    expect(await main(argv('--verify', '--key-env=VERIFY_KEY', '--model=OmieConnection'), (l) => lines.push(l))).toBe(2);
    expect(lines.join('\n')).toContain('ilegíveis=1');
    expect(db.updates()).toHaveLength(0);
    expect(db.calls.filter((c) => c.sql.startsWith('BEGIN')).every((c) => c.sql.includes('READ ONLY'))).toBe(true);
  });
});
