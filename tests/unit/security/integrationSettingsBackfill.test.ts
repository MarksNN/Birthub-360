// @vitest-environment node
/**
 * Agente 15 — backfill (texto puro → enc:v1 por campo) e rotação (OLD_KEY → NEW_KEY) de segredos
 * de integração em Setting.value. Só lógica pura + QueryFn fake: nada aqui toca banco.
 */
import { randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  LEGACY_BITRIX_KEY,
  planSettingBackfill,
  type QueryFn,
  runIntegrationSettingsBackfill,
  runIntegrationSettingsVerify,
  SECRET_FIELDS_BY_SETTING_KEY,
  TARGET_SETTING_KEYS,
} from '../../../scripts/security/backfill-integration-settings-encryption.js';
import {
  decryptWithKey,
  encryptWithKey,
  reencryptIntegrationSettingValue,
} from '../../../scripts/security/reencrypt-credentials.js';
import { decryptField } from '../../../src/lib/crypto/secretFields.js';
import { createFakeDb, orgRows } from './helpers/fakeRlsDb.js';

const TRELLO_KEY = 'trello-api-key-plain-0001';
const TRELLO_TOKEN = 'trello-oauth-token-plain-0002';

describe('alvos derivados do catálogo', () => {
  it('cobre os campos secret do contrato e a chave legada do bitrix', () => {
    expect(SECRET_FIELDS_BY_SETTING_KEY.get('integration.trello')).toEqual(['apiKey', 'token']);
    expect(SECRET_FIELDS_BY_SETTING_KEY.get('integration.omie')).toContain('appKey');
    expect(SECRET_FIELDS_BY_SETTING_KEY.get('integration.teams')).toEqual(['webhookUrl']);
    expect(SECRET_FIELDS_BY_SETTING_KEY.get('integration.push_gateway')).toBeDefined();
    expect(TARGET_SETTING_KEYS).toContain(LEGACY_BITRIX_KEY);
    expect(TARGET_SETTING_KEYS).toContain('integration.whatsapp');
    expect(TARGET_SETTING_KEYS).toContain('integration.hubspot');
    expect(TARGET_SETTING_KEYS).toContain('integration.rdstation');
    expect(TARGET_SETTING_KEYS).toContain('integration.sms');
  });
});

describe('planSettingBackfill', () => {
  it('cifra só os campos secret em texto puro; campos públicos intocados', () => {
    const plan = planSettingBackfill({
      key: 'integration.trello',
      value: { apiKey: TRELLO_KEY, token: TRELLO_TOKEN, defaultListId: 'list-1' },
    });
    expect(plan.encryptedFields).toEqual(['apiKey', 'token']);
    const next = plan.nextValue as Record<string, string>;
    expect(next.defaultListId).toBe('list-1');
    expect(next.apiKey.startsWith('enc:v1:')).toBe(true);
    expect(decryptField(next.apiKey)).toBe(TRELLO_KEY);
    expect(decryptField(next.token)).toBe(TRELLO_TOKEN);
    expect(JSON.stringify(next)).not.toContain(TRELLO_KEY);
  });

  it('pula campo já cifrado e é idempotente (segunda passada = nada a fazer)', () => {
    const first = planSettingBackfill({
      key: 'integration.trello',
      value: { apiKey: TRELLO_KEY, token: TRELLO_TOKEN },
    });
    const second = planSettingBackfill({ key: 'integration.trello', value: first.nextValue });
    expect(second).toEqual({ nextValue: null, encryptedFields: [], unknownFields: [], unreadableFields: [] });

    const partial = planSettingBackfill({
      key: 'integration.trello',
      value: { apiKey: (first.nextValue as Record<string, string>).apiKey, token: TRELLO_TOKEN },
    });
    expect(partial.encryptedFields).toEqual(['token']);
  });

  it('legado bitrix_webhook_url (string) é cifrado inteiro; já cifrado é pulado', () => {
    const plan = planSettingBackfill({
      key: LEGACY_BITRIX_KEY,
      value: 'https://acme.bitrix24.com.br/rest/1/secret/',
    });
    expect(plan.encryptedFields).toEqual(['<value>']);
    expect(decryptField(plan.nextValue as string)).toBe('https://acme.bitrix24.com.br/rest/1/secret/');
    expect(planSettingBackfill({ key: LEGACY_BITRIX_KEY, value: plan.nextValue }).nextValue).toBeNull();
  });

  it('chave fora do alvo, valor vazio ou não-objeto: nada a fazer', () => {
    expect(planSettingBackfill({ key: 'outra.coisa', value: { apiKey: 'x' } }).nextValue).toBeNull();
    expect(planSettingBackfill({ key: 'integration.trello', value: null }).nextValue).toBeNull();
    expect(planSettingBackfill({ key: 'integration.trello', value: ['a'] }).nextValue).toBeNull();
    expect(
      planSettingBackfill({ key: 'integration.trello', value: { apiKey: '', token: '' } }).nextValue,
    ).toBeNull();
  });
});

