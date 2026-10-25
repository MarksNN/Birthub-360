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
  SECRET_FIELDS_BY_SETTING_KEY,
  TARGET_SETTING_KEYS,
} from '../../../scripts/security/backfill-integration-settings-encryption.js';
import {
  decryptWithKey,
  encryptWithKey,
  reencryptIntegrationSettingValue,
} from '../../../scripts/security/reencrypt-credentials.js';
import { decryptField } from '../../../src/lib/crypto/secretFields.js';

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
    expect(second).toEqual({ nextValue: null, encryptedFields: [], unknownFields: [] });

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

function fakeDb(rowsByOrg: Record<string, Array<{ id: string; key: string; value: unknown }>>) {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    calls.push({ sql, params });
    if (sql.includes('FROM "Organization"')) {
      return { rows: Object.keys(rowsByOrg).map((id) => ({ id })) };
    }
    if (sql.includes('FROM "Setting"')) {
      const orgId = params?.[0] as string;
      return {
        rows: (rowsByOrg[orgId] ?? []).map((r) => ({ ...r, organizationId: orgId })),
      };
    }
    return { rows: [] };
  }) as unknown as QueryFn;
  return { query, calls };
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
    });
    expect(calls.some((c) => c.sql.includes('UPDATE'))).toBe(false);
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
    expect(calls.some((c) => c.sql.includes('UPDATE'))).toBe(false);
  });

  it('apply sem snapshotId aborta antes de qualquer query', async () => {
    const { query, calls } = fakeDb(data());
    await expect(
      runIntegrationSettingsBackfill(query, { apply: true, log: () => {} }),
    ).rejects.toThrow(/snapshot/i);
    expect(calls).toHaveLength(0);
  });

  it('apply: UPDATE por linha alvo, com tenant setado e sem bypass ao tocar Setting', async () => {
    const { query, calls } = fakeDb(data());
    const res = await runIntegrationSettingsBackfill(query, { apply: true, snapshotId: 'snap-test', log: () => {} });
    expect(res.written).toBe(2);
    const updates = calls.filter((c) => c.sql.includes('UPDATE "Setting"'));
    expect(updates.map((u) => u.params?.[1])).toEqual(['s1', 's3']);
    for (const u of updates) expect(String(u.params?.[0])).not.toContain(TRELLO_KEY);

    const bypassOff = calls.findIndex((c) => c.sql.includes("'app.bypass_rls', 'off'"));
    const firstSetting = calls.findIndex((c) => c.sql.includes('FROM "Setting"'));
    expect(bypassOff).toBeGreaterThan(-1);
    expect(bypassOff).toBeLessThan(firstSetting);
    expect(calls[firstSetting - 1].sql).toContain('app.current_tenant_id');
  });

  it('apply é idempotente: rodar sobre o resultado não grava nada', async () => {
    const { query, calls } = fakeDb(data());
    await runIntegrationSettingsBackfill(query, { apply: true, snapshotId: 'snap-test', log: () => {} });
    const written = calls
      .filter((c) => c.sql.includes('UPDATE "Setting"'))
      .map((c) => ({ id: c.params?.[1] as string, value: JSON.parse(c.params?.[0] as string) }));
    const after = data();
    after['org-a'][0].value = written.find((w) => w.id === 's1')?.value;
    after['org-b'][0].value = written.find((w) => w.id === 's3')?.value;
    const second = fakeDb(after);
    const res = await runIntegrationSettingsBackfill(second.query, { apply: true, snapshotId: 'snap-test', log: () => {} });
    expect(res.written).toBe(0);
    expect(second.calls.some((c) => c.sql.includes('UPDATE'))).toBe(false);
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

  it('fail-closed: campo que não decifra com OLD_KEY lança', () => {
    const wrong = encryptWithKey(TRELLO_KEY, randomBytes(32));
    expect(() =>
      reencryptIntegrationSettingValue('integration.trello', { apiKey: wrong }, OLD, NEW),
    ).toThrow();
  });
});