describe('planSettingBackfill — chaves fora do catálogo (legadas)', () => {
  it('reporta accountSid/email legados sem descartá-los nem cifrá-los', () => {
    const plan = planSettingBackfill({
      key: 'integration.sms',
      value: { apiKey: 'sms-plain-key-0001', accountSid: 'AC-legacy-1', email: 'ops@acme.test' },
    });
    expect(plan.unknownFields).toEqual(['accountSid', 'email']);
    expect(plan.encryptedFields).toEqual(['apiKey']);
    const next = plan.nextValue as Record<string, string>;
    expect(next.accountSid).toBe('AC-legacy-1');
    expect(next.email).toBe('ops@acme.test');
  });

  it('reporta mesmo quando não há nada a cifrar (nextValue null)', () => {
    const plan = planSettingBackfill({
      key: 'integration.microsoft365',
      value: { accessToken: 'enc:v1:a:b:c', email: 'legacy@acme.test' },
    });
    expect(plan.nextValue).toBeNull();
    expect(plan.unknownFields).toEqual(['email']);
  });
});

/** Postgres falso com RLS (helpers/fakeRlsDb.ts): Setting só de tenant, Organization com bypass. */
function fakeDb(
  rowsByOrg: Record<string, Array<{ id: string; key: string; value: unknown }>>,
  extra: Array<{ id: string; organizationId: string | null; key: string; value: unknown }> = [],
) {
  const rows = [
    ...Object.entries(rowsByOrg).flatMap(([org, rs]) => rs.map((r) => ({ ...r, organizationId: org }))),
    ...extra,
  ];
  const db = createFakeDb({
    tables: {
      Organization: { rows: orgRows(...Object.keys(rowsByOrg)), bypassPolicy: true },
      Setting: { rows, bypassPolicy: false },
    },
  });
  return { query: db.query as QueryFn, calls: db.calls, db };
}

describe('runIntegrationSettingsBackfill (QueryFn fake, sem banco)', () => {
  const data = () => ({
    'org-a': [
      { id: 's1', key: 'integration.trello', value: { apiKey: TRELLO_KEY, token: TRELLO_TOKEN } },
      { id: 's2', key: 'integration.sms', value: { apiKey: 'enc:v1:a:b:c' } },
    ],
    'org-b': [{ id: 's3', key: LEGACY_BITRIX_KEY, value: 'https://b.bitrix24.com/rest/9/x/' }],
  });

  it('dry-run (padrão): conta, loga sem valores e NÃO emite UPDATE', async () => {
    const { query, calls } = fakeDb(data());
    const log = vi.fn();
    const res = await runIntegrationSettingsBackfill(query, { apply: false, log });
    expect(res).toEqual({
      organizations: 2,
      scanned: 3,
      toEncrypt: 2,
      written: 0,
      rowsWithUnknownFields: 0,
      unreadableRows: 0,
      conflicts: 0,
      divergences: 0,
    });
    expect(calls.some((c) => c.sql.startsWith('UPDATE'))).toBe(false);
    const logged = log.mock.calls.flat().join('\n');
    expect(logged).toContain('[DRY-RUN]');
    expect(logged).not.toContain(TRELLO_KEY);
    expect(logged).not.toContain('bitrix24.com/rest');
  });

  it('dry-run loga as chaves fora do catálogo (sem valor) e as conta', async () => {
    const { query, calls } = fakeDb({
      'org-a': [
        {
          id: 's9',
          key: 'integration.sms',
          value: { apiKey: 'enc:v1:a:b:c', accountSid: 'AC-SECRET-LEGACY' },
        },
      ],
    });
    const log = vi.fn();
    const res = await runIntegrationSettingsBackfill(query, { apply: false, log });
    expect(res.rowsWithUnknownFields).toBe(1);
    expect(res.toEncrypt).toBe(0);
    const logged = log.mock.calls.flat().join('\n');
    expect(logged).toContain('fora_do_catalogo=accountSid');
    expect(logged).not.toContain('AC-SECRET-LEGACY');
    expect(calls.some((c) => c.sql.startsWith('UPDATE'))).toBe(false);
  });

  it('apply sem snapshotId aborta antes de qualquer query', async () => {
    const { query, calls } = fakeDb(data());
    await expect(
      runIntegrationSettingsBackfill(query, { apply: true, log: () => {} }),
    ).rejects.toThrow(/snapshot/i);
    expect(calls).toHaveLength(0);
  });

  it('apply: UPDATE (CAS no value) por linha alvo, em transação com o tenant LOCAL e sem bypass', async () => {
    const { query, calls, db } = fakeDb(data());
    const res = await runIntegrationSettingsBackfill(query, { apply: true, snapshotId: 'snap-test', log: () => {} });
    expect(res).toMatchObject({ written: 2, conflicts: 0, divergences: 0 });
    const updates = calls.filter((c) => c.sql.includes('UPDATE "Setting"'));
    expect(updates.map((u) => u.params?.[1])).toEqual(['s1', 's3']);
    for (const u of updates) {
      expect(String(u.params?.[0])).not.toContain(TRELLO_KEY);
      expect(u.sql).toContain('value = $4::jsonb');
      expect(u).toMatchObject({ inTx: true, bypass: 'off', tenant: u.params?.[2] });
    }
    for (const c of calls.filter((x) => x.sql.includes('FROM "Setting"'))) {
      expect(c).toMatchObject({ inTx: true, bypass: 'off' });
      expect(['org-a', 'org-b']).toContain(c.tenant);
    }
    expect(calls.some((c) => /set_config\([^)]*false\)/i.test(c.sql))).toBe(false);
    expect(db.rows('Setting').find((r) => r.id === 's1')?.value).not.toEqual(data()['org-a'][0].value);
  });

  it('dry-run só abre transações READ ONLY', async () => {
    const { query, calls } = fakeDb(data());
    await runIntegrationSettingsBackfill(query, { apply: false, log: () => {} });
    const begins = calls.filter((c) => c.sql.startsWith('BEGIN'));
    expect(begins.length).toBeGreaterThan(0);
    for (const b of begins) expect(b.sql).toContain('READ ONLY');
  });

  it('Setting com organizationId nulo (fora de qualquer tenant) → divergência, não some em silêncio', async () => {
    const { query } = fakeDb(data(), [
      { id: 's0', organizationId: null, key: 'integration.trello', value: { apiKey: 'x' } },
    ]);
    const log = vi.fn();
    const res = await runIntegrationSettingsBackfill(query, { apply: false, log });
    expect(res.divergences).toBe(1);
    expect(log.mock.calls.flat().join('\n')).toContain('[DIVERGÊNCIA]');
  });

  it('preflight: sem a tabela Setting aborta antes de ler dados', async () => {
    const db = createFakeDb({ tables: { Organization: { rows: orgRows('o') } } });
    await expect(runIntegrationSettingsBackfill(db.query, { apply: false, log: () => {} })).rejects.toThrow(
      /cobertura não provável/,
    );
  });

  it('apply é idempotente: rodar sobre o resultado não grava nada', async () => {
    const { query, calls } = fakeDb(data());
    await runIntegrationSettingsBackfill(query, { apply: true, snapshotId: 'snap-test', log: () => {} });
    const before = calls.filter((c) => c.sql.startsWith('UPDATE')).length;
    const res = await runIntegrationSettingsBackfill(query, { apply: true, snapshotId: 'snap-test', log: () => {} });
    expect(res.written).toBe(0);
    expect(calls.filter((c) => c.sql.startsWith('UPDATE')).length).toBe(before);
  });
});

describe('reencryptIntegrationSettingValue (rotação de chave)', () => {
  const OLD = randomBytes(32);
  const NEW = randomBytes(32);

  it('re-cifra só campos enc:v1 secret com a nova chave; texto puro e públicos intocados', () => {
    const value = {
      apiKey: encryptWithKey(TRELLO_KEY, OLD),
      token: TRELLO_TOKEN,
      defaultListId: 'list-1',
    };
    const out = reencryptIntegrationSettingValue('integration.trello', value, OLD, NEW);
    expect(out?.fields).toEqual(['apiKey']);
    const next = out?.nextValue as Record<string, string>;
    expect(decryptWithKey(next.apiKey, NEW)).toBe(TRELLO_KEY);
    expect(() => decryptWithKey(next.apiKey, OLD)).toThrow();
    expect(next.token).toBe(TRELLO_TOKEN);
    expect(next.defaultListId).toBe('list-1');
  });

  it('legado bitrix cifrado é rotacionado; nada cifrado → null', () => {
    const out = reencryptIntegrationSettingValue(
      LEGACY_BITRIX_KEY,
      encryptWithKey('https://x.bitrix24.com/rest/1/y/', OLD),
      OLD,
      NEW,
    );
    expect(decryptWithKey(out?.nextValue as string, NEW)).toBe('https://x.bitrix24.com/rest/1/y/');
    expect(reencryptIntegrationSettingValue('integration.trello', { token: 'p' }, OLD, NEW)).toBeNull();
    expect(reencryptIntegrationSettingValue('outra.coisa', { apiKey: 'enc:v1:a:b:c' }, OLD, NEW)).toBeNull();
  });

  it('retomada idempotente: campo já em NEW_KEY não é regravado nem lança (só o OLD rotaciona)', () => {
    const value = { apiKey: encryptWithKey(TRELLO_KEY, NEW), token: encryptWithKey('t', OLD) };
    const out = reencryptIntegrationSettingValue('integration.trello', value, OLD, NEW);
    expect(out?.fields).toEqual(['token']);
    expect((out?.nextValue as Record<string, string>).apiKey).toBe(value.apiKey);
    expect(
      reencryptIntegrationSettingValue('integration.trello', { apiKey: value.apiKey }, OLD, NEW),
    ).toBeNull();
  });

  it('fail-closed: campo que não decifra com OLD_KEY nem com NEW_KEY lança', () => {
    const wrong = encryptWithKey(TRELLO_KEY, randomBytes(32));
    expect(() =>
      reencryptIntegrationSettingValue('integration.trello', { apiKey: wrong }, OLD, NEW),
    ).toThrow();
  });
});

describe('backfill — legibilidade (readKey) e --verify', () => {
  const KEY = randomBytes(32);
  const WRONG = randomBytes(32);
  const enc = (p: string) => encryptWithKey(p, KEY);

  it('planSettingBackfill com readKey: linha com campo enc: ilegível não é gravada (nem o campo em claro)', () => {
    const plan = planSettingBackfill(
      { key: 'integration.trello', value: { apiKey: encryptWithKey('x', WRONG), token: TRELLO_TOKEN } },
      enc,
      KEY,
    );
    expect(plan.unreadableFields).toEqual(['apiKey']);
    expect(plan.nextValue).toBeNull();
    expect(plan.encryptedFields).toEqual([]);
  });

  it('runIntegrationSettingsBackfill: conta ilegiveis= e não grava a linha', async () => {
    const { query, calls } = fakeDb({
      'org-a': [
        { id: 'bad', key: 'integration.trello', value: { apiKey: encryptWithKey('x', WRONG), token: TRELLO_TOKEN } },
        { id: 'good', key: 'integration.trello', value: { apiKey: enc('k'), token: TRELLO_TOKEN } },
        { id: 'leg', key: LEGACY_BITRIX_KEY, value: encryptWithKey('https://x.bitrix24.com/rest/1/y/', WRONG) },
      ],
    });
    const log = vi.fn();
    const res = await runIntegrationSettingsBackfill(query, {
      apply: true,
      snapshotId: 'snap-test',
      log,
      encrypt: enc,
      readKey: KEY,
    });
    expect(res.unreadableRows).toBe(2);
    expect(res.written).toBe(1);
    expect(calls.filter((c) => c.sql.startsWith('UPDATE')).map((c) => c.params?.[1])).toEqual(['good']);
    const logged = log.mock.calls.flat().join('\n');
    expect(logged).toContain('ilegiveis=2');
    expect(logged).not.toContain(TRELLO_TOKEN);
  });

  it('runIntegrationSettingsVerify: legíveis / ilegíveis / em claro; nunca grava', async () => {
    const { query, calls } = fakeDb({
      'org-a': [
        { id: 's1', key: 'integration.trello', value: { apiKey: enc('k'), token: TRELLO_TOKEN } },
        { id: 's2', key: LEGACY_BITRIX_KEY, value: encryptWithKey('u', WRONG) },
      ],
    });
    const log = vi.fn();
    const c = await runIntegrationSettingsVerify(query, KEY, log);
    expect(c).toMatchObject({ readable: 1, unreadable: 1, plaintext: 1, scanned: 2, organizations: 1, divergences: 0 });
    expect(calls.some((x) => x.sql.startsWith('UPDATE'))).toBe(false);
    for (const b of calls.filter((x) => x.sql.startsWith('BEGIN'))) expect(b.sql).toContain('READ ONLY');
    expect(log.mock.calls.flat().join('\n')).not.toContain(TRELLO_TOKEN);
  });
});

describe('reencryptIntegrationSettingValue — versão de envelope desconhecida (P3)', () => {
  it('enc:v2 (ou outra) em campo secret lança — nunca passa adiante sem rotacionar', () => {
    const OLD = randomBytes(32);
    expect(() =>
      reencryptIntegrationSettingValue('integration.trello', { apiKey: 'enc:v2:a:b:c' }, OLD, randomBytes(32)),
    ).toThrow(/vers/i);
  });
});
